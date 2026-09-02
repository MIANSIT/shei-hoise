import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CURRENCY_NAMES } from "@/lib/types/enums";
import {
  InvoicePdfData,
  InvoicePdfStore,
  applyBengaliFont,
  formatStatus,
  hasBengali,
} from "@/lib/utils/invoicePdfHelpers";

// Shared across all three densities — an order counts as "having an
// advance" only when something's been paid but it doesn't cover the full
// total; a fully-paid or fully-unpaid order shows just the normal total.
function getAdvanceInfo(data: InvoicePdfData) {
  const amountPaid = data.amountPaid ?? 0;
  const hasAdvance = amountPaid > 0 && amountPaid < data.totalDue;
  return { hasAdvance, amountPaid, remainingBalance: Math.max(0, data.totalDue - amountPaid) };
}

// ==================== 1-PER-PAGE: FULL INVOICE ====================
// Draws a complete invoice onto the current page of `pdf`, starting at the
// top margin. Caller is responsible for calling pdf.addPage() beforehand
// for every invoice after the first.
export function drawFullInvoice(
  pdf: jsPDF,
  data: InvoicePdfData,
  store: InvoicePdfStore,
  bengaliLoaded: boolean,
): void {
  const pageWidth = 210;
  const margin = 15;
  const lineHeight = 5;
  let y = margin;

  pdf.setFont("helvetica");

  // ---- Header ----
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(29, 78, 216);
  applyBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(store.name, margin, y);
  pdf.setFont("helvetica", "normal");

  y += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const contactInfo: string[] = [];
  if (store.address) contactInfo.push(`Address:  ${store.address}`);
  if (store.phone) contactInfo.push(`Phone:  ${store.phone}`);
  if (store.email) contactInfo.push(`Email: ${store.email}`);

  contactInfo.forEach((info, index) => {
    pdf.setFont("helvetica", "normal");
    applyBengaliFont(pdf, info, bengaliLoaded);
    pdf.text(info, margin, y + index * lineHeight);
  });
  pdf.setFont("helvetica", "normal");

  y += contactInfo.length * lineHeight + 5;

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
    { label: "Invoice #", value: data.orderId },
    { label: "Currency", value: CURRENCY_NAMES[data.currency] || "Taka" },
    { label: "Payment Status", value: formatStatus(data.paymentStatus ?? "pending") },
    { label: "Order Status", value: formatStatus(data.orderStatus ?? "processing") },
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

  // ---- Customer ----
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Bill To:", margin, y);

  y += 5;
  pdf.setFontSize(10);

  const customerInfo = [
    data.customer.name,
    data.customer.address,
    data.customer.contact ? `Phone: ${data.customer.contact}` : null,
    data.customer.email ? `Email: ${data.customer.email}` : null,
  ].filter(Boolean) as string[];

  customerInfo.forEach((info, index) => {
    pdf.setFont("helvetica", "normal");
    applyBengaliFont(pdf, info, bengaliLoaded);
    pdf.text(info, margin, y + index * lineHeight);
  });
  pdf.setFont("helvetica", "normal");

  y += customerInfo.length * lineHeight + 8;

  // ---- Products table ----
  autoTable(pdf, {
    startY: y,
    head: [["Item", "Quantity", "Unit Price", "Total"]],
    body: data.products.map((p) => [
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
    didParseCell: (cell) => {
      if (bengaliLoaded && cell.section === "body") {
        const cellText = String(cell.cell.raw ?? "");
        if (hasBengali(cellText)) {
          cell.cell.styles.font = "NotoSansBengali";
          cell.cell.styles.fontStyle = "normal";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (pdf as any).lastAutoTable.finalY + 8;

  // ---- Summary ----
  const discountAmount = data.discountAmount ?? 0;
  const additionalCharges = data.additionalCharges ?? [];
  const summaryData = [
    { label: "Subtotal", value: data.subtotal },
    { label: "Discount", value: -Math.abs(discountAmount) },
    { label: "Delivery Charge", value: data.deliveryCharge },
    { label: "Tax", value: data.taxAmount },
  ];

  const summaryX = pageWidth - margin - 70;
  let summaryY = finalY;

  summaryData.forEach((item) => {
    if (item.value !== 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.label, summaryX, summaryY);
      pdf.text(`${item.value.toFixed(2)}`, pageWidth - margin, summaryY, { align: "right" });
      summaryY += 5;
    }
  });

  additionalCharges.forEach((charge) => {
    if (charge.amount !== 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      applyBengaliFont(pdf, charge.label, bengaliLoaded);
      pdf.text(charge.label, summaryX, summaryY);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${charge.amount.toFixed(2)}`, pageWidth - margin, summaryY, { align: "right" });
      summaryY += 5;
    }
  });

  summaryY += 1;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(29, 78, 216);
  pdf.text("GRAND TOTAL", summaryX, summaryY);
  pdf.text(`${data.totalDue.toFixed(2)}`, pageWidth - margin, summaryY, { align: "right" });
  summaryY += 6;

  const { hasAdvance, amountPaid, remainingBalance } = getAdvanceInfo(data);
  if (hasAdvance) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Paid", summaryX, summaryY);
    pdf.text(`${amountPaid.toFixed(2)}`, pageWidth - margin, summaryY, { align: "right" });
    summaryY += 5;

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(220, 38, 38);
    pdf.text("Remaining Balance", summaryX, summaryY);
    pdf.text(`${remainingBalance.toFixed(2)}`, pageWidth - margin, summaryY, { align: "right" });
    summaryY += 6;
  }

  pdf.setTextColor(0, 0, 0);

  // ---- Payment method ----
  if (data.paymentMethod && data.paymentMethod !== "N/A") {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Method:", margin, summaryY);
    pdf.setFont("helvetica", "normal");
    const methodText = data.paymentMethod === "cod" ? "Cash on Delivery" : data.paymentMethod.toUpperCase();
    pdf.text(methodText, margin + 40, summaryY);
    summaryY += 8;
  }

  // ---- Notes ----
  if (data.notes) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.text("Notes:", margin, summaryY);
    pdf.setFont("helvetica", "normal");
    applyBengaliFont(pdf, data.notes, bengaliLoaded);

    const notesLines = pdf.splitTextToSize(data.notes, pageWidth - 2 * margin) as string[];
    notesLines.forEach((line, index) => {
      pdf.text(line, margin, summaryY + 5 + index * 5);
    });
    pdf.setFont("helvetica", "normal");
    summaryY += notesLines.length * 5 + 8;
  }

  // ---- Footer ----
  const orderDate = data.orderCreatedAt ? new Date(data.orderCreatedAt) : new Date();
  const orderDateStr = orderDate.toLocaleDateString("en-GB");
  const orderTimeStr = orderDate.toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit" });

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
  pdf.text(`Date: ${orderDateStr}`, margin, summaryY + 4);
  pdf.text(`Time: ${orderTimeStr}`, margin, summaryY + 8);

  summaryY += 20;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, summaryY, pageWidth - margin, summaryY);
  summaryY += 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(128, 128, 128);
  applyBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(`Thank you for choosing ${store.name}`, pageWidth / 2, summaryY, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
}

// ==================== 3-PER-PAGE: COMPACT INVOICE STRIP ====================
// Draws a compact invoice into a horizontal band [bandTopY, bandTopY + bandHeight)
// spanning the page width. Item list is capped so content always fits.
export function drawCompactInvoice(
  pdf: jsPDF,
  data: InvoicePdfData,
  store: InvoicePdfStore,
  bandTopY: number,
  bandHeight: number,
  bengaliLoaded: boolean,
): void {
  const pageWidth = 210;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  let y = bandTopY + 6;

  // Store + invoice number row
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(29, 78, 216);
  applyBengaliFont(pdf, store.name, bengaliLoaded);
  pdf.text(store.name, margin, y);
  pdf.setFont("helvetica", "normal");

  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const invoiceLabel = `Invoice #${data.orderId}`;
  pdf.text(invoiceLabel, pageWidth - margin - pdf.getTextWidth(invoiceLabel), y);
  y += 5;

  // Date + status row
  const orderDate = data.orderCreatedAt ? new Date(data.orderCreatedAt) : new Date();
  pdf.setFontSize(8.5);
  pdf.setTextColor(90, 90, 90);
  const metaLine = `${orderDate.toLocaleDateString("en-GB")}  •  ${formatStatus(data.orderStatus ?? "processing")}  •  ${formatStatus(data.paymentStatus ?? "pending")}`;
  pdf.text(metaLine, margin, y);
  y += 5;

  // Customer row
  pdf.setFontSize(9.5);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  const customerLine = `${data.customer.name}${data.customer.contact ? "  •  " + data.customer.contact : ""}`;
  applyBengaliFont(pdf, customerLine, bengaliLoaded);
  pdf.text(customerLine, margin, y);
  pdf.setFont("helvetica", "normal");
  y += 4.5;

  if (data.customer.address) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(90, 90, 90);
    applyBengaliFont(pdf, data.customer.address, bengaliLoaded);
    const addressLines = pdf.splitTextToSize(data.customer.address, contentWidth) as string[];
    pdf.text(addressLines[0], margin, y);
    y += 4.5;
  }

  pdf.setDrawColor(210, 210, 210);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Items — capped so this never overflows the band
  const maxItemLines = 5;
  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);
  data.products.slice(0, maxItemLines).forEach((p) => {
    const lineTotal = (p.qty * p.price).toFixed(2);
    applyBengaliFont(pdf, p.name, bengaliLoaded);
    const nameMax = pdf.splitTextToSize(p.name, contentWidth - 55)[0] as string;
    pdf.text(nameMax, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`x${p.qty}`, pageWidth - margin - 25, y, { align: "right" });
    pdf.text(lineTotal, pageWidth - margin, y, { align: "right" });
    y += 4;
  });
  if (data.products.length > maxItemLines) {
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(120, 120, 120);
    pdf.text(`+${data.products.length - maxItemLines} more item(s)`, margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    y += 4;
  }

  pdf.setDrawColor(210, 210, 210);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4.5;

  // Totals
  const { hasAdvance, amountPaid, remainingBalance } = getAdvanceInfo(data);
  pdf.setFontSize(9);
  pdf.text("Subtotal", margin, y);
  pdf.text(data.subtotal.toFixed(2), pageWidth - margin, y, { align: "right" });
  y += 4.2;

  if ((data.discountAmount ?? 0) > 0) {
    pdf.setTextColor(22, 163, 74);
    pdf.text("Discount", margin, y);
    pdf.text(`-${(data.discountAmount ?? 0).toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    pdf.setTextColor(0, 0, 0);
    y += 4.2;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(29, 78, 216);
  pdf.text("GRAND TOTAL", margin, y);
  pdf.text(data.totalDue.toFixed(2), pageWidth - margin, y, { align: "right" });
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  y += 4.5;

  if (hasAdvance) {
    pdf.setFontSize(8.5);
    pdf.text(`Paid: ${amountPaid.toFixed(2)}`, margin, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(220, 38, 38);
    const remainingText = `Remaining: ${remainingBalance.toFixed(2)}`;
    pdf.text(remainingText, pageWidth - margin - pdf.getTextWidth(remainingText), y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
  }
}

// ==================== 10-PER-PAGE: MINI SLIP ====================
// Draws a bordered mini slip into the cell [cellX, cellY, cellW, cellH].
export function drawMiniSlip(
  pdf: jsPDF,
  data: InvoicePdfData,
  store: InvoicePdfStore,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  bengaliLoaded: boolean,
): void {
  const pad = 4;
  const contentWidth = cellW - pad * 2;
  let y = cellY + pad + 3;

  pdf.setDrawColor(200, 200, 200);
  pdf.rect(cellX, cellY, cellW, cellH);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(29, 78, 216);
  applyBengaliFont(pdf, store.name, bengaliLoaded);
  const storeNameLine = pdf.splitTextToSize(store.name, contentWidth)[0] as string;
  pdf.text(storeNameLine, cellX + pad, y);
  pdf.setFont("helvetica", "normal");
  y += 4.5;

  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`#${data.orderId}`, cellX + pad, y);
  const orderDate = data.orderCreatedAt ? new Date(data.orderCreatedAt) : new Date();
  const dateText = orderDate.toLocaleDateString("en-GB");
  pdf.text(dateText, cellX + cellW - pad - pdf.getTextWidth(dateText), y);
  y += 4.5;

  pdf.setDrawColor(225, 225, 225);
  pdf.line(cellX + pad, y - 2.5, cellX + cellW - pad, y - 2.5);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  applyBengaliFont(pdf, data.customer.name, bengaliLoaded);
  const nameLine = pdf.splitTextToSize(data.customer.name, contentWidth)[0] as string;
  pdf.text(nameLine, cellX + pad, y);
  pdf.setFont("helvetica", "normal");
  y += 4;

  if (data.customer.contact) {
    pdf.setFontSize(7.5);
    pdf.setTextColor(90, 90, 90);
    pdf.text(data.customer.contact, cellX + pad, y);
    pdf.setTextColor(0, 0, 0);
    y += 3.8;
  }

  if (data.customer.address) {
    pdf.setFontSize(7);
    pdf.setTextColor(90, 90, 90);
    applyBengaliFont(pdf, data.customer.address, bengaliLoaded);
    const addressLine = pdf.splitTextToSize(data.customer.address, contentWidth)[0] as string;
    pdf.text(addressLine, cellX + pad, y);
    pdf.setTextColor(0, 0, 0);
    y += 3.8;
  }

  pdf.setDrawColor(225, 225, 225);
  pdf.line(cellX + pad, y - 1.5, cellX + cellW - pad, y - 1.5);

  // Items — capped so a slip never overflows its cell.
  const maxItemLines = 2;
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  data.products.slice(0, maxItemLines).forEach((p) => {
    applyBengaliFont(pdf, p.name, bengaliLoaded);
    const nameMax = pdf.splitTextToSize(p.name, contentWidth - 20)[0] as string;
    pdf.text(nameMax, cellX + pad, y);
    pdf.setFont("helvetica", "normal");
    const qtyText = `x${p.qty}`;
    pdf.text(qtyText, cellX + cellW - pad - pdf.getTextWidth(qtyText), y);
    y += 3.4;
  });
  if (data.products.length > maxItemLines) {
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(120, 120, 120);
    pdf.text(`+${data.products.length - maxItemLines} more item(s)`, cellX + pad, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    y += 3.4;
  }
  y += 1.5;

  const { hasAdvance, remainingBalance } = getAdvanceInfo(data);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(29, 78, 216);
  pdf.text(`Total: ${data.totalDue.toFixed(2)}`, cellX + pad, y);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  pdf.setFontSize(7);
  pdf.setTextColor(90, 90, 90);
  pdf.text(formatStatus(data.paymentStatus ?? "pending"), cellX + cellW - pad - pdf.getTextWidth(formatStatus(data.paymentStatus ?? "pending")), y);
  pdf.setTextColor(0, 0, 0);

  if (hasAdvance) {
    y += 4;
    pdf.setFontSize(7.5);
    pdf.setTextColor(220, 38, 38);
    pdf.text(`Due: ${remainingBalance.toFixed(2)}`, cellX + pad, y);
    pdf.setTextColor(0, 0, 0);
  }
}
