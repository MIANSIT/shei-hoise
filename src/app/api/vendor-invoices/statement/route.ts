import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS, drawVendorPdfHeader, drawPanel } from "@/lib/pdf/vendorPdfTheme";

interface VendorStatementEntry {
  date: string;
  type: "dispatch" | "settlement" | "payment";
  reference: string;
  description: string;
  receivable?: number;
  paid?: number;
}

interface VendorStatementStore {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface VendorStatementVendor {
  name: string;
  phone?: string | null;
  address?: string | null;
}

interface VendorStatementRequest {
  store: VendorStatementStore;
  vendor: VendorStatementVendor;
  generatedDate: string;
  // Oldest first — the PDF accumulates a running balance top-to-bottom that
  // should land on currentDue by the last row.
  entries: VendorStatementEntry[];
  currentDue: number;
}

const TYPE_LABEL: Record<VendorStatementEntry["type"], string> = {
  dispatch: "Dispatch",
  settlement: "Settlement",
  payment: "Payment",
};

export async function POST(req: NextRequest) {
  try {
    const body: VendorStatementRequest = await req.json();
    if (!body.store || !body.vendor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pageWidth = 210;
    const margin = 15;

    const estimatedHeight = margin + 70 + body.entries.length * 8 + 40;
    const dynamicHeight = Math.max(Math.ceil(estimatedHeight / 10) * 10, 220);

    const pdf = new jsPDF({ unit: "mm", format: [pageWidth, dynamicHeight], compress: true });

    const storeInfo = [body.store.address, body.store.phone, body.store.email].filter(
      Boolean,
    ) as string[];

    let y = drawVendorPdfHeader(pdf, {
      storeName: body.store.name,
      storeInfoLines: storeInfo,
      title: "Statement of Account",
      metaLines: [`Generated: ${body.generatedDate}`],
      pageWidth,
      margin,
    });

    const vendorLineCount = (body.vendor.address ? 1 : 0) + (body.vendor.phone ? 1 : 0) + 1;
    const panelHeight = 16 + vendorLineCount * 5;
    drawPanel(pdf, margin, y, pageWidth - margin * 2, panelHeight);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...PDF_COLORS.brand);
    pdf.text("STATEMENT FOR", margin + 5, y + 6);

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

    let runningBalance = 0;
    const rows = body.entries.map((entry) => {
      runningBalance += (entry.receivable ?? 0) - (entry.paid ?? 0);
      return [
        entry.date,
        TYPE_LABEL[entry.type],
        entry.reference,
        entry.description,
        entry.receivable ? entry.receivable.toFixed(2) : "—",
        entry.paid ? entry.paid.toFixed(2) : "—",
        runningBalance.toFixed(2),
      ];
    });

    autoTable(pdf, {
      startY: y,
      head: [["Date", "Type", "Ref", "Description", "Receivable", "Paid", "Balance"]],
      body: rows,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak", lineWidth: 0 },
      headStyles: { fillColor: PDF_COLORS.brand, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: PDF_COLORS.panelBg },
      margin: { left: margin, right: margin },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (pdf as any).lastAutoTable.finalY + 10;

    const boxWidth = 80;
    const boxX = pageWidth - margin - boxWidth;
    const dueColor = body.currentDue > 0 ? PDF_COLORS.danger : PDF_COLORS.success;
    pdf.setFillColor(...dueColor);
    pdf.roundedRect(boxX, finalY, boxWidth, 16, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text("CURRENT DUE", boxX + 5, finalY + 10);
    const dueValue = body.currentDue.toFixed(2);
    pdf.text(dueValue, boxX + boxWidth - 5, finalY + 10, { align: "right" });
    pdf.setTextColor(0, 0, 0);

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vendor_statement_${body.vendor.name.replace(/\s+/g, "_")}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Vendor statement PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate vendor statement" }, { status: 500 });
  }
}
