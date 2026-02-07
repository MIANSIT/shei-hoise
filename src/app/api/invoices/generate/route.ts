import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Currency, CURRENCY_NAMES } from "@/lib/types/enums";

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
  totalDue: number;
  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;
  notes?: string;
  type?: "A4" | "POS";
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
    totalDue,
    paymentStatus = "Pending",
    paymentMethod = "N/A",
    orderStatus = "Processing",
    notes = "",
  } = body;

  // Validation
  if (!store || !orderId || !customer || !products?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const pageWidth = 210; // A4 width in mm (standard)
  const margin = 15;
  const lineHeight = 5;

  // ==================== CALCULATE DYNAMIC HEIGHT ====================
  let estimatedHeight = margin; // Top margin

  // Header section
  estimatedHeight += 8; // Store name
  const contactLines = [store.address, store.phone, store.email].filter(
    Boolean,
  ).length;
  estimatedHeight += contactLines * lineHeight + 8; // Contact info + spacing

  // Customer section
  estimatedHeight += 10; // Separator + "Bill To:"
  const customerLines = [
    customer.name,
    customer.address,
    customer.contact,
    customer.email,
  ].filter(Boolean).length;
  estimatedHeight += customerLines * lineHeight + 8;

  // Products table (approximate)
  estimatedHeight += 15; // Table header
  estimatedHeight += products.length * 8; // 8mm per product row
  estimatedHeight += 8; // Table bottom margin

  // Summary section
  let summaryLines = 1; // Subtotal
  if (discountAmount > 0) summaryLines++;
  if (deliveryCharge > 0) summaryLines++;
  if (taxAmount > 0) summaryLines++;
  estimatedHeight += summaryLines * 5; // Each summary line
  estimatedHeight += 8; // Grand total with spacing

  // Payment method
  if (paymentMethod && paymentMethod !== "N/A") {
    estimatedHeight += 8;
  }

  // Notes (if present)
  if (notes && notes.length > 0) {
    const estimatedNoteLines = Math.ceil(notes.length / 90);
    estimatedHeight += estimatedNoteLines * 5 + 8;
  }

  // Footer
  estimatedHeight += 40; // Date/time + separator + thank you
  estimatedHeight += margin; // Bottom margin

  // Round up to nearest 10mm and ensure minimum height
  const dynamicHeight = Math.max(Math.ceil(estimatedHeight / 10) * 10, 160);

  // Create PDF with custom size
  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidth, dynamicHeight],
    compress: true,
  });

  let y = margin;

  // Set font globally
  pdf.setFont("helvetica");

  // ==================== HEADER SECTION ====================
  // Store Name
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(29, 78, 216); // Blue-600
  pdf.text(store.name, margin, y);

  // Store contact info
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  const contactInfo = [];
  if (store.address) contactInfo.push(`Address:  ${store.address}`);
  if (store.phone) contactInfo.push(`Phone:  ${store.phone}`);
  if (store.email) contactInfo.push(`Email: ${store.email}`);

  contactInfo.forEach((info, index) => {
    pdf.text(info, margin, y + index * lineHeight);
  });

  y += contactInfo.length * lineHeight + 5;

  // Invoice title and details (right aligned)
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

  // Separator line
  y = Math.max(y, rightY) + 8;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ==================== CUSTOMER SECTION ====================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Bill To:", margin, y);

  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const customerInfo = [
    customer.name,
    customer.address,
    customer.contact ? `Phone: ${customer.contact}` : null,
    customer.email ? `Email: ${customer.email}` : null,
  ].filter(Boolean);

  customerInfo.forEach((info, index) => {
    if (info) {
      pdf.text(info, margin, y + index * lineHeight);
    }
  });

  y += customerInfo.length * lineHeight + 8;

  // ==================== PRODUCTS TABLE ====================
  const tableColumns = [
    { header: "Item", dataKey: "item", width: 80 },
    { header: "Quantity", dataKey: "qty", width: 25 },
    { header: "Unit Price", dataKey: "price", width: 35 },
    { header: "Total", dataKey: "total", width: 35 },
  ];

  const tableData = products.map((product) => ({
    item: product.name,
    qty: product.qty.toString(),
    price: product.price.toFixed(2),
    total: (product.qty * product.price).toFixed(2),
  }));

  autoTable(pdf, {
    startY: y,
    head: [tableColumns.map((col) => col.header)],
    body: tableData.map((row) => [row.item, row.qty, row.price, row.total]),
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: "linebreak",
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 80 }, // Item
      1: { cellWidth: 25, halign: "center" }, // Qty
      2: { cellWidth: 35, halign: "right" }, // Price
      3: { cellWidth: 35, halign: "right" }, // Total
    },
    margin: { left: margin, right: margin },
  });

  // Get Y position after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (pdf as any).lastAutoTable.finalY + 8;

  // ==================== SUMMARY SECTION ====================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);

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
      pdf.text(item.label, summaryX, summaryY);
      pdf.text(`${item.value.toFixed(2)}`, pageWidth - margin, summaryY, {
        align: "right",
      });
      summaryY += 5;
    }
  });

  // Grand Total
  summaryY += 1;
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

    const notesLines = pdf.splitTextToSize(notes, pageWidth - 2 * margin);
    notesLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, summaryY + 5 + index * 5);
    });
    summaryY += notesLines.length * 5 + 8;
  }

  // ==================== FOOTER (DYNAMIC POSITION) ====================
  // Add some spacing before footer
  summaryY += 10;

  // Draw separator line
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, summaryY, pageWidth - margin, summaryY);
  summaryY += 8;

  // Date & Time - Bottom Left
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

  // Thank you message - Center (below date/time)
  summaryY += 20;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, summaryY, pageWidth - margin, summaryY);
  summaryY += 6;

  pdf.setFontSize(9);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Thank you for choosing ${store.name}`, pageWidth / 2, summaryY, {
    align: "center",
  });

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
    totalDue,
    paymentStatus = "Pending",
    paymentMethod = "N/A",
    orderStatus = "Processing",
    notes = "",
  } = body;

  // Validation
  if (!store || !orderId || !customer || !products?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Create PDF with POS size (80mm width) - thermal printer standard
  const pdf = new jsPDF({
    unit: "mm",
    format: [80, 297], // 80mm width for POS thermal printers
    compress: true,
  });

  const pageWidth = 80;
  const margin = 3;
  let y = margin;
  const smallLineHeight = 3.5;

  // Use monospaced font
  pdf.setFont("courier", "normal");

  // ==================== STORE HEADER ====================
  pdf.setFontSize(12);
  pdf.setFont("courier", "bold");
  pdf.text(store.name, pageWidth / 2, y, { align: "center" });
  y += 5;

  if (store.address) {
    pdf.setFontSize(8);
    pdf.setFont("courier", "normal");
    const addressLines = pdf.splitTextToSize(
      store.address,
      pageWidth - 2 * margin,
    );
    addressLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, y, { align: "center" });
      y += 4;
    });
  }

  if (store.phone) {
    pdf.text(`Tel: ${store.phone}`, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  // Separator line
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
    `${currentDate.toLocaleDateString("en-GB")} ${currentDate.toLocaleTimeString(
      "en-US",
      {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 4;

  // Separator
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== CUSTOMER INFO ====================
  pdf.setFont("courier", "bold");
  pdf.setFontSize(9);
  pdf.text("CUSTOMER", margin, y);
  y += 4;

  pdf.setFont("courier", "normal");
  pdf.setFontSize(8);
  const customerName =
    customer.name.length > 30
      ? customer.name.substring(0, 28) + ".."
      : customer.name;
  pdf.text(customerName, margin, y);
  y += 3.5;

  if (customer.contact) {
    pdf.text(`Tel: ${customer.contact}`, margin, y);
    y += 3.5;
  }

  if (customer.address) {
    const addressLines = pdf.splitTextToSize(
      customer.address,
      pageWidth - 2 * margin,
    );
    addressLines.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += 3.5;
    });
  }

  // Separator
  y += 1;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== PRODUCTS TABLE ====================
  pdf.setFont("courier", "bold");
  pdf.setFontSize(8);

  const colWidths = {
    item: 30,
    qty: 10,
    price: 12,
    total: 12,
  };

  pdf.text("ITEM", margin, y);
  pdf.text("QTY", margin + colWidths.item, y);
  pdf.text("PRICE", margin + colWidths.item + colWidths.qty, y);
  pdf.text("TOTAL", pageWidth - margin - colWidths.total, y, {
    align: "right",
  });

  y += 3;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Products
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

    pdf.text(itemName, margin, y);

    const qtyX = margin + colWidths.item + colWidths.qty / 2;
    pdf.text(qtyText, qtyX, y, { align: "center" });

    const priceX = margin + colWidths.item + colWidths.qty + colWidths.price;
    pdf.text(priceText, priceX, y, { align: "right" });

    pdf.text(totalText, pageWidth - margin, y, { align: "right" });

    y += smallLineHeight;
  });

  // Separator
  y += 2;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== SUMMARY ====================
  pdf.setFont("courier", "normal");
  pdf.setFontSize(9);

  const summaryItems = [
    { label: "Subtotal:", value: subtotal, bold: false },
    { label: "Discount:", value: -Math.abs(discountAmount), bold: false },
    { label: "Delivery:", value: deliveryCharge, bold: false },
    { label: "Tax:", value: taxAmount, bold: false },
    { label: "TOTAL:", value: totalDue, bold: true },
  ];

  const summaryLabelX = margin;
  const summaryValueX = pageWidth - margin;

  summaryItems.forEach((item) => {
    if (item.value === 0 && !item.bold) return;

    if (item.bold) {
      pdf.setFont("courier", "bold");
      pdf.setFontSize(10);
    } else {
      pdf.setFont("courier", "normal");
      pdf.setFontSize(9);
    }

    const valueText =
      item.value >= 0
        ? `${item.value.toFixed(2)}`
        : `-${Math.abs(item.value).toFixed(2)}`;

    pdf.text(item.label, summaryLabelX, y);
    pdf.text(valueText, summaryValueX, y, { align: "right" });
    y += 4;
  });

  // Separator
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
    const notesLines = pdf.splitTextToSize(notes, pageWidth - 2 * margin);
    notesLines.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += 3.5;
    });
  }

  // ==================== FOOTER ====================
  y += 8;
  pdf.setFontSize(8);
  pdf.setFont("courier", "normal");
  pdf.text(`Thank you for choosing ${store.name}`, pageWidth / 2, y, {
    align: "center",
  });
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
