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
import { generateBarcodeLabelPdf, isSkuTooLongForBarcodeLabel } from "@/lib/utils/generateBarcodeLabelPdf";
import { TriangleAlert } from "lucide-react";

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
  /** Whether this store's plan includes QR labels — hides the QR tab entirely when false, same as the table's own per-row QR button being hidden. */
  qrAllowed?: boolean;
  /** Whether this store's plan includes barcode labels — hides the Barcode tab entirely when false. */
  barcodeAllowed?: boolean;
}

export default function ProductQrModal({
  open,
  onClose,
  product,
  storeSlug,
  storeName,
  logoUrl,
  initialMode = "qr",
  qrAllowed = true,
  barcodeAllowed = true,
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
  // A SKU this long can't hold a reliably-scannable module width on a fixed
  // 50×32mm label, no matter how the bars are drawn — see
  // isSkuTooLongForBarcodeLabel's doc comment. The barcode still gets
  // generated (best effort), but the owner should know before printing a
  // sheet of them that this specific one likely won't scan cleanly.
  const skuTooLong = canShowBarcode && isSkuTooLongForBarcodeLabel(barcodeSku!);

  useEffect(() => {
    if (open) {
      // Defensive fallback — the buttons that open this modal are already
      // gated by the same flags, so initialMode should already be allowed;
      // this just avoids landing on a tab that isn't there if that ever
      // drifts out of sync.
      const fallbackMode: CodeMode = qrAllowed ? "qr" : "barcode";
      setMode(
        (initialMode === "qr" && qrAllowed) || (initialMode === "barcode" && barcodeAllowed)
          ? initialMode
          : fallbackMode,
      );
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
      // QR labels (58mm/A4) go to a regular/photo printer via the OS print
      // dialog, so preferShare: false skips the mobile Share-sheet detour
      // printPdfBlob otherwise takes for receipts — an extra hop with no
      // printer on the other end there. A 50×32mm barcode sticker is the
      // opposite case: realistically a dedicated (often Bluetooth) label
      // printer via its own bridge app, same as a receipt — and mobile
      // Chrome's full-screen-iframe fallback (see printPdfViaIframe's doc
      // comment) can't reliably render a PDF blob at all on that path,
      // showing a bare "open this file" screen instead of printing anything.
      await printPdfBlob(blob, `${fileBaseName}-${mode === "barcode" ? "Barcode" : "QR"}.pdf`, {
        preferShare: mode === "barcode",
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
        {qrAllowed && barcodeAllowed && (
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as CodeMode)}
            options={[
              { label: "QR Code", value: "qr" },
              { label: "Barcode", value: "barcode" },
            ]}
            style={{ marginBottom: 14 }}
          />
        )}

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
          <>
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
            {skuTooLong && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  marginTop: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#fff1f0",
                  border: "1px solid #ffa39e",
                  color: "#a8071a",
                  fontSize: 12,
                }}
              >
                <TriangleAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  This SKU is too long to print legibly on a 50×32mm label — the bars would come
                  out too thin to scan. Printing is disabled here until the SKU is 13 characters
                  or fewer.
                </span>
              </div>
            )}
          </>
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
              <Button onClick={() => handleDownloadPdf("58mm")} loading={exporting} disabled={!canShowBarcode || skuTooLong}>
                Download PDF (50×32mm)
              </Button>
              <Button
                type="primary"
                onClick={() => handlePrint("58mm")}
                loading={exporting}
                disabled={!canShowBarcode || skuTooLong}
              >
                Print Label
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
}
