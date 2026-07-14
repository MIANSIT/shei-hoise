import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS, drawVendorPdfHeader, drawPanel } from "@/lib/pdf/vendorPdfTheme";

// Original TP and the TP increase % are the store owner's cost/margin —
// deliberately not part of this interface. This invoice is handed directly
// to the vendor, who should only ever see what they pay (vendorTp) and the
// suggested resale ceiling (mrp), never the owner's cost basis or markup.
interface VendorInvoiceItem {
  name: string;
  sku?: string | null;
  qty: number;
  vendorTp: number;
  mrp?: number | null;
}

interface VendorInvoiceStore {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface VendorInvoiceVendor {
  name: string;
  phone?: string | null;
  address?: string | null;
}

interface VendorInvoiceRequest {
  store: VendorInvoiceStore;
  vendor: VendorInvoiceVendor;
  invoiceNumber: string;
  orderDate: string;
  // A draft vendor order hasn't been dispatched yet, so its downloadable
  // PDF is a quotation for the vendor to review, not a final invoice —
  // same layout and data, different title/framing. Defaults to "invoice"
  // so existing callers that don't send this keep working unchanged.
  docType?: "quotation" | "invoice";
  items: VendorInvoiceItem[];
  subtotal: number;
  deliveryCost: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  deliveryDate?: string | null;
  deliveryPerson?: string | null;
  vehicleNumber?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: VendorInvoiceRequest = await req.json();
    if (!body.store || !body.vendor || !body.items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hasMrp = body.items.some((i) => i.mrp !== null && i.mrp !== undefined);
    const isQuotation = body.docType === "quotation";

    const pageWidth = 210;
    const margin = 15;

    let estimatedHeight = margin + 70;
    estimatedHeight += body.items.length * 8 + 20;
    estimatedHeight += 60;
    if (body.notes) estimatedHeight += Math.ceil(body.notes.length / 90) * 5 + 10;
    const dynamicHeight = Math.max(Math.ceil(estimatedHeight / 10) * 10, 220);

    const pdf = new jsPDF({ unit: "mm", format: [pageWidth, dynamicHeight], compress: true });

    const storeInfo = [body.store.address, body.store.phone, body.store.email].filter(
      Boolean,
    ) as string[];

    let y = drawVendorPdfHeader(pdf, {
      storeName: body.store.name,
      storeInfoLines: storeInfo,
      title: isQuotation ? "Quotation" : "Vendor Invoice",
      metaLines: [
        `${isQuotation ? "Quotation Ref" : "Invoice #"}: ${body.invoiceNumber}`,
        `Order Date: ${body.orderDate}`,
      ],
      pageWidth,
      margin,
    });

    const vendorLineCount = (body.vendor.address ? 1 : 0) + (body.vendor.phone ? 1 : 0) + 1;
    const panelHeight = 16 + vendorLineCount * 5;
    drawPanel(pdf, margin, y, pageWidth - margin * 2, panelHeight);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...PDF_COLORS.brand);
    pdf.text(isQuotation ? "QUOTATION FOR" : "BILL TO", margin + 5, y + 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    const vendorInfo = [
      body.vendor.name,
      body.vendor.address,
      body.vendor.phone ? `Phone: ${body.vendor.phone}` : null,
    ].filter(Boolean) as string[];
    vendorInfo.forEach((line, i) => pdf.text(line, margin + 5, y + 12 + i * 5));

    y += panelHeight + 8;
    pdf.setTextColor(0, 0, 0);

    if (isQuotation) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...PDF_COLORS.textMuted);
      pdf.text(
        "This is a price quotation for review — stock has not been dispatched yet.",
        margin,
        y,
      );
      pdf.setTextColor(0, 0, 0);
      y += 6;
    }

    const head = hasMrp
      ? ["Item", "Qty", "Unit Price", "MRP", "Total"]
      : ["Item", "Qty", "Unit Price", "Total"];

