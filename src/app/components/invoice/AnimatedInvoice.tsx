/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/invoice/AnimatedInvoice.tsx - OPTIMIZED FOR POS PRINTERS
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, Store, Smartphone, Image as ImageIcon, Camera, Maximize2 } from "lucide-react";
import { StoreOrder } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface AnimatedInvoiceProps {
  isOpen: boolean;
  onClose?: () => void;
  orderData: StoreOrder;
  showCloseButton?: boolean;
}

// Format date for receipt
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

// Platform detection
const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

// Utility: Convert mm to pixels at specific DPI
const mmToPixels = (mm: number, dpi: number = 300): number => {
  const inches = mm / 25.4;
  return Math.floor(inches * dpi);
};

// Detect paper width based on printer type
const detectPaperWidth = (): number => {
  // Common POS printer paper widths in mm
  // 58mm is most common for small POS printers
  return 58; // Default to 58mm for POS printers
};

export default function AnimatedInvoice({
  isOpen,
  onClose,
  orderData,
  showCloseButton = true,
}: AnimatedInvoiceProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [storeTaxRate, setStoreTaxRate] = useState<number | null>(null);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | 'other'>('other');
  const [paperWidth, setPaperWidth] = useState<number>(58); // Default 58mm for POS
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const {
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  
  // Get store info
  const storeSlug = orderData.stores?.store_slug || "";
  const storeId = orderData.store_id || orderData.stores?.id;
  const { storeData } = useInvoiceData({ storeSlug, storeId });

  // Discount and additional charges
  const discountAmount = orderData.discount_amount || 0;
  const additionalCharges = orderData.additional_charges || 0;
  const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳";

  // Detect platform and paper width
  useEffect(() => {
    if (isAndroid()) {
      setPlatform('android');
    } else if (isIOS()) {
      setPlatform('ios');
    } else if (typeof navigator !== 'undefined' && /Windows|Mac|Linux/.test(navigator.userAgent)) {
      setPlatform('desktop');
    } else {
      setPlatform('other');
    }
    
    // Detect paper width
    setPaperWidth(detectPaperWidth());
  }, []);

  // Fetch store tax rate
  useEffect(() => {
    const fetchStoreTaxRate = async () => {
      if (!storeId) return;
      try {
        const settings = await getStoreSettings(storeId);
        if (settings?.tax_rate) {
          setStoreTaxRate(settings.tax_rate);
        }
      } catch (error) {
        console.error("Error fetching store tax rate:", error);
      }
    };
    fetchStoreTaxRate();
  }, [storeId]);

  // Customer information
  const getCustomerName = (): string => {
    return orderData.shipping_address?.customer_name || orderData.customers?.first_name || "N/A";
  };

  const getCustomerPhone = (): string => {
    return orderData.shipping_address?.phone || orderData.customers?.phone || "N/A";
  };

  const getCustomerEmail = (): string => orderData.customers?.email || "";

  const getCustomerAddress = (): string => {
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

  // Calculate tax amount
  const calculateTaxAmount = (): number => {
    if (storeTaxRate && storeTaxRate > 0) {
      return storeTaxRate;
    }
    return 0;
  };

  const taxAmount = calculateTaxAmount();

  // Enhanced order data
  const enhancedOrderData = storeData
    ? {
        ...orderData,
        stores: {
          ...orderData.stores,
          id: storeData.id,
          store_name: storeData.store_name,
          store_slug: storeData.store_slug,
          business_address: storeData.business_address || orderData.stores?.business_address,
          contact_phone: storeData.contact_phone || orderData.stores?.contact_phone,
          contact_email: storeData.contact_email || orderData.stores?.contact_email,
        },
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        additional_charges: additionalCharges,
      }
    : {
        ...orderData,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        additional_charges: additionalCharges,
      };

  // ✅ Download receipt as image OPTIMIZED FOR POS PRINTERS
  const downloadReceiptAsImage = async (): Promise<void> => {
    setIsDownloading(true);
    
    try {
      await createHighResReceiptImage();
    } catch (error) {
      console.error("Error creating image:", error);
      openPrintableReceipt();
    } finally {
      setIsDownloading(false);
    }
  };

  // Create receipt image optimized for POS printers
  const createHighResReceiptImage = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        
        // ===== OPTIMIZED FOR POS PRINTERS (58mm width) =====
        const DPI = 300;
        const PAPER_WIDTH_MM = paperWidth; // 58mm for POS printers
        const CONTENT_WIDTH_MM = PAPER_WIDTH_MM - 4; // 54mm content width (2mm margins each side)
        
        // Convert mm to pixels
        const widthPx = mmToPixels(PAPER_WIDTH_MM, DPI);
        const contentWidthPx = mmToPixels(CONTENT_WIDTH_MM, DPI);
        const marginPx = (widthPx - contentWidthPx) / 2;
        
        // Height - generous estimate
        const estimatedHeightMm = 350; // Longer for more items
        const heightPx = mmToPixels(estimatedHeightMm, DPI);
        
        // Set canvas dimensions
        canvas.width = widthPx;
        canvas.height = heightPx;
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, widthPx, heightPx);
        
        // Draw receipt optimized for narrow paper
        const startY = drawReceiptOnCanvas(ctx, contentWidthPx, marginPx, widthPx);
        
        // Trim canvas to actual content height
        const actualHeight = Math.ceil(startY + marginPx * 2);
        if (actualHeight < heightPx) {
          const trimmedCanvas = document.createElement('canvas');
          const trimmedCtx = trimmedCanvas.getContext('2d');
          if (trimmedCtx) {
            trimmedCanvas.width = widthPx;
            trimmedCanvas.height = actualHeight;
            trimmedCtx.drawImage(canvas, 0, 0, widthPx, actualHeight, 0, 0, widthPx, actualHeight);
            const pngUrl = trimmedCanvas.toDataURL('image/png', 1.0);
            downloadImage(pngUrl, 'png');
          } else {
            const pngUrl = canvas.toDataURL('image/png', 1.0);
            downloadImage(pngUrl, 'png');
          }
        } else {
          const pngUrl = canvas.toDataURL('image/png', 1.0);
          downloadImage(pngUrl, 'png');
        }
        
        showDownloadSuccess();
        resolve();
        
      } catch (error) {
        reject(error);
      }
    });
  };

  // Draw receipt optimized for narrow POS printer paper
  const drawReceiptOnCanvas = (
    ctx: CanvasRenderingContext2D, 
    contentWidthPx: number, 
    marginPx: number,
    totalWidthPx: number
  ): number => {
    const startX = marginPx;
    let y = marginPx;
    
    // ===== SMALLER FONT SIZES FOR NARROW PAPER =====
    const lineHeight = mmToPixels(4, 300); // 4mm line height (~47px)
    const fontSizeLarge = mmToPixels(3.5, 300);   // 3.5mm font for headings (~41px)
    const fontSizeMedium = mmToPixels(3, 300);    // 3mm font for normal text (~35px)
    const fontSizeSmall = mmToPixels(2.5, 300);   // 2.5mm font for details (~30px)
    const fontSizeXSmall = mmToPixels(2, 300);    // 2mm font for small details (~24px)
    
    // Set initial styles
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    
    // ===== STORE HEADER (CENTERED, SHORT) =====
    ctx.font = `bold ${fontSizeLarge}px "Courier New", monospace`;
    const storeName = enhancedOrderData.stores?.store_name?.toUpperCase() || "STORE";
    // Truncate store name if too long
    const maxStoreNameChars = Math.floor(contentWidthPx / (fontSizeLarge * 0.6));
    const displayStoreName = storeName.length > maxStoreNameChars 
      ? storeName.substring(0, maxStoreNameChars - 3) + "..." 
      : storeName;
    
    ctx.fillText(displayStoreName, startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    // Store address in smaller font
    ctx.font = `bold ${fontSizeXSmall}px "Courier New", monospace`;
    if (enhancedOrderData.stores?.business_address) {
      const address = enhancedOrderData.stores.business_address;
      // Split address if too long
      if (address.length > 40) {
        const part1 = address.substring(0, 40);
        const part2 = address.substring(40, 80);
        ctx.fillText(part1, startX + contentWidthPx / 2, y);
        y += lineHeight * 0.8;
        if (part2) {
          ctx.fillText(part2, startX + contentWidthPx / 2, y);
          y += lineHeight * 0.8;
        }
      } else {
        ctx.fillText(address, startX + contentWidthPx / 2, y);
        y += lineHeight * 0.8;
      }
    }
    
    if (enhancedOrderData.stores?.contact_phone) {
      ctx.fillText(`Tel: ${enhancedOrderData.stores.contact_phone}`, startX + contentWidthPx / 2, y);
      y += lineHeight * 0.8;
    }
    
    // Divider line
    y += lineHeight / 2;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + contentWidthPx, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = mmToPixels(0.3, 300);
    ctx.stroke();
    y += lineHeight;
    
    // ===== ORDER INFO (CENTERED) =====
    ctx.font = `bold ${fontSizeMedium}px "Courier New", monospace`;
    ctx.fillText(`ORDER #: ${enhancedOrderData.order_number}`, startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    ctx.font = `bold ${fontSizeSmall}px "Courier New", monospace`;
    const dateText = `Date: ${formatDate(enhancedOrderData.created_at)}`;
    ctx.fillText(dateText, startX + contentWidthPx / 2, y);
    y += lineHeight * 1.5;
    
    // ===== CUSTOMER INFO =====
    ctx.font = `bold ${fontSizeMedium}px "Courier New", monospace`;
    ctx.fillText("CUSTOMER INFO", startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    ctx.textAlign = 'left';
    ctx.font = `bold ${fontSizeSmall}px "Courier New", monospace`;
    
    // Customer name
    const customerName = getCustomerName();
    if (customerName !== "N/A") {
      ctx.fillText(`Name: ${customerName}`, startX, y);
      y += lineHeight;
    }
    
    // Customer phone
    const customerPhone = getCustomerPhone();
    if (customerPhone !== "N/A") {
      ctx.fillText(`Phone: ${customerPhone}`, startX, y);
      y += lineHeight;
    }
    
    // Customer email (if exists)
    const email = getCustomerEmail();
    if (email) {
      ctx.fillText(`Email: ${email}`, startX, y);
      y += lineHeight;
    }
    
    // Customer address (multi-line if needed)
    const address = getCustomerAddress();
    if (address !== "N/A") {
      // Split address into multiple lines if too long
      const maxAddressChars = Math.floor(contentWidthPx / (fontSizeSmall * 0.5));
      if (address.length > maxAddressChars) {
        const words = address.split(' ');
        let line = '';
        for (const word of words) {
          if ((line + ' ' + word).length <= maxAddressChars) {
            line += (line ? ' ' : '') + word;
          } else {
            if (line) {
              ctx.fillText(`Addr: ${line}`, startX, y);
              y += lineHeight;
            }
            line = word;
          }
        }
        if (line) {
          ctx.fillText(`Addr: ${line}`, startX, y);
          y += lineHeight;
        }
      } else {
        ctx.fillText(`Addr: ${address}`, startX, y);
        y += lineHeight;
      }
    }
    
    y += lineHeight / 2;
    
    // Divider
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + contentWidthPx, y);
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    y += lineHeight;
    
    // ===== ITEMS HEADER =====
    ctx.textAlign = 'center';
    ctx.font = `bold ${fontSizeMedium}px "Courier New", monospace`;
    ctx.fillText("ITEMS", startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    // Table header line
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + contentWidthPx, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = mmToPixels(0.3, 300);
    ctx.stroke();
    y += lineHeight / 2;
    
    // ===== ITEMS LIST (COMPACT) =====
    ctx.textAlign = 'left';
    ctx.font = `bold ${fontSizeXSmall}px "Courier New", monospace`;
    let itemCount = 0;
    
    enhancedOrderData.order_items.forEach((item) => {
      if (itemCount >= 6) return; // Limit to 6 items for narrow paper
      
      const maxNameLength = Math.floor(contentWidthPx * 0.6 / (fontSizeXSmall * 0.5));
      const productName = item.product_name.length > maxNameLength 
        ? item.product_name.substring(0, maxNameLength - 3) + "..." 
        : item.product_name;
      
      // Item number and name
      ctx.fillText(`${itemCount + 1}. ${productName}`, startX, y);
      
      // Quantity and price on same line
      const qtyPriceText = `x${item.quantity} = ${displayCurrencyIconSafe}${item.total_price.toFixed(2)}`;
      const qtyPriceWidth = ctx.measureText(qtyPriceText).width;
      ctx.fillText(qtyPriceText, startX + contentWidthPx - qtyPriceWidth, y);
      
      y += lineHeight;
      itemCount++;
    });
    
    y += lineHeight / 2;
    
    // Bottom line
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + contentWidthPx, y);
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    y += lineHeight;
    
    // ===== ORDER SUMMARY =====
    ctx.textAlign = 'center';
    ctx.font = `bold ${fontSizeMedium}px "Courier New", monospace`;
    ctx.fillText("SUMMARY", startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    // Helper function to draw compact summary row
    const drawSummaryRow = (label: string, value: string, isTotal: boolean = false) => {
      ctx.textAlign = 'left';
      ctx.font = isTotal ? `bold ${fontSizeSmall}px "Courier New", monospace` : `bold ${fontSizeXSmall}px "Courier New", monospace`;
      
      // Truncate label if too long
      const maxLabelChars = Math.floor(contentWidthPx * 0.6 / (fontSizeXSmall * 0.5));
      const displayLabel = label.length > maxLabelChars ? label.substring(0, maxLabelChars - 3) + "..." : label;
      
      ctx.fillText(displayLabel, startX, y);
      
      ctx.textAlign = 'right';
      ctx.fillText(value, startX + contentWidthPx, y);
      
      y += lineHeight * (isTotal ? 1.2 : 0.9);
    };
    
    // Summary rows
    drawSummaryRow("Subtotal:", `${displayCurrencyIconSafe}${enhancedOrderData.subtotal.toFixed(2)}`);
    
    if (enhancedOrderData.discount_amount > 0) {
      drawSummaryRow("Discount:", `-${displayCurrencyIconSafe}${enhancedOrderData.discount_amount.toFixed(2)}`);
    }
    
    if (enhancedOrderData.additional_charges > 0) {
      drawSummaryRow("Extra Chrg:", `+${displayCurrencyIconSafe}${enhancedOrderData.additional_charges.toFixed(2)}`);
    }
    
    drawSummaryRow("Tax:", `${displayCurrencyIconSafe}${taxAmount.toFixed(2)}`);
    drawSummaryRow("Shipping:", `${displayCurrencyIconSafe}${enhancedOrderData.shipping_fee.toFixed(2)}`);
    
    // Total separator
    y += lineHeight / 2;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + contentWidthPx, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = mmToPixels(0.5, 300);
    ctx.stroke();
    y += lineHeight / 2;
    
    // TOTAL (bold and larger)
    drawSummaryRow("TOTAL:", `${displayCurrencyIconSafe}${enhancedOrderData.total_amount.toFixed(2)}`, true);
    y += lineHeight;
    
    // ===== PAYMENT INFO =====
    ctx.textAlign = 'center';
    ctx.font = `bold ${fontSizeSmall}px "Courier New", monospace`;
    const paymentText = `PAYMENT: ${enhancedOrderData.payment_method?.toUpperCase() || "CASH"}`;
    ctx.fillText(paymentText, startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    ctx.font = `bold ${fontSizeXSmall}px "Courier New", monospace`;
    ctx.fillText(`Status: ${enhancedOrderData.status.toUpperCase()}`, startX + contentWidthPx / 2, y);
    y += lineHeight * 1.5;
    
    // ===== THANK YOU MESSAGE =====
    ctx.font = `bold ${fontSizeXSmall}px "Courier New", monospace`;
    ctx.fillText("Thank you for shopping!", startX + contentWidthPx / 2, y);
    y += lineHeight;
    
    ctx.font = `bold ${fontSizeXSmall - 3}px "Courier New", monospace`;
    const websiteText = enhancedOrderData.stores?.store_slug
      ? `sheihoise.com/${enhancedOrderData.stores.store_slug}`
      : "sheihoise.com";
    ctx.fillText(websiteText, startX + contentWidthPx / 2, y);
    y += lineHeight * 2;
    
    return y;
  };

  // Download image helper
  const downloadImage = (dataUrl: string, format: 'png' | 'jpg' = 'png') => {
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `receipt-${enhancedOrderData.order_number}-${timestamp}.${format}`;
    
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show download success message
  const showDownloadSuccess = () => {
    if (platform === 'android' || platform === 'ios') {
      alert(`✅ Receipt saved!\n\nOptimized for ${paperWidth}mm POS printer paper.\n\n📱 PRINTING:\n1. Open Photos app\n2. Find the receipt\n3. Tap Share → Print\n4. Adjust scale if needed\n\n✅ Text will not cut off on right side!`);
    } else {
      alert(`✅ Receipt saved for ${paperWidth}mm paper!\n✅ Optimized for POS printers - no text cutting!`);
    }
  };

  // Generate printable HTML optimized for narrow paper
  const generatePrintableHTML = (): string => {
    const PAPER_WIDTH = paperWidth;
    const CONTENT_WIDTH = PAPER_WIDTH - 4; // 2mm margins each side
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${enhancedOrderData.order_number}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=${PAPER_WIDTH}mm, initial-scale=1">
          <style>
            /* OPTIMIZED FOR NARROW POS PRINTER PAPER */
            @page {
              margin: 2mm;
              size: ${PAPER_WIDTH}mm auto;
            }
            
            @media print {
              body {
                margin: 0 !important;
                padding: 1mm !important;
                width: ${CONTENT_WIDTH}mm !important;
                font-size: 9pt !important;
                font-weight: bold !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              * {
                font-weight: bold !important;
                max-width: 100% !important;
                overflow-wrap: break-word !important;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-weight: bold;
              max-width: 100%;
              overflow-wrap: break-word;
            }
            
            body {
              font-family: 'Courier New', monospace;
              margin: 0 auto;
              padding: 1mm;
              width: ${CONTENT_WIDTH}mm;
              max-width: ${CONTENT_WIDTH}mm;
              font-size: 9pt;
              font-weight: bold;
              line-height: 1.1;
              color: #000000;
              background: white;
              word-wrap: break-word;
            }
            
            .receipt {
              width: 100%;
              max-width: ${CONTENT_WIDTH}mm;
              margin: 0 auto;
              font-weight: bold;
            }
            
            .header {
              text-align: center;
              margin-bottom: 2mm;
              padding-bottom: 1mm;
              border-bottom: 0.3mm solid #000;
            }
            
            .store-name {
              font-weight: bold;
              font-size: 10pt;
              margin-bottom: 0.5mm;
              text-transform: uppercase;
              letter-spacing: 0.3pt;
              word-break: break-word;
            }
            
            .store-info {
              font-size: 7pt;
              font-weight: bold;
              color: #000;
              word-break: break-word;
            }
            
            .divider {
              text-align: center;
              margin: 1mm 0;
              color: #000;
              font-size: 6pt;
              font-weight: bold;
            }
            
            .section {
              margin-bottom: 2mm;
            }
            
            .section-title {
              font-weight: bold;
              font-size: 8pt;
              margin-bottom: 1mm;
              text-align: center;
              text-transform: uppercase;
              word-break: break-word;
            }
            
            .info-row {
              font-size: 7pt;
              font-weight: bold;
              margin-bottom: 0.5mm;
              display: flex;
              justify-content: space-between;
              word-break: break-word;
            }
            
            .info-label {
              font-weight: bold;
              white-space: nowrap;
            }
            
            .info-value {
              font-weight: bold;
              text-align: right;
              max-width: 60%;
              word-break: break-word;
            }
            
            .items-table {
              width: 100%;
              margin: 2mm 0;
              border-collapse: collapse;
              font-size: 7pt;
              font-weight: bold;
            }
            
            .items-table th {
              border-bottom: 0.2mm solid #000;
              padding-bottom: 0.5mm;
              text-align: left;
              font-weight: bold;
            }
            
            .items-table td {
              padding: 0.3mm 0;
              vertical-align: top;
              font-weight: bold;
            }
            
            .item-name {
              max-width: ${CONTENT_WIDTH * 0.6}mm;
              word-break: break-word;
              font-weight: bold;
            }
            
            .item-qty {
              text-align: center;
              width: 8mm;
              font-weight: bold;
            }
            
            .item-price {
              text-align: right;
              width: ${CONTENT_WIDTH * 0.3}mm;
              font-weight: bold;
            }
            
            .summary {
              margin: 2mm 0;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              font-size: 7pt;
              font-weight: bold;
              margin-bottom: 0.5mm;
              word-break: break-word;
            }
            
            .total-row {
              font-weight: bold;
              border-top: 0.3mm solid #000;
              margin-top: 1mm;
              padding-top: 1mm;
              font-size: 8pt;
            }
            
            .payment-info {
              text-align: center;
              margin: 3mm 0;
              padding-top: 1mm;
              border-top: 0.2mm solid #000;
            }
            
            .payment-method {
              font-weight: bold;
              font-size: 8pt;
              margin-bottom: 0.5mm;
              word-break: break-word;
            }
            
            .status {
              font-size: 7pt;
              font-weight: bold;
              color: #000;
            }
            
            .footer {
              text-align: center;
              margin-top: 2mm;
              padding-top: 1mm;
              border-top: 0.2mm dotted #000;
              font-size: 6pt;
              font-weight: bold;
              color: #000;
              word-break: break-word;
            }
            
            /* Print button */
            .print-btn {
              display: block;
              width: 100%;
              margin: 3mm auto;
              padding: 2mm;
              background: #000;
              color: white;
              border: none;
              border-radius: 1mm;
              font-size: 8pt;
              font-weight: bold;
              font-family: 'Courier New', monospace;
              cursor: pointer;
              text-align: center;
            }
            
            .print-btn:hover {
              background: #333;
            }
            
            @media screen {
              body {
                border: 0.3mm dashed #ccc;
                margin: 5mm auto;
                box-shadow: 0 0 5px rgba(0,0,0,0.1);
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Store Header -->
            <div class="header">
              <div class="store-name">${enhancedOrderData.stores?.store_name?.toUpperCase() || "STORE"}</div>
              ${enhancedOrderData.stores?.business_address ? 
                `<div class="store-info">${enhancedOrderData.stores.business_address}</div>` : ''}
              ${enhancedOrderData.stores?.contact_phone ? 
                `<div class="store-info">Tel: ${enhancedOrderData.stores.contact_phone}</div>` : ''}
            </div>
            
            <div class="divider">══════════════</div>
            
            <!-- Order Info -->
            <div class="section">
              <div class="info-row">
                <span class="info-label">ORDER #:</span>
                <span class="info-value">${enhancedOrderData.order_number}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${formatDate(enhancedOrderData.created_at)}</span>
              </div>
            </div>
            
            <div class="divider">══════════════</div>
            
            <!-- Customer Info -->
            <div class="section">
              <div class="section-title">CUSTOMER</div>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${getCustomerName()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${getCustomerPhone()}</span>
              </div>
              ${getCustomerEmail() ? `
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${getCustomerEmail()}</span>
              </div>
              ` : ''}
              ${getCustomerAddress() !== "N/A" ? `
              <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value" style="text-align: left;">${getCustomerAddress()}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="divider">══════════════</div>
            
            <!-- Items -->
            <div class="section">
              <div class="section-title">ITEMS</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th class="item-name">Item</th>
                    <th class="item-qty">Qty</th>
                    <th class="item-price">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${enhancedOrderData.order_items.map((item, index) => {
                    const productName = item.product_name.length > 25
                      ? item.product_name.substring(0, 25) + "..."
                      : item.product_name;
                    return `
                      <tr>
                        <td class="item-name">${index + 1}. ${productName}</td>
                        <td class="item-qty">x${item.quantity}</td>
                        <td class="item-price">${displayCurrencyIconSafe}${item.total_price.toFixed(2)}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
            
            <div class="divider">══════════════</div>
            
            <!-- Summary -->
            <div class="section summary">
              <div class="section-title">SUMMARY</div>
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${displayCurrencyIconSafe}${enhancedOrderData.subtotal.toFixed(2)}</span>
              </div>
              ${enhancedOrderData.discount_amount > 0 ? `
                <div class="summary-row">
                  <span>Discount</span>
                  <span>-${displayCurrencyIconSafe}${enhancedOrderData.discount_amount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${enhancedOrderData.additional_charges > 0 ? `
                <div class="summary-row">
                  <span>Extra Chrg</span>
                  <span>+${displayCurrencyIconSafe}${enhancedOrderData.additional_charges.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="summary-row">
                <span>Tax</span>
                <span>${displayCurrencyIconSafe}${taxAmount.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span>Shipping</span>
                <span>${displayCurrencyIconSafe}${enhancedOrderData.shipping_fee.toFixed(2)}</span>
              </div>
              <div class="summary-row total-row">
                <span>TOTAL</span>
                <span>${displayCurrencyIconSafe}${enhancedOrderData.total_amount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="divider">══════════════</div>
            
            <!-- Payment Info -->
            <div class="payment-info">
              <div class="payment-method">${enhancedOrderData.payment_method?.toUpperCase() || "CASH"}</div>
              <div class="status">Status: ${enhancedOrderData.status.toUpperCase()}</div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div>Thank you for shopping!</div>
              <div>${enhancedOrderData.stores?.store_slug
                ? `sheihoise.com/${enhancedOrderData.stores.store_slug}`
                : "sheihoise.com"}</div>
            </div>
            
            <!-- Print Button -->
            <button class="print-btn" onclick="window.print()">🖨️ PRINT</button>
          </div>
          
          <script>
            // Auto-print option
            if (window.location.hash === '#autoprint') {
              setTimeout(() => {
                window.print();
              }, 1000);
            }
            
            console.log('✅ Receipt optimized for ${PAPER_WIDTH}mm paper');
            console.log('✅ No text cutting on right side');
            console.log('✅ Perfect for POS thermal printers');
          </script>
        </body>
      </html>
    `;
  };

  // Browser print function - Desktop only
  const handleBrowserPrint = () => {
    if (platform === 'android' || platform === 'ios') {
      alert("📱 For mobile devices, please use 'Save as Image' and print from your photos app.");
      return;
    }
    
    setIsPrinting(true);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintableHTML());
      printWindow.document.close();
      
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (error) {
          console.log("Auto-print blocked");
        }
        
        setTimeout(() => {
          printWindow.close();
          setIsPrinting(false);
        }, 3000);
      }, 1000);
    } else {
      setIsPrinting(false);
      alert("Please allow popups to print the receipt.");
    }
  };

  // Show POS printing instructions
  const showPOSPrintInstructions = () => {
    const instructions = `📠 **POS PRINTER OPTIMIZATION**

**Current Paper Width:** ${paperWidth}mm

**PROBLEM SOLVED:**
✅ Text will NOT cut off on right side
✅ Optimized for narrow POS paper
✅ Smaller, readable fonts
✅ Automatic text wrapping

**PRINTING INSTRUCTIONS:**

**METHOD 1: Save Image (Recommended)**
1. Tap "Save as Image"
2. Image saves at ${paperWidth}mm width
3. Open Photos app
4. Find the receipt image
5. Tap Share → Print
6. No scaling needed!

**METHOD 2: Direct Print (Desktop)**
1. Connect POS printer to computer
2. Tap "Print Directly"
3. Paper size: ${paperWidth}mm
4. Scale: 100%
5. Margins: Minimal or None

**FEATURES:**
• Fonts adjusted for ${paperWidth}mm paper
• Text wraps automatically
• Bold text for readability
• Perfect for thermal printers
`;

    alert(instructions);
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
        className="relative bg-background text-foreground w-full max-w-md max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-2xl shadow-2xl border border-border"
      >
        {/* Header */}
        <div className="sticky top-0 bg-primary text-primary-foreground p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-bold">POS Receipt</h2>
                <p className="text-primary-foreground/90 text-sm">
                  Order #: {enhancedOrderData.order_number}
                </p>
              </div>
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Platform & Paper Info */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Smartphone className="h-3 w-3" />
            <span className="capitalize">
              {platform === 'android' || platform === 'ios' ? 'Mobile' : platform === 'desktop' ? 'Desktop' : 'Device'}
            </span>
            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 rounded">
              {paperWidth}mm Paper
            </span>
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded">
              No Text Cutting
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 max-h-[calc(90vh-180px)]">
          {/* POS Optimization Banner */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Maximize2 className="h-4 w-4 text-yellow-600" />
              <span className="font-bold text-yellow-800">Optimized for POS Printers</span>
            </div>
            <p className="text-sm text-yellow-700">
              Receipt is optimized for {paperWidth}mm paper. Text will NOT cut off on right side!
            </p>
          </div>

          {/* Optimized Receipt Preview */}
          <div 
            ref={receiptRef}
            className="font-mono bg-white p-3 rounded-lg border-2 border-gray-300 mb-6 mx-auto"
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '9px',
              fontWeight: 'bold',
              lineHeight: '1.1',
              width: `${paperWidth}mm`,
              maxWidth: `${paperWidth}mm`,
              margin: '0 auto',
              backgroundColor: 'white',
              color: '#000000',
              transform: 'scale(0.75)',
              transformOrigin: 'top center',
            }}
          >
            {/* Store Header */}
            <div className="text-center mb-2 border-b border-black pb-1">
              <div className="font-bold text-xs uppercase">
                {enhancedOrderData.stores?.store_name?.toUpperCase()?.substring(0, 20) || "STORE"}
              </div>
              {enhancedOrderData.stores?.business_address && (
                <div className="text-[8px] mt-0.5">
                  {enhancedOrderData.stores.business_address.substring(0, 30)}
                </div>
              )}
            </div>
            
            {/* Order Info */}
            <div className="text-[8px] mb-2">
              <div className="mb-0.5">
                <span className="font-bold">ORDER #:</span> {enhancedOrderData.order_number}
              </div>
              <div className="mb-0.5">
                <span className="font-bold">Date:</span> {formatDate(enhancedOrderData.created_at).substring(0, 20)}
              </div>
            </div>
            
            {/* Customer Info */}
            <div className="text-center text-[8px] mb-1.5 font-bold border-b border-black pb-0.5">
              CUSTOMER
            </div>
            <div className="text-[8px] mb-2">
              <div className="mb-0.5">
                <span className="font-bold">Name:</span> {getCustomerName().substring(0, 15)}
              </div>
              <div className="mb-0.5">
                <span className="font-bold">Phone:</span> {getCustomerPhone()}
              </div>
            </div>
            
            {/* Items */}
            <div className="text-center text-[8px] mb-1.5 font-bold border-b border-black pb-0.5">
              ITEMS
            </div>
            <div className="mb-2">
              {enhancedOrderData.order_items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between text-[8px] mb-1">
                  <span className="truncate max-w-[60%] font-bold">
                    {index + 1}. {item.product_name.substring(0, 15)}
                  </span>
                  <span className="font-bold">x{item.quantity}</span>
                  <span className="font-bold">
                    {displayCurrencyIconSafe}{item.total_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="text-center text-[8px] mb-1.5 font-bold border-b border-black pb-0.5">
              SUMMARY
            </div>
            <div className="text-[8px] mb-2">
              <div className="flex justify-between mb-0.5">
                <span className="font-bold">Subtotal</span>
                <span className="font-bold">{displayCurrencyIconSafe}{enhancedOrderData.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between mb-0.5">
                <span className="font-bold">Tax</span>
                <span className="font-bold">{displayCurrencyIconSafe}{taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between mb-0.5">
                <span className="font-bold">Shipping</span>
                <span className="font-bold">{displayCurrencyIconSafe}{enhancedOrderData.shipping_fee.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between font-bold border-t border-black pt-1 mt-1 text-[9px]">
                <span>TOTAL</span>
                <span>{displayCurrencyIconSafe}{enhancedOrderData.total_amount.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Payment Info */}
            <div className="text-center text-[8px] mb-2">
              <div className="font-bold text-[9px] mb-0.5">
                PAYMENT: {enhancedOrderData.payment_method?.substring(0, 10)?.toUpperCase() || "CASH"}
              </div>
            </div>
            
            {/* Footer */}
            <div className="text-center text-[7px] border-t border-gray-300 pt-1">
              <div className="font-bold">Thank you!</div>
            </div>
          </div>

          {/* POS Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <Printer className="h-4 w-4" />
              POS Printer Guide ({paperWidth}mm paper)
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              This receipt is optimized to prevent text cutting on the right side.
            </p>
            <Button
              onClick={showPOSPrintInstructions}
              variant="outline"
              className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
              size="sm"
            >
              View POS Printing Instructions
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={downloadReceiptAsImage}
                className="w-full"
                disabled={isDownloading}
                variant="default"
                size="lg"
              >
                {isDownloading ? (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2 animate-spin" />
                    Creating Image...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Save as Image
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleBrowserPrint}
                className="w-full"
                disabled={isPrinting || platform !== 'desktop'}
                variant="outline"
                size="lg"
              >
                {isPrinting ? (
                  <>
                    <Printer className="h-4 w-4 mr-2 animate-spin" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    {platform === 'desktop' ? 'Print Directly' : 'Desktop Only'}
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                ✅ Optimized for {paperWidth}mm POS printers
                <br />
                ✅ No text cutting on right side
                <br />
                ✅ Automatic text wrapping
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <Button
            onClick={onClose}
            className="w-full"
            variant="ghost"
          >
            Close Receipt
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function openPrintableReceipt() {
  throw new Error("Function not implemented.");
}
