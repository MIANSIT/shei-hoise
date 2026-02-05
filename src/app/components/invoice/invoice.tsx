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

  const invoiceRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLDivElement>(null);

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

  // ==================== PRINT A4 ====================
  const printInvoice = async () => {
    setIsPrinting(true);
    try {
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

      // Get only necessary styles for printing
      const printStyles = `
        <style>
          /* PRINT STYLES */
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
            
            /* Header alignment fix */
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
            
            /* Table fixes */
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
            
            /* Column widths */
            .col-item { width: 45%; }
            .col-qty { width: 15%; text-align: center; }
            .col-price { width: 20%; text-align: right; }
            .col-total { width: 20%; text-align: right; }
            
            /* Prevent page breaks */
            .no-break {
              page-break-inside: avoid;
            }
            
            /* Hide non-print elements */
            .no-print, button, .print-button, .modal-header {
              display: none !important;
            }
            
            /* Ensure everything fits */
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
          
          /* Screen styles for iframe preview */
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

      // Create clean HTML for printing
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
              <p><strong>Date:</strong> ${invoiceDate}</p>
              <p><strong>Time:</strong> ${invoiceTime}</p>
              <p><strong>Payment Status:</strong> ${paymentStatus}</p>
              <p><strong>Order Status:</strong> ${orderStatus}</p>
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
                  (product, index) => `
                <tr key="${index}">
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
          
          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            <p>Thank you • Computer generated invoice • ${store.name}</p>
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
                    if (document.body.contains(iframe)) {
                      document.body.removeChild(iframe);
                    }
                  }, 500);
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Clean up iframe if print dialog is cancelled
      win.addEventListener("afterprint", () => {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          setIsPrinting(false);
        }, 100);
      });
    } catch (err) {
      console.error("Print error:", err);
      setIsPrinting(false);
      alert("Failed to print invoice. Please try again.");
    }
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
    } catch (error) {
      console.error(error);
      alert("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ==================== POS PNG DOWNLOAD ====================
  const downloadPOSImage = async () => {
    try {
      setIsGeneratingPDF(true);

      // Create an iframe
      const iframe = document.createElement("iframe");
      iframe.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 384px;
      height: 2000px;
      border: none;
      visibility: hidden;
    `;
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("Could not create iframe document");

      // Create compact HTML
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
              font-size: 100%;
              font: inherit;
              vertical-align: baseline;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 24px !important;
              line-height: 1 !important;
              color: #000000 !important;
              background-color: #ffffff !important;
              padding: 15px;
              width: 384px;
              margin: 0 auto;
            }
            
            /* Title size */
            .store-title {
              font-size: 36px !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              text-align: center !important;
              margin-bottom: 5px !important;
              line-height: 1.1 !important;
            }
            
            /* Headers */
            .section-header {
              font-size: 28px !important;
              font-weight: bold !important;
              text-align: center !important;
              margin: 8px 0 !important;
            }
            
            /* Compact table */
            .items-table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 5px 0 !important;
              font-size: 24px !important;
            }
            
            .items-table th {
              font-weight: bold !important;
              text-align: left !important;
              padding: 3px 2px !important;
              border-bottom: 1px solid #000 !important;
            }
            
            .items-table td {
              padding: 3px 2px !important;
              vertical-align: top !important;
            }
            
            /* Product name wrapping */
            .product-name {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              hyphens: auto !important;
              white-space: normal !important;
              max-width: 220px !important;
            }
            
            /* Alignments */
            .text-left { text-align: left !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            
            /* Compact spacing */
            .compact-row {
              margin-bottom: 3px !important;
            }
            
            .mb-1 { margin-bottom: 4px !important; }
            .mb-2 { margin-bottom: 8px !important; }
            .mt-1 { margin-top: 4px !important; }
            .mt-2 { margin-top: 8px !important; }
            
            /* Divider line */
            .divider {
              display: block !important;
              height: 1px !important;
              background-color: #000 !important;
              margin: 5px 0 !important;
            }
            
            .divider-thick {
              display: block !important;
              height: 2px !important;
              background-color: #000 !important;
              margin: 5px 0 !important;
            }
            
            /* Totals section - compact */
            .totals-section {
              margin-top: 8px !important;
            }
            
            .total-row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 2px !important;
              font-size: 26px !important;
            }
            
            .grand-total {
              font-size: 32px !important;
              font-weight: bold !important;
              margin-top: 5px !important;
            }
            
            /* Payment info - compact */
            .payment-info {
              margin-top: 8px !important;
              font-size: 24px !important;
              text-align: center !important;
            }
            
            /* Footer - compact */
            .footer {
              margin-top: 10px !important;
              text-align: center !important;
              font-size: 20px !important;
            }
          </style>
        </head>
        <body>
          <!-- Store Info -->
          <div class="text-center mb-1">
            <div class="store-title">${store.name}</div>
            ${store.address ? `<div class="compact-row">${store.address}</div>` : ""}
            ${store.phone ? `<div class="compact-row">Tel: ${store.phone}</div>` : ""}
          </div>
          
          <div class="divider"></div>
          
          <!-- Invoice Info -->
          <div class="text-center mb-1">
            <div class="compact-row"><strong>INVOICE:</strong> #${orderId}</div>
            <div class="compact-row"><strong>DATE:</strong> ${new Date().toLocaleDateString("en-GB")}</div>
            <div class="compact-row"><strong>TIME:</strong> ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          
          <div class="divider"></div>
          
          <!-- Customer Info -->
          <div class="mb-1">
            <div class="compact-row"><strong>CUSTOMER:</strong> ${customer.name}</div>
            ${customer.contact ? `<div class="compact-row"><strong>CONTACT:</strong> ${customer.contact}</div>` : ""}
            ${customer.address ? `<div class="compact-row"><strong>ADDRESS:</strong> ${customer.address}</div>` : ""}
          </div>
          
          <div class="divider-thick"></div>
          
          <!-- Items Header -->
          <div class="section-header">ITEMS</div>
          
          <!-- Compact Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="text-left" style="width: 50%;">Item</th>
                <th class="text-center" style="width: 15%;">Qty</th>
                <th class="text-right" style="width: 35%;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map((p) => {
                  return `
                  <tr>
                    <td class="text-left product-name">${p.name}</td>
                    <td class="text-center">${p.qty}</td>
                    <td class="text-right">
                      ${currencyIcon}${(p.qty * p.price).toFixed(2)}
                      <div style="font-size: 20px; color: #666;">
                        (${p.qty} × ${currencyIcon}${p.price.toFixed(2)})
                      </div>
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
          
          <div class="divider-thick"></div>
          
          <!-- Compact Totals -->
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${currencyIcon}${subtotal.toFixed(2)}</span>
            </div>
            ${
              discountAmount > 0
                ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-${currencyIcon}${discountAmount.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            ${
              deliveryCharge > 0
                ? `
              <div class="total-row">
                <span>Delivery:</span>
                <span>${currencyIcon}${deliveryCharge.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            ${
              taxAmount > 0
                ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>${currencyIcon}${taxAmount.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            
            <div class="divider"></div>
            
            <div class="total-row grand-total">
              <span>TOTAL :</span>
              <span>${currencyIcon}${totalDue.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="divider-thick"></div>
          
          <!-- Payment Info -->
          <div class="payment-info">
            <div class="compact-row">
              <strong>PAYMENT:</strong> ${paymentMethod === "cod" ? "CASH" : paymentMethod.toUpperCase()}
            </div>
            <div class="compact-row">
              <strong>STATUS:</strong> ${paymentStatus}
            </div>
            ${notes ? `<div class="compact-row mt-1"><strong>NOTES:</strong> ${notes}</div>` : ""}
          </div>
          
          <div class="divider"></div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="compact-row">Thank you for your business!</div>
            <div class="compact-row">Keep this receipt for returns</div>
            <div style="font-size: 18px; margin-top: 3px;">Computer Generated Receipt</div>
          </div>
        </body>
      </html>
    `);
      doc.close();

      // Wait for iframe to load
      await new Promise((resolve) => setTimeout(resolve, 300));

      const body = doc.body;
      if (!body) throw new Error("No body element found");

      // Calculate dynamic height
      const contentHeight = body.scrollHeight;
      iframe.style.height = `${contentHeight + 50}px`;

      const canvas = await html2canvas(body, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: false,
        allowTaint: false,
        foreignObjectRendering: true,
        imageTimeout: 5000,
        removeContainer: true,
        width: body.scrollWidth,
        height: contentHeight,
        windowWidth: body.scrollWidth,
        windowHeight: contentHeight,
        onclone: (clonedDoc) => {
          // Force all text to be black and visible
          const allElements = clonedDoc.querySelectorAll("*");
          allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.color = "#000000 !important";
              el.style.backgroundColor = "#ffffff !important";
              el.style.visibility = "visible !important";
              el.style.opacity = "1 !important";
            }
          });

          // Force table layout
          const tables = clonedDoc.querySelectorAll("table");
          tables.forEach((table) => {
            if (table instanceof HTMLElement) {
              table.style.borderCollapse = "collapse !important";
              table.style.width = "100% !important";
              table.style.display = "table !important";
            }
          });

          // Add extra style injection
          const style = clonedDoc.createElement("style");
          style.textContent = `
          * {
            color: #000000 !important;
            background-color: #ffffff !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 24px !important;
            line-height: 1 !important;
          }
          
          body {
            padding: 15px !important;
            width: 384px !important;
          }
          
          .store-title {
            font-size: 36px !important;
            font-weight: bold !important;
          }
          
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          
          th, td {
            padding: 3px 2px !important;
            border: none !important;
          }
          
          .product-name {
            white-space: normal !important;
            word-break: break-word !important;
          }
          
          .total-row {
            display: flex !important;
            justify-content: space-between !important;
          }
        `;
          clonedDoc.head.appendChild(style);
        },
      });

      // Download the image
      const imageUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `pos_receipt_${orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      document.body.removeChild(iframe);
    } catch (error) {
      console.error("Error generating POS image:", error);

      // Fallback: Create simple canvas with compact layout
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Could not get canvas context");

        // Use compact dimensions
        canvas.width = 600;
        canvas.height = 1500;

        // Fill with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set text properties
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "top";

        let y = 30;
        const margin = 25;
        const maxWidth = canvas.width - margin * 2;

        // Helper functions
        const drawCentered = (
          text: string,
          fontSize: number,
          isBold = false,
        ) => {
          ctx.font = `${isBold ? "bold" : "normal"} ${fontSize}px "Courier New", monospace`;
          const textWidth = ctx.measureText(text).width;
          const x = (canvas.width - textWidth) / 2;
          ctx.fillText(text, x, y);
          y += fontSize + (fontSize > 30 ? 10 : 5);
        };

        const drawLeft = (text: string, fontSize: number) => {
          ctx.font = `${fontSize}px "Courier New", monospace`;
          ctx.fillText(text, margin, y);
          y += fontSize + 3;
        };

        const drawJustified = (
          leftText: string,
          rightText: string,
          fontSize: number,
        ) => {
          ctx.font = `${fontSize}px "Courier New", monospace`;
          ctx.fillText(leftText, margin, y);
          const rightTextWidth = ctx.measureText(rightText).width;
          ctx.fillText(rightText, canvas.width - margin - rightTextWidth, y);
          y += fontSize + 3;
        };

        const drawLine = () => {
          ctx.fillRect(margin, y, maxWidth, 1);
          y += 8;
        };

        const drawThickLine = () => {
          ctx.fillRect(margin, y, maxWidth, 2);
          y += 10;
        };

        // Draw compact receipt
        drawCentered(store.name.toUpperCase(), 36, true);
        if (store.address) drawCentered(store.address, 24);
        if (store.phone) drawCentered(`Tel: ${store.phone}`, 24);

        drawLine();

        drawCentered(`INVOICE: #${orderId}`, 28, true);
        drawCentered(`DATE: ${new Date().toLocaleDateString("en-GB")}`, 24);
        drawCentered(
          `TIME: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          24,
        );

        drawLine();

        drawLeft(`CUSTOMER: ${customer.name}`, 26);
        if (customer.contact) drawLeft(`CONTACT: ${customer.contact}`, 24);
        if (customer.address) drawLeft(`ADDRESS: ${customer.address}`, 24);

        drawThickLine();

        drawCentered("ITEMS", 30, true);

        // Draw items table
        y += 5;
        const col1 = margin;
        const col3 = margin + 350; // Qty column width

        // Table headers
        ctx.font = `bold 26px "Courier New", monospace`;
        ctx.fillText("Item", col1, y);
        ctx.fillText("Qty", col3, y);
        ctx.fillText("Price", canvas.width - margin - 100, y);
        y += 30;

        // Draw divider under headers
        ctx.fillRect(margin, y - 5, maxWidth, 1);

        // Products
        ctx.font = `24px "Courier New", monospace`;
        products.forEach((p) => {
          const productTotal = (p.qty * p.price).toFixed(2);

          // Draw product name (with wrapping if needed)
          const nameLines = wrapText(ctx, p.name, 240, 24);
          nameLines.forEach((line, idx) => {
            ctx.fillText(line, col1, y);
            if (idx === 0) {
              // Qty and price on first line
              ctx.fillText(`${p.qty}`, col3, y);
              ctx.fillText(
                `${currencyIcon}${productTotal}`,
                canvas.width - margin - 100,
                y,
              );
            }
            y += 25;
          });

          // Small price breakdown on next line
          ctx.font = `20px "Courier New", monospace`;
          ctx.fillText(
            `(${p.qty} × ${currencyIcon}${p.price.toFixed(2)})`,
            col1 + 10,
            y,
          );
          y += 22;
          ctx.font = `24px "Courier New", monospace`;
        });

        drawThickLine();

        // Totals - compact
        drawJustified("Subtotal:", `${currencyIcon}${subtotal.toFixed(2)}`, 26);
        if (discountAmount > 0)
          drawJustified(
            "Discount:",
            `-${currencyIcon}${discountAmount.toFixed(2)}`,
            26,
          );
        if (deliveryCharge > 0)
          drawJustified(
            "Delivery:",
            `${currencyIcon}${deliveryCharge.toFixed(2)}`,
            26,
          );
        if (taxAmount > 0)
          drawJustified("Tax:", `${currencyIcon}${taxAmount.toFixed(2)}`, 26);

        drawLine();

        // Grand total
        ctx.font = `bold 32px "Courier New", monospace`;
        drawJustified("TOTAL :", `${currencyIcon}${totalDue.toFixed(2)}`, 32);
        ctx.font = `24px "Courier New", monospace`;

        drawThickLine();

        // Payment info
        drawCentered(
          `PAYMENT: ${paymentMethod === "cod" ? "CASH" : paymentMethod.toUpperCase()}`,
          26,
          true,
        );
        drawCentered(`STATUS: ${paymentStatus}`, 24);
        if (notes) drawCentered(`NOTES: ${notes}`, 22);

        drawLine();

        // Footer
        drawCentered("Thank you for your business!", 24);
        drawCentered("Keep this receipt for returns", 22);
        drawCentered("Computer Generated Receipt", 20);

        // Download
        const imageUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `pos_receipt_${orderId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error("Canvas fallback also failed:", fallbackError);
        alert("Failed to generate POS receipt. Please try again.");
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Keep the wrapText helper function
  const wrapText = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    fontSize: number,
  ): string[] => {
    context.font = `${fontSize}px "Courier New", monospace`;
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = context.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh]">
          {/* Header */}
          <div className="border-b p-6 flex items-center justify-between no-print">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Invoice #{orderId}
                  </h2>
                  <button
                    onClick={copyInvoiceId}
                    className="p-1 hover:bg-gray-100  rounded transition-colors"
                    title="Copy invoice number"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span>Payment: {paymentStatus}</span>
                  <span>Order: {orderStatus}</span>
                  <span>Currency: {currency}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-6">
            <div
              ref={invoiceRef}
              className="bg-background p-8 rounded-lg border max-w-4xl mx-auto"
              style={{
                boxSizing: "border-box",
                maxWidth: "100%",
              }}
            >
              {/* Header with proper alignment */}
              <div className="flex justify-between items-start mb-8 invoice-header">
                {/* Store Info - LEFT ALIGNED */}
                <div className="store-info">
                  <h1 className="text-3xl font-bold text-blue-600 mb-2">
                    {store.name}
                  </h1>
                  {store.address && (
                    <p className="text-gray-600 dark:text-gray-400 wrap-break-word mb-1">
                      📍 {store.address}
                    </p>
                  )}
                  {store.phone && (
                    <p className="text-gray-600 dark:text-gray-400 wrap-break-word mb-1">
                      📞 {store.phone}
                    </p>
                  )}
                  {store.email && (
                    <p className="text-gray-600 dark:text-gray-400 wrap-break-word">
                      ✉️ {store.email}
                    </p>
                  )}
                </div>

                {/* Invoice Info - RIGHT ALIGNED */}
                <div className="text-right invoice-info">
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">
                    INVOICE
                  </h2>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-semibold">Invoice #:</span>{" "}
                      {orderId}
                    </p>
                    <p>
                      <span className="font-semibold">Date:</span> {invoiceDate}
                    </p>
                    <p>
                      <span className="font-semibold">Time:</span> {invoiceTime}
                    </p>
                    <p>
                      <span className="font-semibold">Payment Status:</span>{" "}
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {paymentStatus}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Order Status:</span>{" "}
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {orderStatus}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-8 p-4 bg-blue-50 rounded-lg no-break">
                <h3 className="font-bold text-lg mb-2 text-blue-700">
                  Bill To:
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-white dark:text-black">
                      {customer.name}
                    </p>
                    {customer.address && (
                      <p className="text-white dark:text-black wrap-break-word">
                        {customer.address}
                      </p>
                    )}
                  </div>
                  <div>
                    {customer.contact && (
                      <p className="text-white dark:text-black wrap-break-word">
                        📞 {customer.contact}
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-gray-600 dark:text-gray-400 wrap-break-word">
                        ✉️ {customer.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Table with fixed width */}
              <div className="mb-8 no-break">
                <table className="w-full" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left p-3 font-semibold col-item">
                        Item
                      </th>
                      <th className="text-center p-3 font-semibold col-qty">
                        Quantity
                      </th>
                      <th className="text-right p-3 font-semibold col-price">
                        Unit Price
                      </th>
                      <th className="text-right p-3 font-semibold col-total">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={index} className="border-b ">
                        <td className="p-3 wrap-break-word">{product.name}</td>
                        <td className="p-3 text-center">{product.qty}</td>
                        <td className="p-3 text-right">
                          {currencyIcon}
                          {product.price.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {currencyIcon}
                          {(product.qty * product.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary - Right aligned */}
              <div className="ml-auto max-w-sm no-break summary">
                <div className="space-y-2">
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
                    <div className="flex justify-between text-lg font-bold text-blue-600 grand-total">
                      <span>GRAND TOTAL:</span>
                      <span>
                        {currencyIcon}
                        {totalDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method & Notes */}
              {(paymentMethod || notes) && (
                <div className="mt-8 grid grid-cols-2 gap-8 no-break">
                  {paymentMethod && paymentMethod !== "N/A" && (
                    <div>
                      <h4 className="font-bold mb-2">Payment Method:</h4>
                      <p className="text-gray-700 dark:text-gray-300 wrap-break-word">
                        {paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : paymentMethod.toUpperCase()}
                      </p>
                    </div>
                  )}
                  {notes && (
                    <div>
                      <h4 className="font-bold mb-2">Notes:</h4>
                      <p className="text-gray-700 dark:text-gray-300 wrap-break-word">{notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer for print */}
              <div className="mt-12 pt-4 border-t text-center text-sm text-gray-500 no-break">
                <p>Thank you • Computer generated invoice • {store.name}</p>
              </div>
            </div>
          </div>

          {/* Actions - Hidden when printing */}
          <div className="border-t p-6 flex flex-wrap gap-3 justify-between items-center no-print">
            <div className="text-sm text-gray-500">
              Last updated: {invoiceDate} {invoiceTime}
            </div>
            <div className="flex flex-wrap gap-3">
              {showPrintButton && (
                <Button
                  variant="outline"
                  onClick={printInvoice}
                  disabled={isPrinting}
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
                  className="bg-blue-600 hover:bg-blue-700"
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

      {/* Hidden POS layout for html2canvas */}
      <div
        ref={posRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "300px",
          display: "block",
          backgroundColor: "#fff",
          color: "#000",
          fontFamily: "sans-serif",
          fontSize: "12px",
        }}
      >
        {/* Store Header */}
        <h3
          style={{
            textAlign: "center",
            margin: "0 0 4px 0",
            fontWeight: "bold",
          }}
        >
          {store.name}
        </h3>
        {store.address && (
          <p style={{ textAlign: "center", margin: "0 0 2px 0" }}>
            {store.address}
          </p>
        )}
        {store.phone && (
          <p style={{ textAlign: "center", margin: "0 0 4px 0" }}>
            Tel: {store.phone}
          </p>
        )}

        <hr style={{ border: "0.5px solid #000", margin: "4px 0" }} />

        {/* Invoice Info */}
        <p style={{ textAlign: "center", margin: "2px 0" }}>
          Invoice #{orderId}
        </p>
        <p style={{ textAlign: "center", margin: "2px 0" }}>
          {new Date().toLocaleDateString("en-GB")}{" "}
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <hr style={{ border: "0.5px solid #000", margin: "4px 0" }} />

        {/* Customer Info */}
        <p style={{ margin: "2px 0" }}>Customer: {customer.name}</p>
        {customer.contact && (
          <p style={{ margin: "2px 0" }}>Tel: {customer.contact}</p>
        )}
        {customer.address && (
          <p style={{ margin: "2px 0" }}>{customer.address}</p>
        )}

        <hr style={{ border: "0.5px solid #000", margin: "4px 0" }} />

        {/* Products Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "4px",
            color: "#000",
          }}
        >
          <thead>
            <tr>
              <th
                style={{ textAlign: "left", borderBottom: "0.5px solid #000" }}
              >
                Item
              </th>
              <th
                style={{
                  textAlign: "center",
                  borderBottom: "0.5px solid #000",
                }}
              >
                Qty
              </th>
              <th
                style={{ textAlign: "right", borderBottom: "0.5px solid #000" }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: "2px 0" }}>{p.name}</td>
                <td style={{ textAlign: "center" }}>{p.qty}</td>
                <td style={{ textAlign: "right" }}>
                  {(p.qty * p.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ border: "0.5px solid #000", margin: "4px 0" }} />

        {/* Totals */}
        <p style={{ textAlign: "right", fontWeight: "bold", margin: "2px 0" }}>
          Total: {totalDue.toFixed(2)}
        </p>

        {/* Payment & Notes */}
        {paymentMethod && (
          <p style={{ textAlign: "center", margin: "2px 0" }}>
            Payment:{" "}
            {paymentMethod === "cod" ? "CASH" : paymentMethod.toUpperCase()}
          </p>
        )}
        {notes && (
          <p
            style={{
              textAlign: "center",
              fontStyle: "italic",
              margin: "2px 0",
            }}
          >
            Notes: {notes}
          </p>
        )}

        <hr style={{ border: "0.5px solid #000", margin: "4px 0" }} />

        {/* Footer */}
        <p style={{ textAlign: "center", margin: "2px 0" }}>
          Thank you for your business!
        </p>
        <p style={{ textAlign: "center", margin: "2px 0", fontSize: "10px" }}>
          Computer generated receipt
        </p>
      </div>
    </>
  );
}
