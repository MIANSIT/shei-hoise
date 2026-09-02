import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { InvoicePdfData, InvoicePdfStore, registerBengaliFont } from "@/lib/utils/invoicePdfHelpers";
import { drawFullInvoice, drawCompactInvoice, drawMiniSlip } from "@/lib/utils/invoicePdfLayouts";

type BulkLayout = "1up" | "3up" | "10up";

interface BulkInvoiceRequest {
  store: InvoicePdfStore;
  layout: BulkLayout;
  invoices: InvoicePdfData[];
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MAX_INVOICES = 500;

export async function POST(req: NextRequest) {
  try {
    const body: BulkInvoiceRequest = await req.json();
    const { store, layout, invoices } = body;

    if (!store?.name || !layout || !invoices?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["1up", "3up", "10up"].includes(layout)) {
      return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
    }
    if (invoices.length > MAX_INVOICES) {
      return NextResponse.json(
        { error: `Too many orders selected (max ${MAX_INVOICES} per download)` },
        { status: 400 },
      );
    }

    const pdf = new jsPDF({ unit: "mm", format: [PAGE_WIDTH, PAGE_HEIGHT], compress: true });
    const bengaliLoaded = registerBengaliFont(pdf);
    pdf.setFont("helvetica");

    if (layout === "1up") {
      invoices.forEach((data, i) => {
        if (i > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        drawFullInvoice(pdf, data, store, bengaliLoaded);
      });
    } else if (layout === "3up") {
      const margin = 8;
      const perPage = 3;
      const bandHeight = (PAGE_HEIGHT - margin * 2) / perPage;

      invoices.forEach((data, i) => {
        const posInPage = i % perPage;
        if (i > 0 && posInPage === 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        const bandTopY = margin + posInPage * bandHeight;
        drawCompactInvoice(pdf, data, store, bandTopY, bandHeight, bengaliLoaded);

        if (posInPage < perPage - 1) {
          pdf.setDrawColor(180, 180, 180);
          pdf.setLineDashPattern([2, 1.5], 0);
          pdf.line(margin, bandTopY + bandHeight, PAGE_WIDTH - margin, bandTopY + bandHeight);
          pdf.setLineDashPattern([], 0);
        }
      });
    } else {
      const margin = 8;
      const cols = 2;
      const rows = 5;
      const perPage = cols * rows;
      const cellW = (PAGE_WIDTH - margin * 2) / cols;
      const cellH = (PAGE_HEIGHT - margin * 2) / rows;

      invoices.forEach((data, i) => {
        const posInPage = i % perPage;
        if (i > 0 && posInPage === 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);
        const cellX = margin + col * cellW;
        const cellY = margin + row * cellH;
        drawMiniSlip(pdf, data, store, cellX, cellY, cellW, cellH, bengaliLoaded);
      });
    }

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoices_${invoices.length}_${layout}_${stamp}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Bulk PDF Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Failed to generate bulk PDF",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
