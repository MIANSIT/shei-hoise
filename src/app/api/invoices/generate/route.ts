import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Currency, CURRENCY_NAMES, CURRENCY_ICONS } from "@/lib/types/enums";

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

  // Create PDF
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const lineHeight = 5;
  let y = margin;

  // Set font globally
  pdf.setFont("helvetica");

  // ==================== HEADER SECTION ====================
  // Store Name with Logo (if provided)
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
    { label: "Date", value: new Date().toLocaleDateString("en-GB") },
    {
      label: "Time",
      value: new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      label: "Currency",
      value: CURRENCY_NAMES[currency as Currency] || "Taka",
    },
    { label: "Payment Status", value: paymentStatus },
    { label: "Order Status", value: orderStatus },
  ];

  let rightY = margin + 10;
  invoiceDetails.forEach((detail) => {
    const text = `${detail.label}: ${detail.value}`;
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth - margin - textWidth, rightY);
    rightY += 5;
  });

  // Separator line
  y = Math.max(y, rightY) + 10;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ==================== CUSTOMER SECTION ====================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Bill To:", margin, y);

  y += 6;
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

  y += customerInfo.length * lineHeight + 10;

  // ==================== PRODUCTS TABLE ====================
  const tableColumns = [
    { header: "Item", dataKey: "item", width: 80 },
    { header: "Quantity", dataKey: "qty", width: 25 },
    { header: "Unit Price", dataKey: "price", width: 35 },
    { header: "Total", dataKey: "total", width: 35 },
  ];

  const tableData = products.map((product, index) => ({
    item: product.name,
    qty: product.qty.toString(),
    price: product.price.toFixed(2),
    total: (product.qty * product.price).toFixed(2),
  }));

  // Add summary row
  tableData.push({
    item: "",
    qty: "",
    price: "",
    total: "",
  });

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
  const finalY = (pdf as any).lastAutoTable.finalY + 10;

  // ==================== SUMMARY SECTION ====================
  const CURRENCY_ICON = CURRENCY_ICONS[currency as Currency] || "৳";

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
      summaryY += 6;
    }
  });

  // Grand Total
  summaryY += 2;
  pdf.setFontSize(14);
  pdf.setTextColor(29, 78, 216);
  pdf.text("GRAND TOTAL", summaryX, summaryY);
  pdf.text(`${totalDue.toFixed(2)}`, pageWidth - margin, summaryY, {
    align: "right",
  });

  pdf.setTextColor(0, 0, 0);
  summaryY += 8;

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
    summaryY += 10;
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
    summaryY += notesLines.length * 5 + 10;
  }

  // ==================== FOOTER ====================
  pdf.setFontSize(9);
  pdf.setTextColor(128, 128, 128);

  const footerY = pageWidth > 200 ? 280 : 190; // Adjust based on page size

  pdf.text("Thank you for your business!", pageWidth / 2, footerY, {
    align: "center",
  });

  pdf.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth / 2,
    footerY + 5,
    { align: "center" },
  );

  // ==================== OUTPUT ====================
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  // Return PDF as response
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
// ==================== POS PDF GENERATION ====================
async function generatePOSPDF(body: Omit<InvoiceRequest, "type">) {
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

  // Create PDF with POS size (80mm width)
  const pdf = new jsPDF({
    unit: "mm",
    format: [80, 297], // POS receipt size: 80mm width, long paper
    compress: true,
  });

  const pageWidth = 80;
  const margin = 3;
  let y = margin;
  const lineHeight = 4;
  const smallLineHeight = 3.5;

  // Use monospaced font for better alignment
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

  // Separator line
  pdf.setDrawColor(0, 0, 0);
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

  // Separator line
  y += 1;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== PRODUCTS TABLE ====================
  // Table header
 

  // Products
  // ==================== PRODUCTS TABLE ====================
  // Table header
  pdf.setFont("courier", "bold");
  pdf.setFontSize(8);

  // Define fixed column widths (in mm)
  const colWidths = {
    item: 30, // Item name column width
    qty: 10, // Quantity column width
    price: 12, // Price column width
    total: 12, // Total column width
  };

  // Draw table headers
  pdf.text("ITEM", margin, y);
  pdf.text("QTY", margin + colWidths.item, y);
  pdf.text("PRICE", margin + colWidths.item + colWidths.qty, y);
  pdf.text("TOTAL", pageWidth - margin - colWidths.total, y, {
    align: "right",
  });

  y += 3;

  // Header underline
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Products
  pdf.setFont("courier", "normal");
  products.forEach((product) => {
    // Format values
    const qtyText = product.qty.toString();
    const priceText = product.price.toFixed(2);
    const totalText = (product.qty * product.price).toFixed(2);

    // Split item name to fit in column
    const maxChars = Math.floor(colWidths.item / 1.5); // Approximate chars per mm
    let itemName = product.name;
    if (itemName.length > maxChars) {
      itemName = itemName.substring(0, maxChars - 3) + "...";
    }

    // Draw item name
    pdf.text(itemName, margin, y);

    // Draw quantity (centered in its column)
    const qtyX = margin + colWidths.item + colWidths.qty / 2;
    pdf.text(qtyText, qtyX, y, { align: "center" });

    // Draw price (right aligned in its column)
    const priceX = margin + colWidths.item + colWidths.qty + colWidths.price;
    pdf.text(priceText, priceX, y, { align: "right" });

    // Draw total (right aligned)
    pdf.text(totalText, pageWidth - margin, y, { align: "right" });

    y += smallLineHeight;
  });

  // Separator line after products
  y += 2;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ==================== SUMMARY SECTION ====================
  pdf.setFont("courier", "normal");
  pdf.setFontSize(9);

  const summaryItems = [
    { label: "Subtotal:", value: subtotal, bold: false },
    { label: "Discount:", value: -Math.abs(discountAmount), bold: false },
    { label: "Delivery:", value: deliveryCharge, bold: false },
    { label: "Tax:", value: taxAmount, bold: false },
    { label: "TOTAL:", value: totalDue, bold: true }, // Removed currency symbol
  ];

  // Calculate positions for summary
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

    // Format value WITHOUT currency symbol for POS
    const valueText =
      item.value >= 0
        ? `${item.value.toFixed(2)}`
        : `-${Math.abs(item.value).toFixed(2)}`;

    pdf.text(item.label, summaryLabelX, y);
    pdf.text(valueText, summaryValueX, y, { align: "right" });
    y += 4;
  });

  // Separator line
  y += 2;
  pdf.setDrawColor(0, 0, 0);
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
  pdf.text(`Status: ${paymentStatus}`, pageWidth / 2, y, { align: "center" });
  y += 3.5;

  pdf.text(`Order: ${orderStatus}`, pageWidth / 2, y, { align: "center" });

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
  pdf.text("Thank you for your business!", pageWidth / 2, y, {
    align: "center",
  });
  y += 3;
  pdf.text("Computer generated receipt", pageWidth / 2, y, { align: "center" });
  y += 3;
  pdf.text("No signature required", pageWidth / 2, y, { align: "center" });

  // ==================== OUTPUT ====================
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  // Return PDF as response
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pos_receipt_${orderId}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// Add OPTIONS method for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
