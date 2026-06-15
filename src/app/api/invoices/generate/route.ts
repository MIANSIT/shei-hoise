import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Currency, CURRENCY_NAMES } from "@/lib/types/enums";
import fs from "fs";
import path from "path";

interface Product {
  name: string;
  qty: number;
  price: number;
}

interface Store {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
}

interface Customer {
  name: string;
  address?: string;
  contact?: string;
  email?: string;
}

interface AdditionalCharge {
  label: string;
  amount: number;
}

interface InvoiceRequest {
  store: Store;
  orderId: string;
  customer: Customer;
  products: Product[];
  currency: Currency;
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  discountAmount?: number;
  additionalCharges?: AdditionalCharge[];
  totalDue: number;
  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;
  notes?: string;
  type?: "A4" | "POS";
}

// ==================== BENGALI FONT SUPPORT ====================
let bengaliFontCache: { regular: string | null; bold: string | null } | null =
  null;

function getBengaliFontData(): { regular: string | null; bold: string | null } {
  if (bengaliFontCache !== null) return bengaliFontCache;
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "NotoSansBengali-Regular.ttf");
    const boldPath = path.join(fontsDir, "NotoSansBengali-Bold.ttf");
    bengaliFontCache = {
      regular: fs.existsSync(regularPath)
        ? fs.readFileSync(regularPath).toString("base64")
        : null,
      bold: fs.existsSync(boldPath)
        ? fs.readFileSync(boldPath).toString("base64")
        : null,
    };
  } catch {
    bengaliFontCache = { regular: null, bold: null };
  }
  return bengaliFontCache;
}

