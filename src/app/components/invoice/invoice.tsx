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
} from "lucide-react";
import {
  Currency,
  CURRENCY_ICONS,
  PaymentStatus,
  OrderStatus,
} from "@/lib/types/enums";
import html2canvas from "html2canvas";
import { App } from "antd";

// Helper function to format status text
// const formatStatus = (status: string): string => {
//   if (!status) return "N/A";

//   // Handle common status values
//   const statusMap: Record<string, string> = {
//     PENDING: "Pending",
//     PAID: "Paid",
//     UNPAID: "Unpaid",
//     PARTIALLY_PAID: "Partially Paid",
//     REFUNDED: "Refunded",
//     FAILED: "Failed",
//     PROCESSING: "Processing",
//     CONFIRMED: "Confirmed",
//     SHIPPED: "Shipped",
//     DELIVERED: "Delivered",
//     CANCELLED: "Cancelled",
//     RETURNED: "Returned",
//     ON_HOLD: "On Hold",
//   };

//   // Check if status exists in map
//   const upperStatus = status.toUpperCase();
//   if (statusMap[upperStatus]) {
//     return statusMap[upperStatus];
//   }

//   // Otherwise, capitalize first letter of each word
//   return status
//     .toLowerCase()
//     .split("_")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(" ");
// };

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
  totalDue: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  orderStatus?: OrderStatus;
  notes?: string;
  showPrintButton?: boolean;
  showPOSButton?: boolean;
  showPDFButton?: boolean;
}

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
    totalDue,
    paymentStatus = "PENDING",
    paymentMethod = "N/A",
    orderStatus = "PROCESSING",
    notes = "",
    showPrintButton = true,
    showPOSButton = true,
    showPDFButton = true,
  } = props;

  // Use App context for notifications
  const { notification } = App.useApp();

  const invoiceRef = useRef<HTMLDivElement>(null);
  // const posRef = useRef<HTMLDivElement>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const currencyIcon = CURRENCY_ICONS[currency] || "৳";
  const invoiceDate = new Date().toLocaleDateString("en-GB");
  const invoiceTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Formatted status values
  const formattedPaymentStatus = formatStatus(paymentStatus);
  const formattedOrderStatus = formatStatus(orderStatus);

  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Copy invoice ID
  const copyInvoiceId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
  };

  // ==================== FIXED PRINT A4 (iOS & ANDROID COMPATIBLE) ====================
  const printInvoice = async () => {
    setIsPrinting(true);
    try {
      // Detect device type
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;

      if (isMobile) {
        // Mobile: Use clean new window approach
        await printForMobileClean();
      } else {
        // Desktop: Use iframe method
        await printForDesktop();
      }
    } catch (err) {
      console.error("Print error:", err);
      notification.error({
        title: "Print Failed",
        description:
          "Could not print invoice. Please try downloading PDF instead.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // ==================== NEW CLEAN MOBILE PRINT ====================
  const printForMobileClean = async () => {
    // Open new window for printing
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error("Could not open print window. Please allow popups.");
    }

    // Build complete standalone HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice #${orderId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4 portrait;
              margin: 15mm;
            }

            html, body {
              width: 100%;
              height: 100%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              padding: 20px;
            }

            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
            }

            h1, h2, h3 {
              margin: 0 0 10px 0;
              color: #2563eb;
            }

            h1 { font-size: 24px; }
            h2 { font-size: 20px; }
            h3 { font-size: 16px; }

            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 20px;
            }

            .store-info, .invoice-info {
              flex: 1;
            }

            .invoice-info {
              text-align: right;
            }

            .store-info p, .invoice-info p {
              margin: 5px 0;
              font-size: 11px;
            }

            .customer-section {
              background: #f0f7ff;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 25px;
            }

            .customer-section h3 {
              color: #1e40af;
            }

            .customer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-top: 10px;
            }

            .customer-grid p {
              margin: 3px 0;
              font-size: 11px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }

            thead {
              background: #2563eb;
              color: white;
            }

            th {
              padding: 10px 8px;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
            }

            td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }

            tbody tr:last-child td {
              border-bottom: none;
            }

            .text-center { text-align: center; }
            .text-right { text-align: right; }

            .summary {
              margin-left: auto;
              width: 300px;
              margin-top: 30px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
            }

            .summary-row.total {
              font-size: 16px;
              font-weight: bold;
              color: #2563eb;
              border-top: 2px solid #2563eb;
              padding-top: 10px;
              margin-top: 10px;
            }

            .summary-row.discount {
              color: #dc2626;
            }

            .payment-notes {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-top: 30px;
            }

            .payment-notes h4 {
              font-size: 13px;
              margin-bottom: 8px;
            }

            .payment-notes p {
              font-size: 11px;
              color: #4b5563;
            }

            .invoice-footer {
              margin-top: 40px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
            }

            .invoice-meta {
              font-size: 10px;
              color: #6b7280;
              margin-bottom: 15px;
            }

            .invoice-meta p {
              margin: 2px 0;
            }

            .thank-you {
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
              padding-top: 10px;
              border-top: 1px solid #f3f4f6;
            }

            @media print {
              body { padding: 0; }
              .invoice-container { max-width: 100%; }
              .customer-section, table, .summary, .payment-notes {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
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
                  <th style="width: 45%;">Item</th>
                  <th class="text-center" style="width: 15%;">Qty</th>
                  <th class="text-right" style="width: 20%;">Price</th>
                  <th class="text-right" style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${products
                  .map(
                    (product) => `
                  <tr>
                    <td>${product.name}</td>
                    <td class="text-center">${product.qty}</td>
                    <td class="text-right">${currencyIcon}${product.price.toFixed(2)}</td>
                    <td class="text-right"><strong>${currencyIcon}${(product.qty * product.price).toFixed(2)}</strong></td>
                  </tr>
                `,
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
                  ? `
                <div class="summary-row discount">
                  <span>Discount:</span>
                  <span>-${currencyIcon}${discountAmount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                deliveryCharge > 0
                  ? `
                <div class="summary-row">
                  <span>Delivery:</span>
                  <span>${currencyIcon}${deliveryCharge.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                taxAmount > 0
                  ? `
                <div class="summary-row">
                  <span>Tax:</span>
                  <span>${currencyIcon}${taxAmount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              <div class="summary-row total">
                <span>GRAND TOTAL:</span>
                <span>${currencyIcon}${totalDue.toFixed(2)}</span>
              </div>
            </div>

            ${
              (paymentMethod && paymentMethod !== "N/A") || notes
                ? `
              <div class="payment-notes">
                ${
                  paymentMethod && paymentMethod !== "N/A"
                    ? `
                  <div>
                    <h4>Payment Method:</h4>
                    <p>${paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod.toUpperCase()}</p>
                  </div>
                `
                    : ""
                }
                ${
                  notes
                    ? `
                  <div>
                    <h4>Notes:</h4>
                    <p>${notes}</p>
                  </div>
                `
                    : ""
                }
              </div>
            `
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
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  };

  // Desktop/Android Print - Use iframe method
  const printForDesktop = async () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;

    const printStyles = `
      <style>
        @media print {
          @page { 
            size: A4; 
            margin: 15mm;
          }
          
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            width: 100%;
            max-width: 100%;
            overflow: visible !important;
          }
          
          .print-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
          }
          
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            width: 100%;
          }
          
          .store-info {
            flex: 1;
            text-align: left;
          }
          
          .invoice-info {
            flex: 1;
            text-align: right;
          }
          
          table {
            width: 100% !important;
            table-layout: fixed;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          th, td {
            padding: 8px 5px;
            border: 1px solid #ddd;
            word-break: break-word;
            vertical-align: top;
          }
          
          th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: left;
          }
          
          .col-item { width: 45%; }
          .col-qty { width: 15%; text-align: center; }
          .col-price { width: 20%; text-align: right; }
          .col-total { width: 20%; text-align: right; }
          
          .no-break {
            page-break-inside: avoid;
          }
          
          .no-print, button, .print-button, .modal-header {
            display: none !important;
          }
          
          * {
            max-width: 100% !important;
            box-sizing: border-box;
          }
          
          .summary {
            margin-left: auto;
            width: 300px;
            margin-top: 30px;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: #fff;
          padding: 20px;
          margin: 0;
        }
        
        .print-container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
        }
        
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }
        
        .store-info {
          flex: 1;
        }
        
        .invoice-info {
          flex: 1;
          text-align: right;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        th, td {
          padding: 8px 5px;
          border: 1px solid #ddd;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
        }
        
        .col-item { width: 45%; }
        .col-qty { width: 15%; text-align: center; }
        .col-price { width: 20%; text-align: right; }
        .col-total { width: 20%; text-align: right; }
        
        .summary {
          margin-left: auto;
          width: 300px;
          margin-top: 30px;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .grand-total {
          font-size: 14px;
          font-weight: bold;
          border-top: 2px solid #000;
          padding-top: 10px;
          margin-top: 10px;
        }
        
        .customer-info {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        h1 {
          font-size: 24px;
          margin: 0 0 10px 0;
          color: #2563eb;
        }
        
        h2 {
          font-size: 20px;
          margin: 0 0 15px 0;
          color: #2563eb;
        }
        
        h3 {
          font-size: 16px;
          margin: 0 0 10px 0;
          color: #1e40af;
        }
      </style>
    `;

    const printHTML = `
      <div class="print-container">
        <div class="invoice-header">
          <div class="store-info">
            <h1>${store.name}</h1>
            ${store.address ? `<p><strong>Address:</strong> ${store.address}</p>` : ""}
            ${store.phone ? `<p><strong>Phone:</strong> ${store.phone}</p>` : ""}
            ${store.email ? `<p><strong>Email:</strong> ${store.email}</p>` : ""}
          </div>
          
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> ${orderId}</p>
            <p><strong>Payment Status:</strong> ${formattedPaymentStatus}</p>
            <p><strong>Order Status:</strong> ${formattedOrderStatus}</p>
          </div>
        </div>
        
        <div class="customer-info no-break">
          <h3>Bill To:</h3>
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p><strong>${customer.name}</strong></p>
              ${customer.address ? `<p>${customer.address}</p>` : ""}
            </div>
            <div>
              ${customer.contact ? `<p><strong>Contact:</strong> ${customer.contact}</p>` : ""}
              ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ""}
            </div>
          </div>
        </div>
        
        <table class="no-break">
          <thead>
            <tr>
              <th class="col-item">Item</th>
              <th class="col-qty">Quantity</th>
              <th class="col-price">Unit Price</th>
              <th class="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (product) => `
              <tr>
                <td class="col-item">${product.name}</td>
                <td class="col-qty">${product.qty}</td>
                <td class="col-price">${currencyIcon}${product.price.toFixed(2)}</td>
                <td class="col-total">${currencyIcon}${(product.qty * product.price).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        
        <div class="summary no-break">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${currencyIcon}${subtotal.toFixed(2)}</span>
          </div>
          ${
            discountAmount > 0
              ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span>-${currencyIcon}${discountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            deliveryCharge > 0
              ? `
            <div class="summary-row">
              <span>Delivery Charge:</span>
              <span>${currencyIcon}${deliveryCharge.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            taxAmount > 0
              ? `
            <div class="summary-row">
              <span>Tax:</span>
              <span>${currencyIcon}${taxAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div class="summary-row grand-total">
            <span>GRAND TOTAL:</span>
            <span>${currencyIcon}${totalDue.toFixed(2)}</span>
          </div>
        </div>
        
        ${
          paymentMethod || notes
            ? `
          <div class="no-break" style="margin-top: 40px; display: flex; gap: 40px;">
            ${
              paymentMethod && paymentMethod !== "N/A"
                ? `
              <div style="flex: 1;">
                <h3>Payment Method:</h3>
                <p>${paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod.toUpperCase()}</p>
              </div>
            `
                : ""
            }
            ${
              notes
                ? `
              <div style="flex: 1;">
                <h3>Notes:</h3>
                <p>${notes}</p>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        
        <div style="margin-top: 50px; padding-top: 15px; border-top: 1px solid #ddd;">
          <div style="text-align: left; font-size: 11px; color: #555;">
            <p style="margin: 0 0 5px 0; font-weight: bold;">Invoice Generated:</p>
            <p style="margin: 0 0 3px 0;">Date: ${new Date().toLocaleDateString("en-GB")}</p>
            <p style="margin: 0;">Time: ${new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        
        <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
          <p>Thank you for choosing ${store.name}</p>
        </div>
      </div>
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${orderId}</title>
          <meta charset="UTF-8">
          ${printStyles}
        </head>
        <body>
          ${printHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  if (document.body.contains(parent.document.querySelector('iframe'))) {
                    parent.document.body.removeChild(parent.document.querySelector('iframe'));
                  }
                }, 500);
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    win.addEventListener("afterprint", () => {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 100);
    });
  };

  // ==================== PDF GENERATION ====================
  const generatePDF = async (type: "A4") => {
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
          totalDue,
          paymentStatus,
          paymentMethod,
          orderStatus,
          notes,
          type,
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
        description: "Invoice PDF has been downloaded successfully.",
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

  // ==================== FIXED AUTO-ADAPTIVE POS RECEIPT (NO CUTOFF) ====================
  const downloadPOSImage = async () => {
    try {
      setIsGeneratingPDF(true);

      const universalWidth = 220; // 58mm - universal compatibility

      const iframe = document.createElement("iframe");
      iframe.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${universalWidth}px;
      height: 4000px;
      border: none;
      visibility: hidden;
    `;
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("Could not create iframe document");

      // Get currency symbol - handle Bengali Taka properly
      const displayCurrency = currencyIcon === "৳" ? "Tk" : currencyIcon;

      doc.open();
      doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              border: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 12px !important;
              line-height: 1.4 !important;
              color: #000000 !important;
              background-color: #ffffff !important;
              padding: 15px 8px 25px 8px;
              width: ${universalWidth}px;
              margin: 0 auto;
              letter-spacing: 0 !important;
              -webkit-font-smoothing: none !important;
              -moz-osx-font-smoothing: grayscale !important;
              overflow: visible !important;
            }
            
            .receipt-container {
              width: 100%;
              margin: 0 auto;
              padding-bottom: 20px;
            }
            
            .store-title {
              font-size: 18px !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              text-align: center !important;
              margin: 0 0 5px 0 !important;
              line-height: 1.3 !important;
              display: block !important;
              width: 100% !important;
              letter-spacing: 2px !important;
              color: #000000 !important;
            }
            
            .text-center {
              text-align: center !important;
              display: block !important;
              width: 100% !important;
              margin: 0 auto !important;
              color: #000000 !important;
            }
            
            .row {
              margin-bottom: 4px !important;
              line-height: 1.4 !important;
              clear: both !important;
              color: #000000 !important;
            }
            
            .small {
              font-size: 10px !important;
              color: #000000 !important;
            }
            
            .bold {
              font-weight: bold !important;
              color: #000000 !important;
            }
            
            .divider {
              border: none !important;
              border-top: 2px solid #000000 !important;
              margin: 7px 0 !important;
              height: 0 !important;
              width: 100% !important;
            }
            
            .divider-thick {
              border: none !important;
              border-top: 3px solid #000000 !important;
              margin: 9px 0 !important;
              height: 0 !important;
              width: 100% !important;
            }
            
            .divider-dashed {
              border: none !important;
              border-top: 2px dashed #000000 !important;
              margin: 7px 0 !important;
              height: 0 !important;
              width: 100% !important;
            }
            
            .section-header {
              font-size: 15px !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              text-align: center !important;
              margin: 8px 0 6px 0 !important;
              display: block !important;
              width: 100% !important;
              color: #000000 !important;
              letter-spacing: 2px !important;
            }
            
            .items-table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 7px 0 !important;
              table-layout: fixed !important;
            }
            
            .items-table thead th {
              font-weight: bold !important;
              padding: 5px 2px !important;
              border-bottom: 2px solid #000000 !important;
              font-size: 11px !important;
              text-align: left !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            
            .items-table thead th:nth-child(2) {
              text-align: center !important;
            }
            
            .items-table thead th:nth-child(3) {
              text-align: right !important;
            }
            
            .items-table tbody td {
              padding: 4px 2px !important;
              vertical-align: top !important;
              font-size: 11px !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            
            .items-table tbody td:nth-child(1) {
              width: 48% !important;
              text-align: left !important;
              word-break: break-word !important;
              white-space: normal !important;
              font-weight: 600 !important;
            }
            
            .items-table tbody td:nth-child(2) {
              width: 18% !important;
              text-align: center !important;
              font-weight: bold !important;
            }
            
            .items-table tbody td:nth-child(3) {
              width: 34% !important;
              text-align: right !important;
              font-weight: bold !important;
            }
            
            .price-small {
              font-size: 9px !important;
              color: #333333 !important;
              margin-top: 2px !important;
              font-weight: normal !important;
            }
            
            .summary {
              margin: 10px 0 !important;
              padding-bottom: 5px !important;
            }
            
            .summary-row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 4px !important;
              font-size: 12px !important;
              line-height: 1.4 !important;
              color: #000000 !important;
            }
            
            .summary-row span {
              color: #000000 !important;
            }
            
            .summary-row.grand-total {
              font-size: 17px !important;
              font-weight: bold !important;
              margin-top: 7px !important;
              padding-top: 7px !important;
              border-top: 3px solid #000000 !important;
            }
            
            .summary-row.grand-total span {
              color: #000000 !important;
              font-weight: bold !important;
            }
            
            .payment-section {
              margin: 10px 0 !important;
              text-align: center !important;
              padding: 5px 0 !important;
            }
            
            .payment-section .row {
              text-align: center !important;
              font-weight: bold !important;
              font-size: 13px !important;
              color: #000000 !important;
              margin-bottom: 4px !important;
            }
            
            .footer {
              margin-top: 12px !important;
              padding-top: 8px !important;
              text-align: center !important;
              font-size: 10px !important;
              color: #000000 !important;
              padding-bottom: 10px !important;
            }
            
            .footer .row {
              margin-bottom: 3px !important;
            }
            
            /* Force black text everywhere */
            * {
              max-width: 100% !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              color: #000000 !important;
            }
            
            /* Ensure crisp rendering */
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            
            <div class="store-title">${store.name}</div>
            ${store.address ? `<div class="row text-center small">${store.address}</div>` : ""}
            ${store.phone ? `<div class="row text-center small">Tel: ${store.phone}</div>` : ""}
            
            <div class="divider"></div>
            
            <div class="row text-center bold" style="font-size: 14px;">INVOICE: #${orderId}</div>
            <div class="row text-center small">DATE: ${new Date().toLocaleDateString("en-GB")}</div>
            <div class="row text-center small">TIME: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            
            <div class="divider"></div>
            
            <div class="row"><span class="bold">CUSTOMER:</span> ${customer.name}</div>
            ${customer.contact ? `<div class="row small">CONTACT: ${customer.contact}</div>` : ""}
            ${customer.address ? `<div class="row small">ADDRESS: ${customer.address}</div>` : ""}
            
            <div class="divider-thick"></div>
            
            <div class="section-header">ITEMS</div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${products
                  .map((p) => {
                    const itemTotal = (p.qty * p.price).toFixed(2);
                    const unitPrice = p.price.toFixed(2);

                    return `
                    <tr>
                      <td>${p.name}</td>
                      <td style="text-align: center;">${p.qty}</td>
                      <td style="text-align: right;">
                        ${displayCurrency}${itemTotal}
                        <div class="price-small">${p.qty} x ${displayCurrency}${unitPrice}</div>
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
            
            <div class="divider-thick"></div>
            
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${displayCurrency}${subtotal.toFixed(2)}</span>
              </div>
              ${
                discountAmount > 0
                  ? `
                <div class="summary-row">
                  <span>Discount:</span>
                  <span>-${displayCurrency}${discountAmount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                deliveryCharge > 0
                  ? `
                <div class="summary-row">
                  <span>Delivery:</span>
                  <span>${displayCurrency}${deliveryCharge.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                taxAmount > 0
                  ? `
                <div class="summary-row">
                  <span>Tax:</span>
                  <span>${displayCurrency}${taxAmount.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              
              <div class="summary-row grand-total">
                <span>TOTAL:</span>
                <span>${displayCurrency}${totalDue.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="divider-thick"></div>
            
            <div class="payment-section">
              <div class="row">PAYMENT: ${paymentMethod === "cod" ? "CASH" : paymentMethod.toUpperCase()}</div>
              <div class="row">STATUS: ${formattedPaymentStatus.toUpperCase()}</div>
              ${notes ? `<div class="row small" style="margin-top: 6px; font-weight: normal;">NOTE: ${notes}</div>` : ""}
            </div>
            
            <div class="divider"></div>
            
            <div class="footer">
              <div class="row">Thank you for choosing ${store.name}</div>
              <div class="row">Please retain this receipt</div>
            </div>
            
          </div>
        </body>
      </html>
    `);
      doc.close();

      // Wait longer for content to fully render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const body = doc.body;
      if (!body) throw new Error("No body element found");

      // Get actual content height with extra padding
      const contentHeight = Math.max(body.scrollHeight, body.offsetHeight) + 50;
      iframe.style.height = `${contentHeight}px`;

      // Wait for layout to stabilize
      await new Promise((resolve) => setTimeout(resolve, 400));

      const canvas = await html2canvas(body, {
        scale: 5,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: universalWidth,
        height: contentHeight,
        windowWidth: universalWidth,
        windowHeight: contentHeight,
        imageTimeout: 0,
        removeContainer: true,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc) => {
          // Force pure black text
          const allElements = clonedDoc.querySelectorAll("*");
          allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.color = "#000000";
              el.style.backgroundColor = "#ffffff";
              el.style.setProperty("-webkit-font-smoothing", "none");
              el.style.setProperty("font-smooth", "never");
            }
          });

          // Ensure borders are pure black
          const borders = clonedDoc.querySelectorAll(
            ".divider, .divider-thick, .divider-dashed",
          );
          borders.forEach((border) => {
            if (border instanceof HTMLElement) {
              border.style.borderColor = "#000000";
            }
          });

          // Ensure footer is visible
          const footer = clonedDoc.querySelector(".footer");
          if (footer instanceof HTMLElement) {
            footer.style.paddingBottom = "20px";
            footer.style.marginBottom = "20px";
          }

          const style = clonedDoc.createElement("style");
          style.textContent = `
          * {
            color: #000000 !important;
            background-color: #ffffff !important;
            font-family: 'Courier New', Courier, monospace !important;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeSpeed !important;
          }
          
          body {
            overflow: visible !important;
            min-height: 100% !important;
          }
          
          .store-title, .section-header, .text-center, .payment-section, .footer {
            text-align: center !important;
            display: block !important;
            width: 100% !important;
          }
          
          .summary-row {
            display: flex !important;
            justify-content: space-between !important;
            width: 100% !important;
          }
          
          .divider {
            border-top: 2px solid #000000 !important;
          }
          
          .divider-thick {
            border-top: 3px solid #000000 !important;
          }
          
          .divider-dashed {
            border-top: 2px dashed #000000 !important;
          }
          
          .footer {
            padding-bottom: 20px !important;
            margin-bottom: 20px !important;
          }
        `;
          clonedDoc.head.appendChild(style);
        },
      });

      // POST-PROCESSING: Aggressive contrast enhancement
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const threshold = 180;
          const newValue = avg < threshold ? 0 : 255;

          data[i] = newValue;
          data[i + 1] = newValue;
          data[i + 2] = newValue;
        }

        ctx.putImageData(imageData, 0, 0);
      }

      const imageUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `pos_receipt_${orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      document.body.removeChild(iframe);

      notification.success({
        title: "POS Receipt Downloaded",
        description: "Receipt compatible with all thermal printers",
      });
    } catch (error) {
      console.error("Error generating POS receipt:", error);
      notification.error({
        title: "Download Failed",
        description: "Could not generate POS receipt. Please try again.",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-background rounded-xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh]">
          {/* Header */}
          <div className="border-b p-3 sm:p-6 flex items-start sm:items-center justify-between no-print">
            <div className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg shrink-0">
                <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                    Invoice #{orderId}
                  </h2>
                  <button
                    onClick={copyInvoiceId}
                    className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                    title="Copy invoice number"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span>Payment: {formattedPaymentStatus}</span>
                  <span>Order: {formattedOrderStatus}</span>
                  <span className="hidden sm:inline">Currency: {currency}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-red-500 rounded-lg transition-colors shrink-0 ml-2"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-2 sm:p-6">
            <div
              id="invoice-print-content"
              ref={invoiceRef}
              className="bg-background p-4 sm:p-8 rounded-lg border max-w-4xl mx-auto"
              style={{
                boxSizing: "border-box",
                maxWidth: "100%",
              }}
            >
              {/* Header - Responsive Stack */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-0 mb-6 sm:mb-8 invoice-header">
                {/* Store Info */}
                <div className="store-info">
                  <h1 className="text-xl sm:text-3xl font-bold text-blue-600 mb-2">
                    {store.name}
                  </h1>
                  {store.address && (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 wrap-break-word mb-1">
                      📍 {store.address}
                    </p>
                  )}
                  {store.phone && (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 wrap-break-word mb-1">
                      📞 {store.phone}
                    </p>
                  )}
                  {store.email && (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 wrap-break-word">
                      ✉️ {store.email}
                    </p>
                  )}
                </div>

                {/* Invoice Info */}
                <div className="sm:text-right invoice-info">
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-2">
                    INVOICE
                  </h2>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p>
                      <span className="font-semibold">Invoice #:</span>{" "}
                      {orderId}
                    </p>
                    <p>
                      <span className="font-semibold">Payment Status:</span>{" "}
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {formattedPaymentStatus}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Order Status:</span>{" "}
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {formattedOrderStatus}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info - Responsive Grid */}
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-blue-50 rounded-lg no-break">
                <h3 className="font-bold text-base sm:text-lg mb-2 text-blue-700">
                  Bill To:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-black">
                      {customer.name}
                    </p>
                    {customer.address && (
                      <p className="text-sm sm:text-base text-gray-700 dark:text-black wrap-break-word">
                        {customer.address}
                      </p>
                    )}
                  </div>
                  <div>
                    {customer.contact && (
                      <p className="text-sm sm:text-base text-gray-700 dark:text-black wrap-break-word">
                        📞 {customer.contact}
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 wrap-break-word">
                        ✉️ {customer.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Table - Responsive */}
              <div className="mb-6 sm:mb-8 no-break overflow-x-auto">
                <table
                  className="w-full min-w-125"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm col-item">
                        Item
                      </th>
                      <th className="text-center p-2 sm:p-3 font-semibold text-xs sm:text-sm col-qty">
                        Qty
                      </th>
                      <th className="text-right p-2 sm:p-3 font-semibold text-xs sm:text-sm col-price">
                        Price
                      </th>
                      <th className="text-right p-2 sm:p-3 font-semibold text-xs sm:text-sm col-total">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 sm:p-3 text-xs sm:text-sm wrap-break-word">
                          {product.name}
                        </td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-center">
                          {product.qty}
                        </td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-right">
                          {currencyIcon}
                          {product.price.toFixed(2)}
                        </td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-right font-semibold">
                          {currencyIcon}
                          {(product.qty * product.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary - Responsive */}
              <div className="sm:ml-auto max-w-full sm:max-w-sm no-break summary">
                <div className="space-y-2 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      {currencyIcon}
                      {subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span className="font-semibold">
                        -{currencyIcon}
                        {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Charge:</span>
                      <span className="font-semibold">
                        {currencyIcon}
                        {deliveryCharge.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span className="font-semibold">
                        {currencyIcon}
                        {taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-base sm:text-lg font-bold text-blue-600 grand-total">
                      <span>GRAND TOTAL:</span>
                      <span>
                        {currencyIcon}
                        {totalDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method & Notes - Responsive Grid */}
              {(paymentMethod || notes) && (
                <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 no-break">
                  {paymentMethod && paymentMethod !== "N/A" && (
                    <div>
                      <h4 className="font-bold mb-2 text-sm sm:text-base">
                        Payment Method:
                      </h4>
                      <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 wrap-break-word">
                        {paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : paymentMethod.toUpperCase()}
                      </p>
                    </div>
                  )}
                  {notes && (
                    <div>
                      <h4 className="font-bold mb-2 text-sm sm:text-base">
                        Notes:
                      </h4>
                      <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 wrap-break-word">
                        {notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Date & Time - Bottom Left */}
              <div className="mt-8 sm:mt-12 pt-4 border-t text-left text-xs sm:text-sm text-gray-600 dark:text-gray-400 no-break">
                <p className="font-semibold mb-1">Invoice Generated:</p>
                <p>Date: {invoiceDate}</p>
                <p>Time: {invoiceTime}</p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t text-center text-xs sm:text-sm text-gray-500 no-break">
                <p>Thank you for choosing {store.name}</p>
              </div>
            </div>
          </div>

          {/* Actions - Responsive */}
          <div className="border-t p-3 sm:p-6 flex flex-col sm:flex-row flex-wrap gap-3 justify-between items-stretch sm:items-center no-print">
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left order-2 sm:order-1">
              Generated: {invoiceDate} at {invoiceTime}
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 order-1 sm:order-2">
              {showPrintButton && (
                <Button
                  variant="outline"
                  onClick={printInvoice}
                  disabled={isPrinting}
                  className="w-full sm:w-auto text-sm"
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Print A4
                </Button>
              )}

              {showPOSButton && (
                <Button
                  variant="outline"
                  onClick={downloadPOSImage}
                  disabled={isGeneratingPDF}
                  className="w-full sm:w-auto text-sm"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  POS Receipt
                </Button>
              )}

              {showPDFButton && (
                <Button
                  onClick={() => generatePDF("A4")}
                  disabled={isGeneratingPDF}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  A4 PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
