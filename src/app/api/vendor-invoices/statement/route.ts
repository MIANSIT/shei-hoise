import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable, { type CellInput } from "jspdf-autotable";
import dayjs from "dayjs";
import { PDF_COLORS, drawVendorPdfHeader, drawPanel } from "@/lib/pdf/vendorPdfTheme";
import { enableBengaliText } from "@/lib/pdf/bengaliPdfText";
import { loadBengaliFontServer } from "@/lib/pdf/bengaliFontServer";
import type { VendorStatementData } from "@/lib/queries/vendor/getVendorStatement";

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
  statement: VendorStatementData;
}

const money = (n: number): string => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** A plus or minus in front, so the vendor sees what adds to and what comes off the balance. */
const signed = (n: number, sign: "+" | "-"): string => `${sign}${money(Math.abs(n))}`;
const day = (d: string): string => dayjs(d).format("DD-MM-YYYY");
const METHOD_LABEL: Record<string, string> = { cash: "Cash", bkash: "bKash", nagad: "Nagad", bank_transfer: "Bank transfer", mobile_banking: "Mobile banking" };
const methodLabel = (m: string): string => METHOD_LABEL[m] ?? m.replace(/_/g, " ");

export async function POST(req: NextRequest) {
  try {
    const body: VendorStatementRequest = await req.json();
    if (!body.store || !body.vendor || !body.statement) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const data = body.statement;

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // A4, so it prints at real size; a long statement continues on more pages.
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    enableBengaliText(pdf, loadBengaliFontServer());

    const storeInfo = [body.store.address, body.store.phone, body.store.email].filter(Boolean) as string[];

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
    drawPanel(pdf, margin, y, contentWidth, panelHeight);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...PDF_COLORS.brand);
    pdf.text("STATEMENT FOR", margin + 5, y + 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    const vendorInfo = [body.vendor.name, body.vendor.address, body.vendor.phone ? `Phone: ${body.vendor.phone}` : null].filter(Boolean) as string[];
    vendorInfo.forEach((line, i) => pdf.text(line, margin + 5, y + 12 + i * 5));
    y += panelHeight + 8;
    pdf.setTextColor(0, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableEnd = (): number => (pdf as any).lastAutoTable.finalY as number;
    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };
    const sectionTitle = (text: string, note?: string) => {
      ensureSpace(14);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...PDF_COLORS.brand);
      pdf.text(text, margin, y);
      y += 5;
      if (note) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(110, 110, 110);
        pdf.text(note, margin, y);
        y += 4;
      }
      pdf.setTextColor(0, 0, 0);
    };
    const tableStyles = { fontSize: 8, cellPadding: 2.2, overflow: "linebreak" as const, lineWidth: 0 };
    const headStyles = { fillColor: PDF_COLORS.brand, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const };
    const right = { halign: "right" as const };

    // ── A. Invoices ─────────────────────────────────────────────────────────────────────────────────────────────
    sectionTitle("A. Invoices", "What was sent to you. Each invoice shows its products, delivery charge, discount, what is paid and what is left.");
    if (data.invoices.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("No invoices yet.", margin, y + 2);
      y += 8;
    }
    for (const inv of data.invoices) {
      ensureSpace(34);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(20, 20, 20);
      pdf.text(`Invoice ${inv.invoiceNumber}`, margin, y + 3);
      pdf.setFont("helvetica", "normal");
      pdf.text(day(inv.date), pageWidth - margin, y + 3, { align: "right" });
      y += 5;

      const label = (text: string, bold = false): CellInput => ({ content: text, colSpan: 3, styles: { halign: "right", fontStyle: bold ? "bold" : "normal" } });
      const amountCell = (text: string, bold = false): CellInput => ({ content: text, styles: { halign: "right", fontStyle: bold ? "bold" : "normal" } });
      const deliveryStatus =
        inv.delivery <= 0
          ? null
          : inv.deliveryDue <= 0.005
            ? "paid"
            : inv.deliveryPaid > 0
              ? `part paid (${money(inv.deliveryPaid)} of ${money(inv.delivery)})`
              : "not paid";

      const rows: CellInput[][] = inv.items.map((i) => [i.product, { content: String(i.quantity), styles: right }, { content: money(i.rate), styles: right }, { content: money(i.amount), styles: right }]);
      rows.push([label("Goods total"), amountCell(money(inv.goods))]);
      if (inv.discount > 0) rows.push([label("Discount"), amountCell(signed(inv.discount, "-"))]);
      if (inv.delivery > 0) rows.push([label(`Delivery charge${deliveryStatus ? ` (${deliveryStatus})` : ""}`), amountCell(signed(inv.delivery, "+"))]);
      rows.push([label("Invoice total", true), amountCell(money(inv.total), true)]);
      rows.push([label("Paid on this invoice"), amountCell(signed(inv.paid, "-"))]);
      rows.push([label("Left to pay on this invoice", true), amountCell(money(inv.due), true)]);

      autoTable(pdf, {
        startY: y,
        head: [[{ content: "Product", styles: {} }, { content: "Qty", styles: right }, { content: "Rate", styles: right }, { content: "Amount", styles: right }]],
        body: rows,
        theme: "striped",
        styles: tableStyles,
        headStyles,
        alternateRowStyles: { fillColor: PDF_COLORS.panelBg },
        columnStyles: { 0: { cellWidth: contentWidth - 20 - 28 - 32 }, 1: { cellWidth: 20 }, 2: { cellWidth: 28 }, 3: { cellWidth: 32 } },
        margin: { left: margin, right: margin },
      });
      y = tableEnd() + 8;
    }

    // ── B. Returned goods ───────────────────────────────────────────────────────────────────────────────────────
    sectionTitle("B. Goods returned", "Goods you gave back or we took back. The amount comes off your balance.");
    if (data.returns.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("No goods returned.", margin, y + 2);
      y += 8;
    } else {
      autoTable(pdf, {
        startY: y,
        head: [["Date", "Product", "Type", { content: "Qty", styles: right }, { content: "Rate", styles: right }, { content: "Amount", styles: right }]],
        body: data.returns.map((r) => [
          day(r.date),
          r.product,
          r.kind === "after_sale" ? "Returned after sale" : "Returned unsold",
          { content: String(r.quantity), styles: right },
          { content: money(r.rate), styles: right },
          { content: signed(r.amount, "-"), styles: right },
        ]),
        foot: [[{ content: "Total returned", colSpan: 3, styles: { fontStyle: "bold" } }, { content: String(data.returns.reduce((s, r) => s + r.quantity, 0)), styles: { ...right, fontStyle: "bold" } }, "", { content: signed(data.totals.returned, "-"), styles: { ...right, fontStyle: "bold" } }]],
        theme: "striped",
        styles: tableStyles,
        headStyles,
        footStyles: { fillColor: [235, 235, 235], textColor: [20, 20, 20] },
        alternateRowStyles: { fillColor: PDF_COLORS.panelBg },
        margin: { left: margin, right: margin },
      });
      y = tableEnd() + 8;
    }

    // ── C. Payments ─────────────────────────────────────────────────────────────────────────────────────────────
    sectionTitle("C. Payments received", "Every payment, and which invoice it was for. Each amount comes off your balance.");
    if (data.payments.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("No payments yet.", margin, y + 2);
      y += 8;
    } else {
      autoTable(pdf, {
        startY: y,
        head: [["Date", "Method", "For", "Note", { content: "Amount", styles: right }]],
        body: data.payments.map((p) => [day(p.date), methodLabel(p.method), p.appliedTo, p.note ?? "", { content: signed(p.amount, "-"), styles: right }]),
        foot: [[{ content: "Total paid", colSpan: 4, styles: { fontStyle: "bold" } }, { content: signed(data.totals.paid, "-"), styles: { ...right, fontStyle: "bold" } }]],
        theme: "striped",
        styles: tableStyles,
        headStyles,
        footStyles: { fillColor: [235, 235, 235], textColor: [20, 20, 20] },
        alternateRowStyles: { fillColor: PDF_COLORS.panelBg },
        margin: { left: margin, right: margin },
      });
      y = tableEnd() + 8;
    }

    // ── D. Summary ──────────────────────────────────────────────────────────────────────────────────────────────
    sectionTitle("D. Summary");
    const showAdjustment = Math.abs(data.adjustment) >= 0.5;
    const summary: CellInput[][] = [
      ["Total of all invoices (goods + delivery charge)", { content: signed(data.totals.billed, "+"), styles: right }],
      ["Goods returned", { content: signed(data.totals.returned, "-"), styles: right }],
      ["Payments received", { content: signed(data.totals.paid, "-"), styles: right }],
    ];
    if (showAdjustment) {
      summary.push([
        "Adjustment (invoice discounts or price changes, so this statement matches your account)",
        { content: signed(data.adjustment, data.adjustment >= 0 ? "+" : "-"), styles: right },
      ]);
    }
    summary.push([
      { content: "BALANCE DUE", styles: { fontStyle: "bold", fontSize: 10 } },
      { content: money(data.currentDue), styles: { ...right, fontStyle: "bold", fontSize: 10 } },
    ]);
    ensureSpace(14 + summary.length * 8 + 14);
    autoTable(pdf, {
      startY: y,
      body: summary,
      theme: "plain",
      styles: { ...tableStyles, fontSize: 9, cellPadding: 2.6 },
      columnStyles: { 0: { cellWidth: contentWidth - 40 }, 1: { cellWidth: 40 } },
      margin: { left: margin, right: margin },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.row.index === summary.length - 1) {
          hook.cell.styles.fillColor = data.currentDue > 0 ? PDF_COLORS.danger : PDF_COLORS.success;
          hook.cell.styles.textColor = [255, 255, 255];
        }
      },
    });
    y = tableEnd() + 5;

    if (data.totals.deliveryBilled > 0) {
      ensureSpace(8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(60, 60, 60);
      pdf.text(
        `Delivery charges: billed ${money(data.totals.deliveryBilled)}, paid ${money(data.totals.deliveryPaid)}, not yet paid ${money(data.totals.deliveryDue)} (included in the balance above).`,
        margin,
        y + 2,
      );
      pdf.setTextColor(0, 0, 0);
    }

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
