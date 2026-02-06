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
import { notification } from "antd";

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

  // ==================== THERMAL PRINTER OPTIMIZED POS RECEIPT ====================
  // This version adds proper spacing and uses monospace alignment for better printing
  const downloadPOSImage = async () => {
    try {
      setIsGeneratingPDF(true);

      // Create iframe with proper 80mm POS printer width
      const iframe = document.createElement("iframe");
      iframe.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 302px;
      height: 3000px;
      border: none;
      visibility: hidden;
    `;
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("Could not create iframe document");

      // Create HTML with proper monospace formatting for thermal printers
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
              font-size: 13px !important;
              line-height: 1.4 !important;
              color: #000000 !important;
              background-color: #ffffff !important;
              padding: 10px;
              width: 302px;
              margin: 0 auto;
              letter-spacing: 0 !important;
            }
            
            /* Container */
            .receipt-container {
              width: 100%;
              max-width: 282px;
              margin: 0 auto;
            }
            
            /* Store title */
            .store-title {
              font-size: 18px !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              text-align: center !important;
              margin: 0 0 3px 0 !important;
              line-height: 1.3 !important;
              display: block !important;
              width: 100% !important;
              letter-spacing: 1px !important;
            }
            
            /* Center text */
            .text-center {
              text-align: center !important;
              display: block !important;
              width: 100% !important;
              margin: 0 auto !important;
            }
            
            /* Regular row */
            .row {
              margin-bottom: 3px !important;
              line-height: 1.4 !important;
              clear: both !important;
            }
            
            /* Small text */
            .small {
              font-size: 12px !important;
            }
            
            /* Bold text */
            .bold {
              font-weight: bold !important;
            }
            
            /* Divider lines */
            .divider {
              border-top: 1px solid #000 !important;
              margin: 5px 0 !important;
              height: 0 !important;
              width: 100% !important;
            }
            
            .divider-thick {
              border-top: 2px solid #000 !important;
              margin: 5px 0 !important;
              height: 0 !important;
              width: 100% !important;
            }
            
            .divider-dashed {
              border-top: 1px dashed #000 !important;
              margin: 5px 0 !important;
              height: 0 !important;
              width: 100% !important;
            }
            
            /* Section header */
            .section-header {
              font-size: 15px !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              text-align: center !important;
              margin: 6px 0 5px 0 !important;
              display: block !important;
              width: 100% !important;
            }
            
            /* Table for items */
            .items-table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 5px 0 !important;
              table-layout: fixed !important;
            }
            
            .items-table thead th {
              font-weight: bold !important;
              padding: 3px 2px !important;
              border-bottom: 1px solid #000 !important;
              font-size: 12px !important;
              text-align: left !important;
            }
            
            .items-table thead th:nth-child(2) {
              text-align: center !important;
            }
            
            .items-table thead th:nth-child(3) {
              text-align: right !important;
            }
            
            .items-table tbody td {
              padding: 3px 2px !important;
              vertical-align: top !important;
              font-size: 12px !important;
            }
            
            .items-table tbody td:nth-child(1) {
              width: 50% !important;
              text-align: left !important;
              word-break: break-word !important;
              white-space: normal !important;
            }
            
            .items-table tbody td:nth-child(2) {
              width: 15% !important;
              text-align: center !important;
            }
            
            .items-table tbody td:nth-child(3) {
              width: 35% !important;
              text-align: right !important;
            }
            
            /* Price breakdown */
            .price-small {
              font-size: 10px !important;
              color: #555 !important;
              margin-top: 1px !important;
            }
            
            /* Summary rows */
            .summary {
              margin: 8px 0 !important;
            }
            
            .summary-row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 3px !important;
              font-size: 13px !important;
              line-height: 1.4 !important;
            }
            
            .summary-row.grand-total {
              font-size: 16px !important;
              font-weight: bold !important;
              margin-top: 5px !important;
              padding-top: 3px !important;
            }
            
            /* Payment info */
            .payment-section {
              margin: 8px 0 !important;
              text-align: center !important;
            }
            
            .payment-section .row {
              text-align: center !important;
            }
            
            /* Footer */
            .footer {
              margin-top: 10px !important;
              text-align: center !important;
              font-size: 11px !important;
            }
            
            /* Ensure no overflow */
            * {
              max-width: 100% !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            
            <!-- Store Header -->
            <div class="store-title">${store.name}</div>
            ${store.address ? `<div class="row text-center small">${store.address}</div>` : ""}
            ${store.phone ? `<div class="row text-center small">Tel: ${store.phone}</div>` : ""}
            
            <div class="divider"></div>
            
            <!-- Invoice Info -->
            <div class="row text-center bold">INVOICE: #${orderId}</div>
            <div class="row text-center small">DATE: ${new Date().toLocaleDateString("en-GB")}</div>
            <div class="row text-center small">TIME: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            
            <div class="divider"></div>
            
            <!-- Customer Info -->
            <div class="row"><span class="bold">CUSTOMER:</span> ${customer.name}</div>
            ${customer.contact ? `<div class="row small">CONTACT: ${customer.contact}</div>` : ""}
            ${customer.address ? `<div class="row small">ADDRESS: ${customer.address}</div>` : ""}
            
            <div class="divider-thick"></div>
            
            <!-- Items Header -->
            <div class="section-header">ITEMS</div>
            
            <!-- Items Table -->
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
                        ${currencyIcon}${itemTotal}
                        <div class="price-small">${p.qty} × ${currencyIcon}${unitPrice}</div>
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
            
            <div class="divider-thick"></div>
            
            <!-- Summary -->
            <div class="summary">
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
              
              <div class="divider-dashed"></div>
              
              <div class="summary-row grand-total">
                <span>TOTAL:</span>
                <span>${currencyIcon}${totalDue.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="divider-thick"></div>
            
            <!-- Payment Info -->
            <div class="payment-section">
              <div class="row bold">PAYMENT: ${paymentMethod === "cod" ? "CASH" : paymentMethod.toUpperCase()}</div>
              <div class="row">STATUS: ${paymentStatus.toUpperCase()}</div>
              ${notes ? `<div class="row small" style="margin-top: 5px;">NOTE: ${notes}</div>` : ""}
            </div>
            
            <div class="divider"></div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="row">Thank you for your business!</div>
              <div class="row">Keep this receipt for your records</div>
              <div class="row small" style="margin-top: 3px;">Computer Generated Receipt</div>
            </div>
            
          </div>
        </body>
      </html>
    `);
      doc.close();

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 600));

      const body = doc.body;
      if (!body) throw new Error("No body element found");

      // Calculate height
      const contentHeight = body.scrollHeight;
      iframe.style.height = `${contentHeight + 40}px`;

      // Wait a bit more for final rendering
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Generate high-quality image
      const canvas = await html2canvas(body, {
        scale: 3, // Higher quality for better printing
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: 302,
        height: contentHeight,
        windowWidth: 302,
        windowHeight: contentHeight,
        onclone: (clonedDoc) => {
          // Force proper rendering
          const allElements = clonedDoc.querySelectorAll("*");
          allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.color = "#000000";
              el.style.backgroundColor = "#ffffff";
            }
          });

          // Add extra style enforcement
          const style = clonedDoc.createElement("style");
          style.textContent = `
          * {
            color: #000000 !important;
            background-color: #ffffff !important;
            font-family: 'Courier New', Courier, monospace !important;
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
        `;
          clonedDoc.head.appendChild(style);
        },
      });

      // Download
      const imageUrl = canvas.toDataURL("image/png", 1.0); // Maximum quality
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `pos_receipt_${orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      document.body.removeChild(iframe);

      notification.success({
        message: "POS Receipt Downloaded",
        description: "High-quality receipt optimized for thermal printers",
      });
    } catch (error) {
      console.error("Error generating POS receipt:", error);
      notification.error({
        message: "Download Failed",
        description: "Could not generate POS receipt. Please try again.",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Keep the wrapText helper function
  // const wrapText = (
  //   context: CanvasRenderingContext2D,
  //   text: string,
  //   maxWidth: number,
  //   fontSize: number,
  // ): string[] => {
  //   context.font = `${fontSize}px "Courier New", monospace`;
  //   const words = text.split(" ");
  //   const lines = [];
  //   let currentLine = words[0];

  //   for (let i = 1; i < words.length; i++) {
  //     const word = words[i];
  //     const width = context.measureText(currentLine + " " + word).width;
  //     if (width < maxWidth) {
  //       currentLine += " " + word;
  //     } else {
  //       lines.push(currentLine);
  //       currentLine = word;
  //     }
  //   }
  //   lines.push(currentLine);
  //   return lines;
  // };

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
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg flex-shrink-0">
                <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                    Invoice #{orderId}
                  </h2>
                  <button
                    onClick={copyInvoiceId}
                    className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
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
                  <span>Payment: {paymentStatus}</span>
                  <span>Order: {orderStatus}</span>
                  <span className="hidden sm:inline">Currency: {currency}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-red-500 rounded-lg transition-colors flex-shrink-0 ml-2"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-2 sm:p-6">
            <div
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

              {/* Footer */}
              <div className="mt-8 sm:mt-12 pt-4 border-t text-center text-xs sm:text-sm text-gray-500 no-break">
                <p>Thank you • Computer generated invoice • {store.name}</p>
              </div>
            </div>
          </div>

          {/* Actions - Responsive */}
          <div className="border-t p-3 sm:p-6 flex flex-col sm:flex-row flex-wrap gap-3 justify-between items-stretch sm:items-center no-print">
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left order-2 sm:order-1">
              Last updated: {invoiceDate} {invoiceTime}
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
