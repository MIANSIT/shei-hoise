"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button, Typography, Space, Dropdown, notification } from "antd";
import type { MenuProps } from "antd";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import {
  getProductPublicUrl,
  renderProductQrToCanvas,
  renderProductQrBlob,
} from "@/lib/utils/productQr";
import { downloadBlob, printPdfBlob, sanitizeFilename } from "@/lib/utils/printWindow";
import { generateLabelPdf } from "@/lib/utils/generateLabelPdf";
import { generateLabelSheetPdf } from "@/lib/utils/generateLabelSheetPdf";

type LabelFormat = "58mm" | "a4";

const LABEL_FORMAT_MENU_ITEMS: MenuProps["items"] = [
  { key: "58mm", label: "58mm thermal label" },
  { key: "a4", label: "A4 sheet" },
];

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
  const handleDownloadPng = async () => {
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

  // A real PDF with the label's exact size baked in — not HTML + a custom
  // `@page` rule, which many mobile/thermal print pipelines silently ignore
  // in favor of a much bigger default page — and the QR itself drawn as
  // vector rectangles, not a raster image, so a print bridge's
  // photo-dithering step never touches it (see generateLabelPdf.ts /
  // pdfQr.ts).
  const buildLabelPdf = (format: LabelFormat) => {
    if (!product) return null;
    if (format === "a4") {
      return generateLabelSheetPdf(storeName, logoUrl, [
        { qrUrl: url, productName: product.name },
      ]);
    }
    return generateLabelPdf({ storeName, logoUrl, qrUrl: url, productName: product.name });
  };

  const handleDownloadPdf = async (format: LabelFormat) => {
    const build = buildLabelPdf(format);
    if (!build) return;
    setExporting(true);
    try {
      const blob = await build;
      downloadBlob(blob, `${fileBaseName}-QR-${format}.pdf`);
    } catch (err) {
      notification.error({
        message: "Couldn't download QR label",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async (format: LabelFormat) => {
    const build = buildLabelPdf(format);
    if (!build) return;
    setExporting(true);
    try {
      const blob = await build;
      // preferShare: false — a QR label goes to a regular/photo printer via
      // the OS print dialog, not an ESC/POS Bluetooth bridge app, so the
      // mobile Share-sheet detour printPdfBlob otherwise takes for receipts
      // (see its doc comment) would just be an extra hop with no printer on
      // the other end here.
      await printPdfBlob(blob, `${fileBaseName}-QR.pdf`, { preferShare: false });
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
        <Space wrap style={{ marginTop: 16, justifyContent: "center" }}>
          <Button onClick={handleDownloadPng} loading={exporting} disabled={rendering}>
            Download PNG
          </Button>
          <Dropdown.Button
            onClick={() => handleDownloadPdf("58mm")}
            loading={exporting}
            disabled={rendering}
            menu={{
              items: LABEL_FORMAT_MENU_ITEMS,
              onClick: ({ key }) => handleDownloadPdf(key as LabelFormat),
            }}
          >
            Download PDF
          </Dropdown.Button>
          <Dropdown.Button
            type="primary"
            onClick={() => handlePrint("58mm")}
            loading={exporting}
            disabled={rendering}
            menu={{
              items: LABEL_FORMAT_MENU_ITEMS,
              onClick: ({ key }) => handlePrint(key as LabelFormat),
            }}
          >
            Print Label
          </Dropdown.Button>
        </Space>
      </div>
    </Modal>
  );
}