function hasBengali(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

function registerBengaliFont(pdf: jsPDF): boolean {
  const fontData = getBengaliFontData();
  if (!fontData.regular) return false;
  try {
    pdf.addFileToVFS("NotoSansBengali-Regular.ttf", fontData.regular);
    pdf.addFont("NotoSansBengali-Regular.ttf", "NotoSansBengali", "normal");

    // Verify registration succeeded (jsPDF fires PubSub errors without throwing)
    const fontList = pdf.getFontList();
    if (!fontList["NotoSansBengali"]) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Sets Bengali font if the text contains Bengali characters, otherwise keeps
 * the current font unchanged. Call pdf.setFont(...) to restore after use.
 */
function useBengaliFont(
  pdf: jsPDF,
  text: string,
  bengaliLoaded: boolean,
): boolean {
  if (bengaliLoaded && hasBengali(text)) {
    pdf.setFont("NotoSansBengali", "normal");
    return true;
  }
  return false;
}

// Helper function to format status text (capitalize properly)
function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const body: InvoiceRequest = await req.json();
    const { type = "A4", ...invoiceData } = body;

    if (type === "POS") {
      return generatePOSPDF(invoiceData);
    } else {
      return generateA4PDF(invoiceData);
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

// ==================== A4 PDF GENERATION ====================
async function generateA4PDF(body: Omit<InvoiceRequest, "type">) {
  const {
    store,
    orderId,
    customer,
    products,
    currency,
    subtotal,
    deliveryCharge,
    taxAmount,
    discountAmount = 0,
    additionalCharges = [],
    totalDue,
    paymentStatus = "Pending",
    paymentMethod = "N/A",
    orderStatus = "Processing",
    notes = "",
  } = body;

  if (!store || !orderId || !customer || !products?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const pageWidth = 210;
  const margin = 15;
  const lineHeight = 5;

  // ==================== CALCULATE DYNAMIC HEIGHT ====================
  let estimatedHeight = margin;

  estimatedHeight += 8;
  const contactLines = [store.address, store.phone, store.email].filter(
    Boolean,
  ).length;
  estimatedHeight += contactLines * lineHeight + 8;

  estimatedHeight += 10;
  const customerLines = [
    customer.name,
    customer.address,
    customer.contact,
    customer.email,
  ].filter(Boolean).length;
  estimatedHeight += customerLines * lineHeight + 8;

  estimatedHeight += 15;
  estimatedHeight += products.length * 8;
  estimatedHeight += 8;

  let summaryLines = 1;
  if (discountAmount > 0) summaryLines++;
  if (deliveryCharge > 0) summaryLines++;
  if (taxAmount > 0) summaryLines++;
  summaryLines += additionalCharges.filter((c) => c.amount !== 0).length;
  estimatedHeight += summaryLines * 5;
  estimatedHeight += 8;

  if (paymentMethod && paymentMethod !== "N/A") estimatedHeight += 8;

  if (notes && notes.length > 0) {
    estimatedHeight += Math.ceil(notes.length / 90) * 5 + 8;
  }

  estimatedHeight += 40;
  estimatedHeight += margin;

  const dynamicHeight = Math.max(Math.ceil(estimatedHeight / 10) * 10, 160);

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidth, dynamicHeight],
    compress: true,
  });

  // Load Bengali font once; use it only for text that actually contains Bengali
  const bengaliLoaded = registerBengaliFont(pdf);

  let y = margin;

  pdf.setFont("helvetica");

  // ==================== HEADER SECTION ====================
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(29, 78, 216);
  useBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(store.name, margin, y);
  pdf.setFont("helvetica", "normal"); // restore

  y += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const contactInfo = [];
  if (store.address) contactInfo.push(`Address:  ${store.address}`);
  if (store.phone) contactInfo.push(`Phone:  ${store.phone}`);
  if (store.email) contactInfo.push(`Email: ${store.email}`);

  contactInfo.forEach((info, index) => {
    pdf.setFont("helvetica", "normal");
    useBengaliFont(pdf, info, bengaliLoaded);
    pdf.text(info, margin, y + index * lineHeight);
  });
  pdf.setFont("helvetica", "normal"); // restore

  y += contactInfo.length * lineHeight + 5;

  // Invoice title (always English — Helvetica bold)
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(29, 78, 216);
  const invoiceTitle = "INVOICE";
  const invoiceTitleWidth = pdf.getTextWidth(invoiceTitle);
  pdf.text(invoiceTitle, pageWidth - margin - invoiceTitleWidth, margin);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  const invoiceDetails = [
    { label: "Invoice #", value: orderId },
    {
      label: "Currency",
      value: CURRENCY_NAMES[currency as Currency] || "Taka",
    },
    { label: "Payment Status", value: formatStatus(paymentStatus) },
    { label: "Order Status", value: formatStatus(orderStatus) },
  ];

  let rightY = margin + 10;
  invoiceDetails.forEach((detail) => {
    const text = `${detail.label}: ${detail.value}`;
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth - margin - textWidth, rightY);
    rightY += 5;
  });

  y = Math.max(y, rightY) + 8;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ==================== CUSTOMER SECTION ====================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Bill To:", margin, y);

  y += 5;
  pdf.setFontSize(10);

  const customerInfo = [
    customer.name,
    customer.address,
    customer.contact ? `Phone: ${customer.contact}` : null,
    customer.email ? `Email: ${customer.email}` : null,
  ].filter(Boolean) as string[];

  customerInfo.forEach((info, index) => {
    pdf.setFont("helvetica", "normal");
    useBengaliFont(pdf, info, bengaliLoaded);
    pdf.text(info, margin, y + index * lineHeight);
  });
  pdf.setFont("helvetica", "normal"); // restore

  y += customerInfo.length * lineHeight + 8;

  // ==================== PRODUCTS TABLE ====================
  // autoTable always uses Helvetica for headers/labels.
  // didParseCell switches to Bengali only for body cells that need it.
  autoTable(pdf, {
    startY: y,
    head: [["Item", "Quantity", "Unit Price", "Total"]],
    body: products.map((p) => [
      p.name,
      p.qty.toString(),
      p.price.toFixed(2),
      (p.qty * p.price).toFixed(2),
    ]),
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: "linebreak",
      lineWidth: 0.1,
      font: "helvetica",
    },
    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      lineWidth: 0.1,
      font: "helvetica",
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    didParseCell: (data) => {
      // Switch to Bengali font only for body cells that contain Bengali text
      if (bengaliLoaded && data.section === "body") {
        const cellText = String(data.cell.raw ?? "");
        if (hasBengali(cellText)) {
          data.cell.styles.font = "NotoSansBengali";
          data.cell.styles.fontStyle = "normal";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (pdf as any).lastAutoTable.finalY + 8;

  // ==================== SUMMARY SECTION ====================
  const summaryData = [
    { label: "Subtotal", value: subtotal },
    { label: "Discount", value: -Math.abs(discountAmount) },
    { label: "Delivery Charge", value: deliveryCharge },
    { label: "Tax", value: taxAmount },
  ];

  const summaryX = pageWidth - margin - 70;
  let summaryY = finalY;

  summaryData.forEach((item) => {
    if (item.value !== 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.label, summaryX, summaryY);
      pdf.text(`${item.value.toFixed(2)}`, pageWidth - margin, summaryY, {
        align: "right",
      });
      summaryY += 5;
    }
  });

  if (additionalCharges.length > 0) {
    additionalCharges.forEach((charge) => {
      if (charge.amount !== 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        // Label might be Bengali
        useBengaliFont(pdf, charge.label, bengaliLoaded);
        pdf.text(charge.label, summaryX, summaryY);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${charge.amount.toFixed(2)}`, pageWidth - margin, summaryY, {
          align: "right",
        });
        summaryY += 5;
      }
    });
  }

  summaryY += 1;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(29, 78, 216);
  pdf.text("GRAND TOTAL", summaryX, summaryY);
  pdf.text(`${totalDue.toFixed(2)}`, pageWidth - margin, summaryY, {
    align: "right",
  });

  pdf.setTextColor(0, 0, 0);
  summaryY += 6;

  // ==================== PAYMENT METHOD ====================
  if (paymentMethod && paymentMethod !== "N/A") {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Method:", margin, summaryY);

    pdf.setFont("helvetica", "normal");
    const methodText =
      paymentMethod === "cod"
        ? "Cash on Delivery"
        : paymentMethod.toUpperCase();
    pdf.text(methodText, margin + 40, summaryY);
    summaryY += 8;
  }

  // ==================== NOTES ====================
  if (notes) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.text("Notes:", margin, summaryY);
    pdf.setFont("helvetica", "normal");
    useBengaliFont(pdf, notes, bengaliLoaded);

    const notesLines = pdf.splitTextToSize(notes, pageWidth - 2 * margin);
    notesLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, summaryY + 5 + index * 5);
    });
    pdf.setFont("helvetica", "normal");
    summaryY += notesLines.length * 5 + 8;
  }

  // ==================== FOOTER ====================
  summaryY += 10;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, summaryY, pageWidth - margin, summaryY);
  summaryY += 8;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Invoice Generated:", margin, summaryY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Date: ${new Date().toLocaleDateString("en-GB")}`,
    margin,
    summaryY + 4,
  );
  pdf.text(
    `Time: ${new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}`,
    margin,
    summaryY + 8,
  );

  summaryY += 20;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, summaryY, pageWidth - margin, summaryY);
  summaryY += 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(128, 128, 128);
  // Store name in footer may be Bengali
  const thankYouPrefix = "Thank you for choosing ";
  useBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(
    `${thankYouPrefix}${store.name}`,
    pageWidth / 2,
    summaryY,
    { align: "center" },
  );
  pdf.setFont("helvetica", "normal");

  // ==================== OUTPUT ====================
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice_${orderId}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// ==================== POS PDF GENERATION ====================
async function generatePOSPDF(body: Omit<InvoiceRequest, "type">) {
  const {
    store,
    orderId,
    customer,
    products,
    subtotal,
    deliveryCharge,
    taxAmount,
    discountAmount = 0,
    additionalCharges = [],
    totalDue,
    paymentStatus = "Pending",
    paymentMethod = "N/A",
    orderStatus = "Processing",
    notes = "",
  } = body;

  if (!store || !orderId || !customer || !products?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const pdf = new jsPDF({
    unit: "mm",
    format: [80, 297],
    compress: true,
  });

  const bengaliLoaded = registerBengaliFont(pdf);

  const pageWidth = 80;
  const margin = 3;
  let y = margin;
  const smallLineHeight = 3.5;

  pdf.setFont("courier", "normal");

  // ==================== STORE HEADER ====================
  pdf.setFontSize(12);
  pdf.setFont("courier", "bold");
  useBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(store.name, pageWidth / 2, y, { align: "center" });
  pdf.setFont("courier", "normal");
  y += 5;

  if (store.address) {
    pdf.setFontSize(8);
    useBengaliFont(pdf, store.address, bengaliLoaded);
    const addressLines = pdf.splitTextToSize(
      store.address,
      pageWidth - 2 * margin,
    );
    addressLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: "center" });
      y += 4;
    });
    pdf.setFont("courier", "normal");
  }

  if (store.phone) {
    pdf.setFont("courier", "normal");
    pdf.setFontSize(8);
    pdf.text(`Tel: ${store.phone}`, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  y += 2;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== INVOICE HEADER ====================
  pdf.setFontSize(10);
  pdf.setFont("courier", "bold");
  pdf.text("INVOICE", pageWidth / 2, y, { align: "center" });
  y += 4;

  pdf.setFontSize(8);
  pdf.setFont("courier", "normal");
  pdf.text(`#${orderId}`, pageWidth / 2, y, { align: "center" });
  y += 3;

  const currentDate = new Date();
  pdf.text(
    `${currentDate.toLocaleDateString("en-GB")} ${currentDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 4;

  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== CUSTOMER INFO ====================
  pdf.setFont("courier", "bold");
  pdf.setFontSize(9);
  pdf.text("CUSTOMER", margin, y);
  y += 4;

  pdf.setFontSize(8);
  const customerName =
    customer.name.length > 30
      ? customer.name.substring(0, 28) + ".."
      : customer.name;
  pdf.setFont("courier", "normal");
  useBengaliFont(pdf, customerName, bengaliLoaded);
  pdf.text(customerName, margin, y);
  pdf.setFont("courier", "normal");
  y += 3.5;

  if (customer.contact) {
    pdf.setFont("courier", "normal");
    pdf.text(`Tel: ${customer.contact}`, margin, y);
    y += 3.5;
  }

  if (customer.address) {
    pdf.setFont("courier", "normal");
    useBengaliFont(pdf, customer.address, bengaliLoaded);
    const addressLines = pdf.splitTextToSize(
      customer.address,
      pageWidth - 2 * margin,
    );
    addressLines.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += 3.5;
    });
    pdf.setFont("courier", "normal");
  }

  y += 1;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== PRODUCTS TABLE ====================
  pdf.setFont("courier", "bold");
  pdf.setFontSize(8);

  const colWidths = { item: 30, qty: 10, price: 12, total: 12 };

  pdf.text("ITEM", margin, y);
  pdf.text("QTY", margin + colWidths.item, y);
  pdf.text("PRICE", margin + colWidths.item + colWidths.qty, y);
  pdf.text("TOTAL", pageWidth - margin - colWidths.total, y, {
    align: "right",
  });

  y += 3;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  pdf.setFont("courier", "normal");
  products.forEach((product) => {
    const qtyText = product.qty.toString();
    const priceText = product.price.toFixed(2);
    const totalText = (product.qty * product.price).toFixed(2);

    const maxChars = Math.floor(colWidths.item / 1.5);
    let itemName = product.name;
    if (itemName.length > maxChars) {
      itemName = itemName.substring(0, maxChars - 3) + "...";
    }

    useBengaliFont(pdf, itemName, bengaliLoaded);
    pdf.text(itemName, margin, y);
    pdf.setFont("courier", "normal");

    const qtyX = margin + colWidths.item + colWidths.qty / 2;
    pdf.text(qtyText, qtyX, y, { align: "center" });

    const priceX = margin + colWidths.item + colWidths.qty + colWidths.price;
    pdf.text(priceText, priceX, y, { align: "right" });

    pdf.text(totalText, pageWidth - margin, y, { align: "right" });

    y += smallLineHeight;
  });

  y += 2;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== SUMMARY ====================
  pdf.setFont("courier", "normal");
  pdf.setFontSize(9);

  const summaryLabelX = margin;
  const summaryValueX = pageWidth - margin;

  if (subtotal !== 0) {
    pdf.text("Subtotal:", summaryLabelX, y);
    pdf.text(`${subtotal.toFixed(2)}`, summaryValueX, y, { align: "right" });
    y += 4;
  }

  if (discountAmount > 0) {
    pdf.text("Discount:", summaryLabelX, y);
    pdf.text(`-${discountAmount.toFixed(2)}`, summaryValueX, y, {
      align: "right",
    });
    y += 4;
  }

  if (deliveryCharge > 0) {
    pdf.text("Delivery:", summaryLabelX, y);
    pdf.text(`${deliveryCharge.toFixed(2)}`, summaryValueX, y, {
      align: "right",
    });
    y += 4;
  }

  if (taxAmount > 0) {
    pdf.text("Tax:", summaryLabelX, y);
    pdf.text(`${taxAmount.toFixed(2)}`, summaryValueX, y, { align: "right" });
    y += 4;
  }

  if (additionalCharges.length > 0) {
    additionalCharges.forEach((charge) => {
      if (charge.amount !== 0) {
        pdf.setFont("courier", "normal");
        useBengaliFont(pdf, charge.label, bengaliLoaded);
        pdf.text(`${charge.label}:`, summaryLabelX, y);
        pdf.setFont("courier", "normal");
        pdf.text(`${charge.amount.toFixed(2)}`, summaryValueX, y, {
          align: "right",
        });
        y += 4;
      }
    });
  }

  pdf.setFont("courier", "bold");
  pdf.setFontSize(10);
  pdf.text("TOTAL:", summaryLabelX, y);
  pdf.text(`${totalDue.toFixed(2)}`, summaryValueX, y, { align: "right" });
  y += 4;

  y += 2;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== PAYMENT INFO ====================
  pdf.setFontSize(9);
  pdf.setFont("courier", "bold");
  const paymentMethodText =
    paymentMethod === "cod" ? "CASH" : paymentMethod.toUpperCase();
  pdf.text(`Payment: ${paymentMethodText}`, pageWidth / 2, y, {
    align: "center",
  });
  y += 3.5;

  pdf.setFont("courier", "normal");
  pdf.text(`Status: ${formatStatus(paymentStatus)}`, pageWidth / 2, y, {
    align: "center",
  });
  y += 3.5;

  pdf.text(`Order: ${formatStatus(orderStatus)}`, pageWidth / 2, y, {
    align: "center",
  });

  // ==================== NOTES ====================
  if (notes) {
    y += 8;
    pdf.setFontSize(8);
    pdf.setFont("courier", "italic");
    pdf.text("Notes:", margin, y);
    y += 3;

    pdf.setFont("courier", "normal");
    useBengaliFont(pdf, notes, bengaliLoaded);
    const notesLines = pdf.splitTextToSize(notes, pageWidth - 2 * margin);
    notesLines.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += 3.5;
    });
    pdf.setFont("courier", "normal");
  }

  // ==================== FOOTER ====================
  y += 8;
  pdf.setFontSize(8);
  pdf.setFont("courier", "normal");
  useBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(`Thank you for choosing ${store.name}`, pageWidth / 2, y, {
    align: "center",
  });
  pdf.setFont("courier", "normal");
  y += 3;
  pdf.text("Please retain this receipt", pageWidth / 2, y, { align: "center" });

  // ==================== OUTPUT ====================
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pos_receipt_${orderId}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// OPTIONS method for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
