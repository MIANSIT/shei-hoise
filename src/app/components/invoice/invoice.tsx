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
  } = props;

  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingPOS, setIsGeneratingPOS] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const currencyIcon = CURRENCY_ICONS[currency] || "৳";
  const invoiceDate = new Date().toLocaleDateString("en-GB");
  const invoiceTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Copy invoice ID to clipboard
  const copyInvoiceId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
  };

  // ==================== PRINT FUNCTIONS ====================
  const printInvoice = async () => {
    setIsPrinting(true);
    try {
      await printA4();
    } catch (error) {
      console.error("Print error:", error);
      alert("Failed to print. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

  const printA4 = () => {
    return new Promise<void>((resolve) => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow pop-ups to print");
        resolve();
        return;
      }

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice #${orderId}</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 20mm;
                }
                
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.4;
                  color: #333;
                  max-width: 210mm;
                  margin: 0 auto;
                }
                
                .invoice-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 20px;
                  padding-bottom: 15px;
                  border-bottom: 2px solid #1d4ed8;
                }
                
                .store-info h1 {
                  color: #1d4ed8;
                  margin: 0 0 10px 0;
                  font-size: 24px;
                }
                
                .invoice-meta {
                  text-align: right;
                }
                
                .invoice-meta h2 {
                  color: #1d4ed8;
                  margin: 0 0 10px 0;
                  font-size: 20px;
                }
                
                .customer-section {
                  margin: 20px 0;
                  padding: 15px;
                  background: #f8fafc;
                  border-radius: 8px;
                }
                
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                }
                
                th {
                  background: #1d4ed8;
                  color: white;
                  padding: 10px;
                  text-align: left;
                  font-weight: 600;
                }
                
                td {
                  padding: 10px;
                  border-bottom: 1px solid #e2e8f0;
                }
                
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .summary {
                  margin-top: 30px;
                  width: 300px;
                  margin-left: auto;
                }
                
                .summary-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                }
                
                .grand-total {
                  font-size: 18px;
                  font-weight: bold;
                  color: #1d4ed8;
                  border-top: 2px solid #1d4ed8;
                  padding-top: 10px;
                  margin-top: 10px;
                }
                
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #e2e8f0;
                  text-align: center;
                  color: #64748b;
                  font-size: 12px;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="invoice-header">
                <div class="store-info">
                  <h1>${store.name}</h1>
                  ${store.address ? `<p>${store.address}</p>` : ""}
                  ${store.phone ? `<p>📞 ${store.phone}</p>` : ""}
                  ${store.email ? `<p>✉️ ${store.email}</p>` : ""}
                </div>
                <div class="invoice-meta">
                  <h2>TAX INVOICE</h2>
                  <p><strong>Invoice #:</strong> ${orderId}</p>
                  <p><strong>Date:</strong> ${invoiceDate}</p>
                  <p><strong>Time:</strong> ${invoiceTime}</p>
                  <p><strong>Payment Status:</strong> ${paymentStatus}</p>
                  <p><strong>Order Status:</strong> ${orderStatus}</p>
                </div>
              </div>
              
              <div class="customer-section">
                <h3>Bill To:</h3>
                <p><strong>${customer.name}</strong></p>
                ${customer.address ? `<p>${customer.address}</p>` : ""}
                ${customer.contact ? `<p>📞 ${customer.contact}</p>` : ""}
                ${customer.email ? `<p>✉️ ${customer.email}</p>` : ""}
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
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
                      <td class="text-right">${currencyIcon}${(product.qty * product.price).toFixed(2)}</td>
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
                paymentMethod && paymentMethod !== "N/A"
                  ? `
              <div style="margin-top: 20px;">
                <strong>Payment Method:</strong> ${paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod.toUpperCase()}
              </div>
              `
                  : ""
              }
              
              ${
                notes
                  ? `
              <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 6px;">
                <strong>Notes:</strong>
                <p style="margin-top: 5px;">${notes}</p>
              </div>
              `
                  : ""
              }
              
              <div class="footer">
                <p>Thank you for your business!</p>
                <p>Generated on ${invoiceDate} at ${invoiceTime}</p>
                <p>This is a computer-generated invoice. No signature required.</p>
              </div>
            </div>
            
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 100);
                }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();

      printWindow.onbeforeunload = () => {
        resolve();
      };
    });
  };

  // ==================== PDF GENERATION ====================
  const generatePDF = async (type: "A4" | "POS") => {
    if (type === "A4") {
      setIsGeneratingPDF(true);
    } else {
      setIsGeneratingPOS(true);
    }

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
          type: type, // Add type parameter
        }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "A4"
          ? `invoice_${orderId}_${new Date().getTime()}.pdf`
          : `pos_receipt_${orderId}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      if (type === "A4") {
        setIsGeneratingPDF(false);
      } else {
        setIsGeneratingPOS(false);
      }
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh]">
          {/* Header */}
          <div className="border-b p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Invoice #{orderId}
                  </h2>
                  <button
                    onClick={copyInvoiceId}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy invoice number"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Payment: {paymentStatus}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Order: {orderStatus}
                  </span>
                  <span className="text-sm text-gray-600">
                    Currency: {currency}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-6">
            <div
              ref={invoiceRef}
              className="bg-white p-8 rounded-lg border max-w-4xl mx-auto"
            >
              {/* Store & Invoice Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-blue-600 mb-2">
                    {store.name}
                  </h1>
                  {store.address && (
                    <p className="text-gray-600 mb-1">📍 {store.address}</p>
                  )}
                  {store.phone && (
                    <p className="text-gray-600 mb-1">📞 {store.phone}</p>
                  )}
                  {store.email && (
                    <p className="text-gray-600">✉️ {store.email}</p>
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">
                    TAX INVOICE
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
              <div className="mb-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-blue-700">
                  Bill To:
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    {customer.address && (
                      <p className="text-gray-600">{customer.address}</p>
                    )}
                  </div>
                  <div>
                    {customer.contact && (
                      <p className="text-gray-600">📞 {customer.contact}</p>
                    )}
                    {customer.email && (
                      <p className="text-gray-600">✉️ {customer.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left p-3 font-semibold">Item</th>
                      <th className="text-center p-3 font-semibold">
                        Quantity
                      </th>
                      <th className="text-right p-3 font-semibold">
                        Unit Price
                      </th>
                      <th className="text-right p-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">{product.name}</td>
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

              {/* Summary */}
              <div className="ml-auto max-w-xs">
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
                    <div className="flex justify-between text-lg font-bold text-blue-600">
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
                <div className="mt-8 grid grid-cols-2 gap-8">
                  {paymentMethod && paymentMethod !== "N/A" && (
                    <div>
                      <h4 className="font-bold mb-2">Payment Method:</h4>
                      <p className="text-gray-700">
                        {paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : paymentMethod.toUpperCase()}
                      </p>
                    </div>
                  )}
                  {notes && (
                    <div>
                      <h4 className="font-bold mb-2">Notes:</h4>
                      <p className="text-gray-700">{notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t p-6">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="text-sm text-gray-500">
                Last updated: {invoiceDate} {invoiceTime}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={printInvoice}
                  disabled={isPrinting}
                  className="min-w-30"
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Print A4
                </Button>

                <Button
                  variant="outline"
                  onClick={() => generatePDF("POS")}
                  disabled={isGeneratingPOS || isGeneratingPDF}
                  className="min-w-32.5"
                >
                  {isGeneratingPOS ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  POS Receipt
                </Button>

                <Button
                  onClick={() => generatePDF("A4")}
                  disabled={isGeneratingPDF || isGeneratingPOS}
                  className="min-w-37.5 bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  A4 PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
