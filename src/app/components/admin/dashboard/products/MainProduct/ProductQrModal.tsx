"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Typography, Space, Dropdown, Segmented, Select, notification } from "antd";
import type { MenuProps } from "antd";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import {
  getProductPublicUrl,
  renderProductQrToCanvas,
  renderProductQrBlob,
} from "@/lib/utils/productQr";
import { renderBarcodeToCanvas, renderBarcodeBlob, isBarcode128Encodable } from "@/lib/utils/productBarcode";
import { downloadBlob, printPdfBlob, sanitizeFilename } from "@/lib/utils/printWindow";
import { generateLabelPdf } from "@/lib/utils/generateLabelPdf";
import { generateLabelSheetPdf } from "@/lib/utils/generateLabelSheetPdf";
import { generateBarcodeLabelPdf } from "@/lib/utils/generateBarcodeLabelPdf";

type CodeMode = "qr" | "barcode";
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
  /** Which tab to open on — e.g. the table's Barcode button opens straight into barcode mode instead of QR. */
  initialMode?: CodeMode;
}

export default function ProductQrModal({
  open,
  onClose,
  product,
  storeSlug,
  storeName,
  logoUrl,
  initialMode = "qr",
}: ProductQrModalProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<CodeMode>(initialMode);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeVariants = useMemo(
    () => (product?.product_variants ?? []).filter((v) => v.is_active),
    [product],
  );
  // A product with variants carries its barcode-able SKU per variant, not on
  // the product row itself (see productSchema.ts — SKU is required either on
  // the product, when it has no variants, or on every variant, when it
  // does) — so barcode mode needs to know which one the owner means.
  const selectedVariant =
    activeVariants.find((v) => v.id === selectedVariantId) ?? activeVariants[0] ?? null;
  const barcodeSku = activeVariants.length > 0 ? selectedVariant?.sku : product?.sku;
  const canShowBarcode = !!barcodeSku && isBarcode128Encodable(barcodeSku);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSelectedVariantId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const url = product ? getProductPublicUrl(storeSlug, product.slug) : "";
  // {store}-{sku or slug} — the shared base name for the downloaded PNG and
  // the printed label's "Save as PDF" suggested filename.
  const fileBaseName = product
    ? sanitizeFilename(`${storeName}-${product.sku || product.slug}`)
    : "";

  useEffect(() => {
    if (!open || !product || mode !== "qr" || !qrCanvasRef.current) return;
    setRendering(true);
    renderProductQrToCanvas(qrCanvasRef.current, url, logoUrl).finally(() =>
      setRendering(false),
    );
  }, [open, product, mode, url, logoUrl]);

  useEffect(() => {
    if (!open || mode !== "barcode" || !canShowBarcode || !barcodeCanvasRef.current) return;
    renderBarcodeToCanvas(barcodeCanvasRef.current, barcodeSku!);
  }, [open, mode, canShowBarcode, barcodeSku]);

  // Downloading/printing always regenerates the QR off-screen (rather than
  // reading the on-screen canvas) because a store logo without CORS headers
  // taints the displayed canvas — it still shows fine on screen, but pixel
  // extraction for export throws unless it goes through the safe path below.
  const handleDownloadPng = async () => {
    if (!product) return;
    setExporting(true);
    try {
      const blob =
        mode === "qr" ? await renderProductQrBlob(url, logoUrl) : await renderBarcodeBlob(barcodeSku!);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${fileBaseName}${mode === "barcode" ? "-barcode" : ""}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      notification.error({
        message: `Couldn't download ${mode === "qr" ? "QR code" : "barcode"}`,
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  // A real PDF with the label's exact size baked in — not HTML + a custom
  // `@page` rule, which many mobile/thermal print pipelines silently ignore
  // in favor of a much bigger default page — and the code itself drawn as
  // vector rectangles, not a raster image, so a print bridge's
  // photo-dithering step never touches it (see generateLabelPdf.ts /
  // generateBarcodeLabelPdf.ts).
  const buildLabelPdf = (format: LabelFormat) => {
    if (!product) return null;
    if (mode === "barcode") {
      if (!barcodeSku) return null;
      return generateBarcodeLabelPdf({ storeName, logoUrl, sku: barcodeSku, productName: product.name });
    }
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
      const suffix = mode === "barcode" ? "Barcode-50x32mm" : `QR-${format}`;
      downloadBlob(blob, `${fileBaseName}-${suffix}.pdf`);
    } catch (err) {
      notification.error({
        message: `Couldn't download ${mode === "qr" ? "QR label" : "barcode label"}`,
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
      // preferShare: false — a label goes to a regular/photo/label printer
      // via the OS print dialog, not an ESC/POS Bluetooth bridge app, so the
      // mobile Share-sheet detour printPdfBlob otherwise takes for receipts
      // (see its doc comment) would just be an extra hop with no printer on
      // the other end here.
      await printPdfBlob(blob, `${fileBaseName}-${mode === "barcode" ? "Barcode" : "QR"}.pdf`, {
        preferShare: false,
      });
    } catch (err) {
      notification.error({
        message: `Couldn't print ${mode === "qr" ? "QR label" : "barcode label"}`,
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
      title={product ? `${product.name} — ${mode === "qr" ? "QR Code" : "Barcode"}` : "Product Code"}
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
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as CodeMode)}
          options={[
            { label: "QR Code", value: "qr" },
            { label: "Barcode", value: "barcode" },
          ]}
          style={{ marginBottom: 14 }}
        />

        {mode === "barcode" && activeVariants.length > 0 && (
          <Select
            value={selectedVariant?.id}
            onChange={setSelectedVariantId}
            style={{ width: "100%", marginBottom: 12 }}
            options={activeVariants.map((v) => ({
              value: v.id,
              label: `${v.variant_name ?? "Unnamed"}${v.sku ? ` — ${v.sku}` : " (no SKU)"}`,
            }))}
          />
        )}

        {mode === "qr" ? (
          <>
            <canvas
              ref={qrCanvasRef}
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
          </>
        ) : canShowBarcode ? (
          <canvas
            ref={barcodeCanvasRef}
            style={{
              display: "block",
              maxWidth: "100%",
              border: "1px solid #eee",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              padding: "24px 16px",
              textAlign: "center",
              border: "1px dashed #ddd",
              borderRadius: 8,
              color: "#888",
              fontSize: 13,
            }}
          >
            {activeVariants.length > 0
              ? "This variant has no SKU yet — add one on the product's edit page to generate its barcode."
              : "This product has no SKU yet — add one on its edit page to generate a barcode."}
          </div>
        )}

        <Space wrap style={{ marginTop: 16, justifyContent: "center" }}>
          <Button onClick={handleDownloadPng} loading={exporting} disabled={rendering || (mode === "barcode" && !canShowBarcode)}>
            Download PNG
          </Button>
          {mode === "qr" ? (
            <>
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
            </>
          ) : (
            <>
              <Button onClick={() => handleDownloadPdf("58mm")} loading={exporting} disabled={!canShowBarcode}>
                Download PDF (50×32mm)
              </Button>
              <Button type="primary" onClick={() => handlePrint("58mm")} loading={exporting} disabled={!canShowBarcode}>
                Print Label
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
}
