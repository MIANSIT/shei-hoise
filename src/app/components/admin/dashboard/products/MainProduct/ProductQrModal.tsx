"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button, Typography, Space, notification } from "antd";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import {
  getProductPublicUrl,
  renderProductQrToCanvas,
  renderProductQrBlob,
} from "@/lib/utils/productQr";
import { printPdfBlob, sanitizeFilename } from "@/lib/utils/printWindow";
import { generateLabelPdf } from "@/lib/utils/generateLabelPdf";

const { Text } = Typography;

interface ProductQrModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductWithVariants | null;
  storeSlug: string;
  storeName: string;
  logoUrl?: string | null;
}

export default function ProductQrModal({
  open,
  onClose,
  product,
  storeSlug,
  storeName,
  logoUrl,
}: ProductQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);

  const url = product ? getProductPublicUrl(storeSlug, product.slug) : "";
  // {store}-{sku or slug} — the shared base name for the downloaded PNG and
  // the printed label's "Save as PDF" suggested filename.
  const fileBaseName = product
    ? sanitizeFilename(`${storeName}-${product.sku || product.slug}`)
    : "";

  useEffect(() => {
    if (!open || !product || !canvasRef.current) return;
    setRendering(true);
    renderProductQrToCanvas(canvasRef.current, url, logoUrl).finally(() =>
      setRendering(false),
    );
  }, [open, product, url, logoUrl]);

  // Downloading/printing always regenerates the QR off-screen (rather than
  // reading the on-screen canvas) because a store logo without CORS headers
  // taints the displayed canvas — it still shows fine on screen, but pixel
  // extraction for export throws unless it goes through the safe path below.
  const handleDownload = async () => {
    if (!product) return;
    setExporting(true);
    try {
      const blob = await renderProductQrBlob(url, logoUrl);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${fileBaseName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      notification.error({
        message: "Couldn't download QR code",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!product) return;
    setExporting(true);
    try {
      // A real PDF with the label's exact 30mm-wide page size baked in —
      // not HTML + a custom `@page` rule, which many mobile/thermal print
      // pipelines silently ignore in favor of a much bigger default page —
      // and the QR itself drawn as vector rectangles, not a raster image,
      // so a print bridge's photo-dithering step never touches it (see
      // generateLabelPdf.ts / pdfQr.ts).
      const blob = await generateLabelPdf({
        storeName,
        logoUrl,
        qrUrl: url,
        productName: product.name,
      });
      printPdfBlob(blob, `${fileBaseName}-QR.pdf`);
    } catch (err) {
      notification.error({
        message: "Couldn't print QR label",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={product ? `${product.name} — QR Code` : "QR Code"}
      width={340}
      centered
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          style={{
            display: "block",
            maxWidth: "100%",
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        />
        <Text
          type="secondary"
          style={{
            display: "block",
            fontSize: 11,
            wordBreak: "break-all",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          {url}
        </Text>
        <Space style={{ marginTop: 16 }}>
          <Button onClick={handleDownload} loading={exporting} disabled={rendering}>
            Download PNG
          </Button>
          <Button type="primary" onClick={handlePrint} loading={exporting} disabled={rendering}>
            Print Label
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
