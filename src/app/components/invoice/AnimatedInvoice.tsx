/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/invoice/AnimatedInvoice.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, Store } from "lucide-react";
import { StoreOrder } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";

interface AnimatedInvoiceProps {
  isOpen: boolean;
  onClose?: () => void;
  orderData: StoreOrder;
  showCloseButton?: boolean;
  autoShow?: boolean;
}

// Format date
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function AnimatedInvoice({
  isOpen,
  onClose,
  orderData,
  showCloseButton = true,
  autoShow = true,
}: AnimatedInvoiceProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [storeTaxRate, setStoreTaxRate] = useState<number | null>(null);
  const [taxLoading, setTaxLoading] = useState(false);

  // Get store slug from order data - works for both admin and customer
  const storeSlug = orderData.stores?.store_slug || "";
  const storeId = orderData.store_id || orderData.stores?.id;

  // Use the original hook that takes storeSlug
  const { storeData, loading: storeLoading } = useInvoiceData({
    storeSlug: storeSlug,
    storeId: storeId,
  });

  // Get discount and additional charges from order data (default to 0 if null/undefined)
  const discountAmount = orderData.discount_amount || 0;
  const additionalCharges = orderData.additional_charges || 0;

  // Fetch store tax rate from store_settings
  useEffect(() => {
    const fetchStoreTaxRate = async () => {
      if (!storeId) return;

      setTaxLoading(true);
      try {
        const settings = await getStoreSettings(storeId);
        if (settings && settings.tax_rate) {
          setStoreTaxRate(settings.tax_rate);
        }
      } catch (error) {
        console.error("Error fetching store tax rate:", error);
      } finally {
        setTaxLoading(false);
      }
    };

    fetchStoreTaxRate();
  }, [storeId]);

  // ✅ FIXED: Get shipping address with proper fallbacks
  const getCustomerName = () => {
    return (
      orderData.shipping_address?.customer_name ||
      orderData.customers?.first_name ||
      "N/A"
    );
  };

  const getCustomerPhone = () => {
    return (
      orderData.shipping_address?.phone || orderData.customers?.phone || "N/A"
    );
  };

  const getCustomerEmail = () => {
    return orderData.customers?.email || "";
  };

  const getCustomerAddress = () => {
    const address = orderData.shipping_address;
    if (!address) return "N/A";

    const addressLine = address.address_line_1 || address.address || "";
    const city = address.city || "";
    const country = address.country || "";

    let fullAddress = "";
    if (addressLine) fullAddress += addressLine;
    if (city) fullAddress += (fullAddress ? ", " : "") + city;
    if (country) fullAddress += (fullAddress ? ", " : "") + country;

    return fullAddress || "N/A";
  };

  // Calculate tax amount - use order tax_amount first, fallback to calculated tax from store_settings
  const calculateTaxAmount = () => {
    if (storeTaxRate && storeTaxRate > 0) {
      const calculatedTax = storeTaxRate;
      return calculatedTax;
    }
    return 0;
  };

  const taxAmount = calculateTaxAmount();

  // Enhance order data with store information and calculated tax
  const enhancedOrderData = storeData
    ? {
        ...orderData,
        stores: {
          ...orderData.stores,
          id: storeData.id,
          store_name: storeData.store_name,
          store_slug: storeData.store_slug,
          business_address:
            storeData.business_address || orderData.stores?.business_address,
          contact_phone:
            storeData.contact_phone || orderData.stores?.contact_phone,
          contact_email:
            storeData.contact_email || orderData.stores?.contact_email,
        },
        tax_amount: taxAmount, // Use calculated tax amount
        discount_amount: discountAmount,
        additional_charges: additionalCharges,
      }
    : {
        ...orderData,
        tax_amount: taxAmount, // Use calculated tax amount
        discount_amount: discountAmount,
        additional_charges: additionalCharges,
      };

  // Animation steps for the typewriter effect
  const animationSteps = [
    "Printing Receipt...",
    "Processing Items...",
    "Calculating Total...",
    "Finalizing...",
    "Receipt Ready!",
  ];

  useEffect(() => {
    if (isOpen && autoShow) {
      setCurrentStep(0);
      // Simulate typing animation steps
      const timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < animationSteps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(timer);
            return prev;
          }
        });
      }, 600);

      return () => clearInterval(timer);
    } else if (isOpen && !autoShow) {
      // Skip animation if autoShow is false
      setCurrentStep(animationSteps.length - 1);
    }
  }, [isOpen, autoShow]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const printWindow = window.open("", "_blank");

      if (printWindow) {
        const customerEmail = getCustomerEmail();

        // Add tax rate note if using calculated tax
        const taxNote = !orderData.tax_amount && storeTaxRate 
          ? `<div class="tax-note" style="font-size: 10px; text-align: center; margin-top: 2px; color: #666;">* Tax calculated at ${storeTaxRate}% rate</div>`
          : '';

        const content = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt #${enhancedOrderData.order_number}</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  margin: 0; 
                  padding: 20px; 
                  color: #000; 
                  background: white;
                  font-size: 14px;
                  line-height: 1.2;
                }
                .receipt { 
                  max-width: 300px; 
                  margin: 0 auto;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 15px;
                  border-bottom: 1px dashed #000;
                  padding-bottom: 10px;
                }
                .business-name {
                  font-weight: bold;
                  font-size: 16px;
                  margin-bottom: 5px;
                }
                .divider {
                  border-top: 1px dashed #000;
                  margin: 10px 0;
                  text-align: center;
                }
                .divider-dots {
                  border-top: 1px dotted #000;
                  margin: 5px 0;
                }
                .items { 
                  width: 100%; 
                }
                .item-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                }
                .item-name {
                  flex: 1;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .item-price {
                  margin-left: 10px;
                }
                .customer-info {
                  text-align: left;
                  margin: 10px 0;
                }
                .summary-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                }
                .total-row {
                  font-weight: bold;
                  border-top: 2px solid #000;
                  margin-top: 10px;
                  padding-top: 5px;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  font-size: 12px;
                }
                @media print {
                  body { margin: 0; padding: 10px; }
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="header">
                  <div class="business-name">${
                    enhancedOrderData.stores?.store_name?.toUpperCase() ||
                    "STORE"
                  }</div>
                  <div>${
                    enhancedOrderData.stores?.business_address ||
                    "Business Address Not Available"
                  }</div>
                  <div>${
                    enhancedOrderData.stores?.contact_phone
                      ? `Tel: ${enhancedOrderData.stores.contact_phone}`
                      : ""
                  }</div>
                  <div>${
                    enhancedOrderData.stores?.contact_email
                      ? `Email: ${enhancedOrderData.stores.contact_email}`
                      : ""
                  }</div>
                </div>
                
                <div class="divider">......</div>

                <div class="customer-info">
                  <div><strong>ORDER #:</strong> ${
                    enhancedOrderData.order_number
                  }</div>
                  <div><strong>Customer:</strong> ${getCustomerName()}</div>
                  <div><strong>Phone:</strong> ${getCustomerPhone()}</div>
                  ${
                    customerEmail
                      ? `<div><strong>Email:</strong> ${customerEmail}</div>`
                      : ""
                  }
                  <div><strong>Address:</strong> ${getCustomerAddress()}</div>
                </div>
                
                <div class="divider">......</div>
                
                <div class="items">
                  ${enhancedOrderData.order_items
                    .map((item) => {
                      const productName =
                        item.product_name.length > 20
                          ? item.product_name.substring(0, 20) + "..."
                          : item.product_name;
                      return `
                      <div class="item-row">
                        <div class="item-name">${productName} x${
                        item.quantity
                      }</div>
                        <div class="item-price">৳${item.total_price.toFixed(
                          2
                        )}</div>
                      </div>
                    `;
                    })
                    .join("")}
                </div>
                
                <div class="divider-dots"></div>
                
                <div class="summary">
                  <div class="summary-row">
                    <span>Sub Total</span>
                    <span>৳${enhancedOrderData.subtotal.toFixed(2)}</span>
                  </div>
                  ${
                    enhancedOrderData.discount_amount > 0
                      ? `
                      <div class="summary-row">
                        <span>Discount</span>
                        <span>-৳${enhancedOrderData.discount_amount.toFixed(
                          2
                        )}</span>
                      </div>
                    `
                      : ""
                  }
                  ${
                    enhancedOrderData.additional_charges > 0
                      ? `
                      <div class="summary-row">
                        <span>Additional Charges</span>
                        <span>+৳${enhancedOrderData.additional_charges.toFixed(
                          2
                        )}</span>
                      </div>
                    `
                      : ""
                  }
                  <div class="summary-row">
                    <span>Tax </span>
                    <span>৳${taxAmount.toFixed(2)}</span>
                  </div>
                  <div class="summary-row">
                    <span>Shipping</span>
                    <span>৳${enhancedOrderData.shipping_fee.toFixed(2)}</span>
                  </div>
                  <div class="summary-row total-row">
                    <span>TOTAL</span>
                    <span>৳${enhancedOrderData.total_amount.toFixed(2)}</span>
                  </div>
                  ${taxNote}
                </div>
                
                <div class="divider">......</div>
                
                <div style="text-align: center; margin: 10px 0;">
                  <div>${
                    enhancedOrderData.payment_method?.toUpperCase() || "CASH"
                  }</div>
                  <div>Date: ${formatDate(enhancedOrderData.created_at)}</div>
                  <div style="margin-top: 5px; font-size: 12px;">Status: ${enhancedOrderData.status.toUpperCase()}</div>
                </div>
                
                <div class="divider-dots"></div>
                
                <div class="footer">
                  <div>Thank you for shopping with us!</div>
                  <div>${
                    enhancedOrderData.stores?.store_slug
                      ? `www.www.sheihoise.com/${enhancedOrderData.stores.store_slug}`
                      : "www.www.sheihoise.com"
                  }</div>
                </div>
              </div>
            </body>
          </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();

        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            setIsPrinting(false);
          }, 500);
        };
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

  const handleDownload = () => {
    handlePrint();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Receipt Card */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-background text-foreground w-full max-w-sm max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-2xl shadow-2xl border border-border"
      >
        {/* Header */}
        <div className="sticky top-0 bg-primary text-primary-foreground p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-bold">Order Receipt</h2>
                <p className="text-primary-foreground/90 text-sm">
                  Order #: {enhancedOrderData.order_number}
                </p>
              </div>
            </div>
            {showCloseButton && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrint}
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
                  disabled={isPrinting}
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 max-h-[calc(90vh-80px)]">
          {/* Loading Animation */}
          <AnimatePresence>
            {currentStep < animationSteps.length - 1 && autoShow && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-16"
              >
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <motion.p
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base font-medium text-muted-foreground font-mono"
                  >
                    {animationSteps[currentStep]}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Receipt Content */}
          <AnimatePresence>
            {currentStep === animationSteps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: autoShow ? 0.3 : 0 }}
                className="font-mono text-sm bg-background"
              >
                {/* Store Header */}
                <div className="text-center mb-4 border-b border-dashed border-border pb-3">
                  <div className="font-bold text-base uppercase tracking-wide text-foreground">
                    {enhancedOrderData.stores?.store_name || "Store"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {enhancedOrderData.stores?.business_address ||
                      "Business Address Not Available"}
                  </div>
                  {enhancedOrderData.stores?.contact_phone && (
                    <div className="text-xs text-muted-foreground">
                      Tel: {enhancedOrderData.stores.contact_phone}
                    </div>
                  )}
                  {enhancedOrderData.stores?.contact_email && (
                    <div className="text-xs text-muted-foreground">
                      Email: {enhancedOrderData.stores.contact_email}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="text-center border-t border-dashed border-border py-1 my-2 text-muted-foreground">
                  ......
                </div>

                {/* Customer Information - Left Aligned */}
                <div className="mb-3 text-xs border-b border-dotted border-border pb-2">
                  <div className="text-foreground">
                    <strong>ORDER #:</strong> {enhancedOrderData.order_number}
                  </div>
                  <div className="text-foreground mt-2">
                    <strong>Customer:</strong> {getCustomerName()}
                  </div>
                  <div className="text-muted-foreground">
                    <strong>Phone:</strong> {getCustomerPhone()}
                  </div>
                  {getCustomerEmail() && (
                    <div className="text-muted-foreground">
                      <strong>Email:</strong> {getCustomerEmail()}
                    </div>
                  )}
                  <div className="text-muted-foreground mt-1">
                    <strong>Address:</strong> {getCustomerAddress()}
                  </div>
                </div>

                {/* Divider */}
                <div className="text-center border-t border-dashed border-border py-1 my-2 text-muted-foreground">
                  ......
                </div>

                {/* Items */}
                <div className="space-y-1 mb-3">
                  {enhancedOrderData.order_items.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex justify-between"
                    >
                      <div className="flex-1 truncate text-foreground">
                        {item.product_name.length > 25
                          ? item.product_name.substring(0, 25) + "..."
                          : item.product_name}
                        {item.quantity > 1 && ` x${item.quantity}`}
                        {item.variant_details?.color && (
                          <div className="text-xs text-muted-foreground">
                            Color: {item.variant_details.color}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 font-medium text-foreground">
                        ৳{item.total_price.toFixed(2)}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-dotted border-border my-2"></div>

                {/* Summary */}
                <div className="space-y-1">
                  <div className="flex justify-between text-foreground">
                    <span>Sub Total</span>
                    <span>৳{enhancedOrderData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>Tax
                    </span>
                    <span>৳{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>Shipping</span>
                    <span>৳{enhancedOrderData.shipping_fee.toFixed(2)}</span>
                  </div>
                  {enhancedOrderData.additional_charges > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Additional Charges</span>
                      <span>
                        ৳{enhancedOrderData.additional_charges.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {enhancedOrderData.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>
                        -৳{enhancedOrderData.discount_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t-2 border-foreground pt-2 mt-2 text-foreground">
                    <span>TOTAL</span>
                    <span>৳{enhancedOrderData.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="text-center border-t border-dashed border-border py-1 my-2 text-muted-foreground">
                  ......
                </div>

                {/* Payment Info */}
                <div className="text-center space-y-1 mb-3">
                  <div className="font-medium text-foreground">
                    {enhancedOrderData.payment_method?.toUpperCase() || "CASH"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date: {formatDate(enhancedOrderData.created_at)}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    Status: {enhancedOrderData.status}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-dotted border-border my-2"></div>
                <div className="text-center text-xs space-y-1 text-muted-foreground">
                  <div>Thank you for shopping with us!</div>
                  <div>
                    {enhancedOrderData.stores?.store_slug
                      ? `www.www.sheihoise.com/${enhancedOrderData.stores.store_slug}`
                      : "www.www.sheihoise.com"}
                  </div>
                </div>

                {/* Print Button */}
                <div className="my-2">
                  <Button
                    onClick={handlePrint}
                    className="w-full font-mono"
                    disabled={isPrinting}
                    variant='greenish'
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    {isPrinting ? "Printing..." : "Print Receipt"}
                  </Button>
                </div>

                {/* Close Button for order-status page */}
                {showCloseButton && (
                  <div className="my-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="w-full font-mono"
                    >
                      Close
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}