    autoTable(pdf, {
      startY: y,
      head: [head],
      body: body.items.map((item) => {
        const row = [
          item.sku ? `${item.name}\n(${item.sku})` : item.name,
          item.qty.toString(),
          item.vendorTp.toFixed(2),
        ];
        if (hasMrp) row.push(item.mrp != null ? item.mrp.toFixed(2) : "—");
        row.push((item.qty * item.vendorTp).toFixed(2));
        return row;
      }),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak", lineWidth: 0 },
      headStyles: { fillColor: PDF_COLORS.brand, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: PDF_COLORS.panelBg },
      margin: { left: margin, right: margin },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (pdf as any).lastAutoTable.finalY + 8;

    const summaryWidth = 80;
    const summaryX = pageWidth - margin - summaryWidth;
    const summaryRows: [string, number][] = [
      ["Subtotal", body.subtotal],
      ["Delivery Cost", body.deliveryCost],
      ["Discount", -Math.abs(body.discountAmount)],
    ].filter(([, value]) => value !== 0) as [string, number][];

    const summaryPanelHeight = summaryRows.length * 6 + 30;
    drawPanel(pdf, summaryX, finalY, summaryWidth, summaryPanelHeight);
    finalY += 6;

    pdf.setFontSize(9.5);
    summaryRows.forEach(([label, value]) => {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...PDF_COLORS.textMuted);
      pdf.text(label, summaryX + 5, finalY);
      pdf.setTextColor(20, 20, 20);
      pdf.text(value.toFixed(2), pageWidth - margin - 5, finalY, { align: "right" });
      finalY += 6;
    });

    pdf.setDrawColor(...PDF_COLORS.border);
    pdf.line(summaryX + 5, finalY - 1, pageWidth - margin - 5, finalY - 1);
    finalY += 5;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...PDF_COLORS.brand);
    pdf.text("GRAND TOTAL", summaryX + 5, finalY);
    pdf.text(body.grandTotal.toFixed(2), pageWidth - margin - 5, finalY, { align: "right" });
    finalY += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...PDF_COLORS.textMuted);
    pdf.text("Paid Amount", summaryX + 5, finalY);
    pdf.setTextColor(...PDF_COLORS.success);
    pdf.text(body.paidAmount.toFixed(2), pageWidth - margin - 5, finalY, { align: "right" });
    finalY += 6;

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...PDF_COLORS.danger);
    pdf.text("Due Amount", summaryX + 5, finalY);
    pdf.text(body.dueAmount.toFixed(2), pageWidth - margin - 5, finalY, { align: "right" });
    finalY += 14;
    pdf.setTextColor(0, 0, 0);

    const extras = [
      body.deliveryDate ? `Delivery Date: ${body.deliveryDate}` : null,
      body.deliveryPerson ? `Delivery Person: ${body.deliveryPerson}` : null,
      body.vehicleNumber ? `Vehicle Number: ${body.vehicleNumber}` : null,
      body.referenceNumber ? `Reference: ${body.referenceNumber}` : null,
    ].filter(Boolean) as string[];

    if (extras.length) {
      pdf.setFontSize(9);
      pdf.setTextColor(...PDF_COLORS.textMuted);
      pdf.setFont("helvetica", "normal");
      extras.forEach((line, i) => pdf.text(line, margin, finalY + i * 5));
      finalY += extras.length * 5 + 4;
    }

    if (body.notes) {
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.text("Notes:", margin, finalY);
      pdf.setFont("helvetica", "normal");
      const notesLines = pdf.splitTextToSize(body.notes, pageWidth - 2 * margin);
      notesLines.forEach((line: string, i: number) => pdf.text(line, margin, finalY + 5 + i * 5));
    }

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vendor_${isQuotation ? "quotation" : "invoice"}_${body.invoiceNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Vendor invoice PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate vendor invoice" }, { status: 500 });
  }
}
