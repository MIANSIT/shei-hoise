"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  FileText,
  Loader2,
  X,
  Copy,
  Check,
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  Hash,
  Calendar,
  Clock,
  CreditCard,
  Package,
  StickyNote,
} from "lucide-react";
import {
  Currency,
  CURRENCY_ICONS,
  PaymentStatus,
  OrderStatus,
} from "@/lib/types/enums";
import { App } from "antd";

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  REFUNDED: "Refunded",
  FAILED: "Failed",
  PROCESSING: "Processing",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  ON_HOLD: "On Hold",
};

const formatStatus = (status: string): string => {
  if (!status) return "N/A";
  const upper = status.toUpperCase();
  if (STATUS_MAP[upper]) return STATUS_MAP[upper];
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const PAYMENT_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  PAID: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  PENDING: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  FAILED: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  REFUNDED: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
};

const ORDER_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  DELIVERED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CONFIRMED: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  SHIPPED: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  PENDING: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  CANCELLED: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  PROCESSING: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
};

const getStatusStyle = (
  status: string,
  map: Record<string, { bg: string; text: string; dot: string }>,
) => {
  return (
    map[status?.toUpperCase()] ?? {
      bg: "bg-gray-50 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-400",
    }
  );
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({
  status,
  map,
}: {
  status: string;
  map: Record<string, { bg: string; text: string; dot: string }>;
}) => {
  const style = getStatusStyle(status, map);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {formatStatus(status)}
    </span>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  name: string;
  qty: number;
  price: number;
}

interface Customer {
  name: string;
  address?: string;
  contact?: string;
  email?: string;
}

interface Store {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
}

interface AdditionalCharge {
  label: string;
  amount: number;
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
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
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  orderStatus?: OrderStatus;
  notes?: string;
  showPrintButton?: boolean;
  showPOSButton?: boolean;
  showPDFButton?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InvoiceModal(props: InvoiceModalProps) {
  const {
    open,
    onClose,
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
    paymentStatus = "PENDING",
    paymentMethod = "N/A",
    orderStatus = "PROCESSING",
    notes = "",
    showPrintButton = true,
    showPOSButton = true,
    showPDFButton = true,
  } = props;

  const { notification } = App.useApp();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPOSPrinting, setIsPOSPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const currencyIcon = CURRENCY_ICONS[currency] || "৳";
  const invoiceDate = new Date().toLocaleDateString("en-GB");
  const invoiceTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedPaymentStatus = formatStatus(paymentStatus);
  const formattedOrderStatus = formatStatus(orderStatus);

  // Reset copied
  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const copyInvoiceId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
  };

  // ─── Build shared HTML for printing ────────────────────────────────────────
  const buildPrintHTML = () => {
    const additionalChargesHTML =
      additionalCharges.length > 0
        ? additionalCharges
            .map(
              (charge) => `
          <div class="summary-row">
            <span>${charge.label}:</span>
            <span>${currencyIcon}${charge.amount.toFixed(2)}</span>
          </div>`,
            )
            .join("")
        : "";

    return `
      <div class="invoice-container">
        <div class="invoice-header">
          <div class="store-info">
            <h1>${store.name}</h1>
            ${store.address ? `<p>📍 ${store.address}</p>` : ""}
            ${store.phone ? `<p>📞 ${store.phone}</p>` : ""}
            ${store.email ? `<p>✉️ ${store.email}</p>` : ""}
          </div>
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> ${orderId}</p>
            <p><strong>Payment:</strong> ${formattedPaymentStatus}</p>
            <p><strong>Order:</strong> ${formattedOrderStatus}</p>
          </div>
        </div>

        <div class="customer-section">
          <h3>Bill To:</h3>
          <div class="customer-grid">
            <div>
              <p><strong>${customer.name}</strong></p>
              ${customer.address ? `<p>${customer.address}</p>` : ""}
            </div>
            <div>
              ${customer.contact ? `<p>📞 ${customer.contact}</p>` : ""}
              ${customer.email ? `<p>✉️ ${customer.email}</p>` : ""}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:45%">Item</th>
              <th style="text-align:center;width:15%">Qty</th>
              <th style="text-align:right;width:20%">Price</th>
              <th style="text-align:right;width:20%">Total</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (p) => `
              <tr>
                <td>${p.name}</td>
                <td style="text-align:center">${p.qty}</td>
                <td style="text-align:right">${currencyIcon}${p.price.toFixed(2)}</td>
                <td style="text-align:right"><strong>${currencyIcon}${(p.qty * p.price).toFixed(2)}</strong></td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${currencyIcon}${subtotal.toFixed(2)}</span>
          </div>
          ${
            discountAmount > 0
              ? `<div class="summary-row discount">
            <span>Discount:</span>
            <span>-${currencyIcon}${discountAmount.toFixed(2)}</span>
          </div>`
              : ""
          }
          ${
            deliveryCharge > 0
              ? `<div class="summary-row">
            <span>Delivery:</span>
            <span>${currencyIcon}${deliveryCharge.toFixed(2)}</span>
          </div>`
              : ""
          }
          ${
            taxAmount > 0
              ? `<div class="summary-row">
            <span>Tax:</span>
            <span>${currencyIcon}${taxAmount.toFixed(2)}</span>
          </div>`
              : ""
          }
          ${additionalChargesHTML}
          <div class="summary-row total">
            <span>GRAND TOTAL:</span>
            <span>${currencyIcon}${totalDue.toFixed(2)}</span>
          </div>
        </div>

        ${
          (paymentMethod && paymentMethod !== "N/A") || notes
            ? `<div class="payment-notes">
            ${
              paymentMethod && paymentMethod !== "N/A"
                ? `<div>
                <h4>Payment Method:</h4>
                <p>${paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod.toUpperCase()}</p>
              </div>`
                : ""
            }
            ${
              notes
                ? `<div>
                <h4>Notes:</h4>
                <p>${notes}</p>
              </div>`
                : ""
            }
          </div>`
            : ""
        }

        <div class="invoice-footer">
          <div class="invoice-meta">
            <p><strong>Invoice Generated:</strong></p>
            <p>Date: ${new Date().toLocaleDateString("en-GB")}</p>
            <p>Time: ${new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div class="thank-you">
            <p>Thank you for choosing ${store.name}</p>
          </div>
        </div>
      </div>`;
  };

  const buildPrintStyles = () => `
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size:A4 portrait; margin:15mm; }
    html,body { width:100%; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; line-height:1.4; color:#000; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { padding:20px; }
    .invoice-container { max-width:800px; margin:0 auto; }
    h1 { font-size:22px; margin:0 0 8px; color:#1d4ed8; }
    h2 { font-size:18px; margin:0 0 12px; color:#1d4ed8; }
    h3 { font-size:14px; margin:0 0 8px; color:#1e40af; }
    h4 { font-size:12px; margin:0 0 5px; }
    p { margin:3px 0; font-size:11px; }
    .invoice-header { display:flex; justify-content:space-between; margin-bottom:24px; gap:20px; }
    .store-info { flex:1; }
    .invoice-info { flex:1; text-align:right; }
    .customer-section { background:#eff6ff; padding:12px; border-radius:6px; margin-bottom:20px; }
    .customer-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px; }
    table { width:100%; border-collapse:collapse; margin:16px 0; }
    thead { background:#1d4ed8; color:white; }
    th { padding:8px; text-align:left; font-size:11px; font-weight:bold; }
    td { padding:7px 8px; border-bottom:1px solid #e5e7eb; font-size:11px; }
    tbody tr:last-child td { border-bottom:none; }
    .summary { margin-left:auto; width:280px; margin-top:24px; }
    .summary-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; }
    .summary-row.discount { color:#dc2626; }
    .summary-row.total { font-size:15px; font-weight:bold; color:#1d4ed8; border-top:2px solid #1d4ed8; padding-top:8px; margin-top:8px; }
    .payment-notes { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px; }
    .invoice-footer { margin-top:32px; padding-top:12px; border-top:1px solid #e5e7eb; }
    .invoice-meta { font-size:10px; color:#6b7280; margin-bottom:12px; }
    .thank-you { text-align:center; font-size:11px; color:#9ca3af; padding-top:8px; border-top:1px solid #f3f4f6; }
  `;

  // ─── Print ─────────────────────────────────────────────────────────────────
  const printInvoice = async () => {
    setIsPrinting(true);
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;

      const fullHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Invoice #${orderId}</title><style>${buildPrintStyles()}</style></head><body>${buildPrintHTML()}<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>`;

      if (isMobile) {
        const pw = window.open("", "_blank");
        if (!pw) throw new Error("Could not open print window.");
        pw.document.open();
        pw.document.write(fullHTML);
        pw.document.close();
        pw.focus();
      } else {
        const iframe = document.createElement("iframe");
        iframe.style.cssText =
          "position:fixed;width:0;height:0;border:0;visibility:hidden;";
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) return;
        doc.open();
        doc.write(fullHTML);
        doc.close();
        win.addEventListener("afterprint", () => {
          setTimeout(() => {
            if (document.body.contains(iframe))
              document.body.removeChild(iframe);
          }, 100);
        });
      }
    } catch (err) {
      console.error("Print error:", err);
      notification.error({
        title: "Print Failed",
        description: "Could not print invoice. Try downloading PDF instead.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // ─── PDF generation ────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pdf",
        },
        body: JSON.stringify({
          store,
          orderId,
          customer,
          products,
          currency,
          subtotal,
          deliveryCharge,
          taxAmount,
          discountAmount,
          additionalCharges,
          totalDue,
          paymentStatus,
          paymentMethod,
          orderStatus,
          notes,
          type: "A4",
        }),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notification.success({
        title: "PDF Downloaded",
        description: "Invoice PDF downloaded successfully.",
      });
    } catch (error) {
      console.error(error);
      notification.error({
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Please try again.",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ─── POS thermal print (Sunmi V2S 80mm) ──────────────────────────────────
  const printPOSReceipt = () => {
    setIsPOSPrinting(true);
    try {
      const displayCurrency = currencyIcon === "৳" ? "Tk" : currencyIcon;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const additionalChargesRows = additionalCharges
        .map(
          (c) =>
            `<div class="row"><span>${c.label}:</span><span>${displayCurrency}${c.amount.toFixed(2)}</span></div>`,
        )
        .join("");

      const itemsRows = products
        .map(
          (p) => `
          <tr>
            <td class="item-name">${p.name}</td>
            <td class="text-center">${p.qty}</td>
            <td class="text-right">
              ${displayCurrency}${(p.qty * p.price).toFixed(2)}<br>
              <span class="unit-price">${p.qty}x${displayCurrency}${p.price.toFixed(2)}</span>
            </td>
          </tr>`,
        )
        .join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=80mm, initial-scale=1.0">
  <title>Receipt #${orderId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: 80mm auto;
      margin: 4mm 4mm;
    }
    html {
      background: #fff;
    }
    body {
      width: 72mm;
      margin: 0 auto;
      padding: 4px 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11pt;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { padding: 0; width: 72mm; margin: 0; }
    }
    .receipt { width: 100%; }
    .store-name {
      font-size: 15pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 9pt; }
    .divider-solid { border: none; border-top: 1px solid #000; margin: 5px 0; }
    .divider-dashed { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .divider-double { border: none; border-top: 3px double #000; margin: 6px 0; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 2px 0;
      font-size: 10pt;
    }
    .section-title {
      text-align: center;
      font-weight: bold;
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 4px 0 3px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    table thead th {
      border-bottom: 1px solid #000;
      padding: 2px 1px;
      font-weight: bold;
    }
    table tbody td { padding: 3px 1px; vertical-align: top; }
    .item-name { width: 48%; word-break: break-word; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .unit-price { font-size: 8.5pt; font-weight: normal; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14pt;
      font-weight: bold;
      margin-top: 5px;
      padding-top: 5px;
      border-top: 2px solid #000;
    }
    .footer {
      text-align: center;
      font-size: 9pt;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #000;
      line-height: 1.6;
    }
    @media print {
      html, body { width: 72mm; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="store-name">${store.name}</div>
    ${store.address ? `<div class="center small">${store.address}</div>` : ""}
    ${store.phone ? `<div class="center small">Tel: ${store.phone}</div>` : ""}
    ${store.email ? `<div class="center small">${store.email}</div>` : ""}

    <div class="divider-solid"></div>

    <div class="center bold" style="font-size:12pt;margin-bottom:3px">RECEIPT</div>
    <div class="row"><span>Invoice #:</span><span>${orderId}</span></div>
    <div class="row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="row"><span>Time:</span><span>${timeStr}</span></div>

    <div class="divider-dashed"></div>

    <div style="margin-bottom:2px"><span class="bold">Customer: </span>${customer.name}</div>
    ${customer.contact ? `<div class="small">Phone: ${customer.contact}</div>` : ""}
    ${customer.address ? `<div class="small">Address: ${customer.address}</div>` : ""}

    <div class="divider-double"></div>
    <div class="section-title">Items</div>

    <table>
      <thead>
        <tr>
          <th style="width:48%;text-align:left">Item</th>
          <th style="width:14%;text-align:center">Qty</th>
          <th style="width:38%;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="divider-double"></div>

    <div class="row"><span>Subtotal:</span><span>${displayCurrency}${subtotal.toFixed(2)}</span></div>
    ${discountAmount > 0 ? `<div class="row"><span>Discount:</span><span>-${displayCurrency}${discountAmount.toFixed(2)}</span></div>` : ""}
    ${deliveryCharge > 0 ? `<div class="row"><span>Delivery:</span><span>${displayCurrency}${deliveryCharge.toFixed(2)}</span></div>` : ""}
    ${taxAmount > 0 ? `<div class="row"><span>Tax:</span><span>${displayCurrency}${taxAmount.toFixed(2)}</span></div>` : ""}
    ${additionalChargesRows}

    <div class="total-row">
      <span>TOTAL:</span>
      <span>${displayCurrency}${totalDue.toFixed(2)}</span>
    </div>

    <div class="divider-dashed"></div>

    <div class="row">
      <span class="bold">Payment:</span>
      <span>${paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod.toUpperCase()}</span>
    </div>
    <div class="row">
      <span class="bold">Status:</span>
      <span>${formattedPaymentStatus}</span>
    </div>
    ${notes ? `<div class="small" style="margin-top:4px">Note: ${notes}</div>` : ""}

    <div class="footer">
      <div>Thank you for your purchase!</div>
      <div class="bold">${store.name}</div>
      <div>Please retain this receipt</div>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 400);
    };
  <\/script>
</body>
</html>`;

      const pw = window.open("", "_blank", "width=400,height=750");
      if (!pw) {
        notification.error({
          title: "Popup Blocked",
          description: "Allow popups for this site then try again.",
        });
        return;
      }
      pw.document.open();
      pw.document.write(html);
      pw.document.close();
      pw.focus();
    } catch (err) {
      console.error("POS print error:", err);
      notification.error({
        title: "Print Failed",
        description: "Could not open POS print. Please try again.",
      });
    } finally {
      setIsPOSPrinting(false);
    }
  };

  if (!open) return null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal shell */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* ── Top bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-600 rounded-xl shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                    Invoice #{orderId}
                  </h2>
                  <button
                    onClick={copyInvoiceId}
                    className="shrink-0 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Copy invoice number"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {invoiceDate} · {invoiceTime}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors shrink-0 ml-3 text-gray-400"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">
            <div
              ref={invoiceRef}
              className="m-3 sm:m-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              {/* Invoice header band */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 sm:px-8 py-5 sm:py-7">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  {/* Store */}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                      {store.name}
                    </h1>
                    <div className="space-y-1">
                      {store.address && (
                        <p className="flex items-center gap-1.5 text-blue-100 text-xs sm:text-sm">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {store.address}
                        </p>
                      )}
                      {store.phone && (
                        <p className="flex items-center gap-1.5 text-blue-100 text-xs sm:text-sm">
                          <Phone className="w-3 h-3 shrink-0" />
                          {store.phone}
                        </p>
                      )}
                      {store.email && (
                        <p className="flex items-center gap-1.5 text-blue-100 text-xs sm:text-sm">
                          <Mail className="w-3 h-3 shrink-0" />
                          {store.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Invoice meta */}
                  <div className="sm:text-right">
                    <div className="inline-flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 mb-3">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-white font-bold text-sm tracking-wide">
                        INVOICE
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex sm:justify-end items-center gap-2 text-blue-100 text-xs sm:text-sm">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono font-medium text-white">
                          {orderId}
                        </span>
                      </div>
                      <div className="flex sm:justify-end items-center gap-2">
                        <StatusBadge
                          status={paymentStatus}
                          map={PAYMENT_STATUS_STYLES}
                        />
                      </div>
                      <div className="flex sm:justify-end items-center gap-2">
                        <StatusBadge
                          status={orderStatus}
                          map={ORDER_STATUS_STYLES}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body padding */}
              <div className="px-5 sm:px-8 py-5 sm:py-7 space-y-6 sm:space-y-8">
                {/* Customer card */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bill To
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        {customer.name}
                      </p>
                      {customer.address && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                          {customer.address}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      {customer.contact && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                          {customer.contact}
                        </p>
                      )}
                      {customer.email && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                          {customer.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Products table */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order Items
                    </span>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table
                        className="w-full text-sm"
                        style={{ minWidth: "480px" }}
                      >
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">
                              Item
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                              Qty
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                              Price
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {products.map((product, i) => (
                            <tr
                              key={i}
                              className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="px-4 py-3 text-gray-800 dark:text-gray-200 text-sm font-medium">
                                {product.name}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 text-sm">
                                {product.qty}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 text-sm font-mono">
                                {currencyIcon}
                                {product.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-semibold text-sm font-mono">
                                {currencyIcon}
                                {(product.qty * product.price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Summary + Payment/Notes grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  {/* Summary */}
                  <div className="sm:col-start-2 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Summary
                      </span>
                    </div>
                    <div className="px-4 py-4 space-y-2.5">
                      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>Subtotal</span>
                        <span className="font-mono">
                          {currencyIcon}
                          {subtotal.toFixed(2)}
                        </span>
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                          <span>Discount</span>
                          <span className="font-mono">
                            −{currencyIcon}
                            {discountAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {deliveryCharge > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                          <span>Delivery Charge</span>
                          <span className="font-mono">
                            {currencyIcon}
                            {deliveryCharge.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {taxAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                          <span>Tax</span>
                          <span className="font-mono">
                            {currencyIcon}
                            {taxAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* ── Additional charges ── */}
                      {additionalCharges.map((charge, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span>{charge.label}</span>
                          <span className="font-mono">
                            {currencyIcon}
                            {charge.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}

                      <div className="pt-3 mt-1 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                          Grand Total
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-base sm:text-lg font-mono">
                          {currencyIcon}
                          {totalDue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment method + Notes stacked in col 1 */}
                  <div className="sm:row-start-1 space-y-4">
                    {paymentMethod && paymentMethod !== "N/A" && (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Payment Method
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {paymentMethod === "cod"
                              ? "Cash on Delivery"
                              : paymentMethod.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}

                    {notes && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                        <div className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            Notes
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                            {notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {invoiceDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {invoiceTime}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 sm:text-right">
                    Thank you for choosing{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {store.name}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom action bar ── */}
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Building2 className="w-3 h-3" />
                <span>
                  {invoiceDate} · {invoiceTime}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {showPrintButton && (
                  <Button
                    variant="outline"
                    onClick={printInvoice}
                    disabled={isPrinting || isGeneratingPDF}
                    className="h-9 text-sm gap-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {isPrinting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Print A4
                  </Button>
                )}

                {showPOSButton && (
                  <Button
                    variant="outline"
                    onClick={printPOSReceipt}
                    disabled={isPOSPrinting || isPrinting || isGeneratingPDF}
                    className="h-9 text-sm gap-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {isPOSPrinting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Print POS
                  </Button>
                )}

                {showPDFButton && (
                  <Button
                    onClick={generatePDF}
                    disabled={isGeneratingPDF || isPrinting}
                    className="h-9 text-sm gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
