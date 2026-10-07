"use client";

import React, { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  DragHandle,
  SortableTableRow,
} from "@/app/components/admin/common/SortableTableRow";
import { reorderProducts } from "@/lib/queries/products/reorderProducts";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { Edit, Trash2, Star, Truck, Zap, QrCode, Barcode, Copy, MoreHorizontal } from "lucide-react";
import { getEffectivePrice, isSaleActive } from "@/lib/utils/getEffectivePrice";
import { Modal, Checkbox, Button, Dropdown, Popover } from "antd";
import { LockOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import ProductQrModal from "./ProductQrModal";
import FeatureUpsell from "@/app/components/admin/common/FeatureUpsell";
import { deleteProduct } from "@/lib/queries/products/deleteProduct";
import { toggleProductFeatured } from "@/lib/queries/products/toggleProductFeatured";
import { toggleProductFreeDelivery } from "@/lib/queries/products/toggleProductFreeDelivery";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { ProductImage } from "@/app/components/products/ProductImage";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout";
import type { TablePaginationConfig } from "antd/es/table";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { getProductPublicUrl } from "@/lib/utils/productQr";
import { generateBulkLabelPdf } from "@/lib/utils/generateLabelPdf";
import { generateLabelSheetPdf } from "@/lib/utils/generateLabelSheetPdf";
import { generateBulkBarcodeLabelPdf, isSkuTooLongForBarcodeLabel } from "@/lib/utils/generateBarcodeLabelPdf";
import { isBarcode128Encodable } from "@/lib/utils/productBarcode";
import { sanitizeFilename } from "@/lib/utils/printWindow";
import QrLabelPreviewModal from "./QrLabelPreviewModal";
import { usePermissions } from "@/lib/context/PermissionsContext";

type QrLayout = "pages" | "strip" | "sheet";

const QR_LAYOUT_OPTIONS: { key: QrLayout; label: string; description: string }[] = [
  {
    key: "pages",
    label: "Individual labels",
    description: "58mm thermal roll, one label per page",
  },
  {
    key: "strip",
    label: "Continuous strip",
    description: "58mm thermal roll, all labels on one long page",
  },
  {
    key: "sheet",
    label: "A4 sheet",
    description: "Regular printer page, labels arranged in a grid",
  },
];

const qrLayoutMenuItems: MenuProps["items"] = QR_LAYOUT_OPTIONS.map((opt) => ({
  key: opt.key,
  label: (
    <div>
      <div className="font-medium">{opt.label}</div>
      <div className="text-xs text-muted-foreground">{opt.description}</div>
    </div>
  ),
}));

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
  onDeleteSuccess?: () => void;
  pagination?: TablePaginationConfig;
  storeSlug?: string;
  storeName?: string;
  storeLogoUrl?: string | null;
  /** Called after a drag is saved, so the list can be refetched. */
  onReorderSuccess?: () => void;
  /** Whether this store's plan includes QR code labels — gates the per-row/bulk QR actions and the modal's QR tab. */
  qrAllowed?: boolean;
  /** Whether this store's plan includes barcode labels — gates the per-row/bulk barcode actions and the modal's Barcode tab. */
  barcodeAllowed?: boolean;
  /** Drag-to-reorder only makes sense while the list is in store order. */
  allowDrag?: boolean;
  /** A just-saved product to highlight. */
  highlightId?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The price a customer pays right now, by the same rules as the storefront
 * (getEffectivePrice): a discount only counts when it's below the base price
 * and its sale window is open. A product with variants is priced by its
 * cheapest variant — the product's own price/discount fields are not mixed
 * in (they're hidden in the form when variants exist, so they can be stale,
 * e.g. copied by Duplicate).
 */
const getDisplayPrice = (
  product: ProductWithVariants,
): { price: number; original: number; onSale: boolean } | null => {
  type Priced = {
    base_price: number | null;
    discounted_price: number | null;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
  };
  const variants = (product.product_variants ?? []).filter((v) => Number(v.base_price) > 0) as Priced[];
  const candidates: Priced[] = variants.length > 0 ? variants : Number(product.base_price) > 0 ? [product as Priced] : [];
  if (candidates.length === 0) return null;

  const results = candidates.map((candidate) =>
    getEffectivePrice({
      base_price: Number(candidate.base_price),
      discounted_price: candidate.discounted_price,
      sale_starts_at: candidate.sale_starts_at,
      sale_ends_at: candidate.sale_ends_at,
    }),
  );
  const cheapest = results.reduce((best, current) => (current.price < best.price ? current : best));
  return { price: cheapest.price, original: cheapest.originalPrice, onSale: cheapest.isOnSale };
};

// A "flash sale" is a discount with a real, currently-open sale_ends_at
// window — as opposed to a permanent markdown with no schedule attached.
// Checked at the product level and across every variant, since either can
// carry its own discount + window independently.
const hasActiveFlashSale = (product: ProductWithVariants): boolean => {
  const isActiveWindow = (
    discountedPrice: number | null,
    startsAt: string | null,
    endsAt: string | null,
  ) => discountedPrice != null && discountedPrice > 0 && !!endsAt && isSaleActive(startsAt, endsAt);

  if (isActiveWindow(product.discounted_price, product.sale_starts_at, product.sale_ends_at)) {
    return true;
  }
  return (product.product_variants ?? []).some((v) =>
    isActiveWindow(v.discounted_price, v.sale_starts_at, v.sale_ends_at),
  );
};

const getProductImage = (record: ProductWithVariants): string | null => {
  const img =
    record.product_images?.find((i) => i.is_primary) ||
    record.product_images?.[0] ||
    record.product_variants
      ?.flatMap((v) => v.product_images || [])
      .find((i) => i.is_primary) ||
    record.product_variants?.flatMap((v) => v.product_images || [])[0];
  return img?.image_url || null;
};

// ── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ProductStatus }> = ({ status }) => {
  const t = useTranslation();
  const config: Record<
    ProductStatus,
    { label: string; dot: string; badge: string }
  > = {
    [ProductStatus.ACTIVE]: {
      label: t.admin.productStatusActive,
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    [ProductStatus.DRAFT]: {
      label: t.admin.productStatusDraft,
      dot: "bg-amber-400",
      badge:
        "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    [ProductStatus.INACTIVE]: {
      label: t.admin.productStatusInactive,
      dot: "bg-red-400",
      badge: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
    },
  };

  const { label, dot, badge } =
    config[status] ?? config[ProductStatus.INACTIVE];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
};

// ── Variant Chip ─────────────────────────────────────────────────────────────

const VariantChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
    {label}
  </span>
);

// ── Action Buttons ────────────────────────────────────────────────────────────

const EditButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:border-indigo-300 dark:hover:border-indigo-500 hover:scale-105 active:scale-95 transition-all duration-150"
    aria-label="Edit"
  >
    <Edit className="w-3.5 h-3.5" />
  </button>
);

/** At or below this many units a product shows as "Low". */
const LOW_STOCK_AT = 5;

/** Units available to sell: summed over variants, or the product's own row. */
function getTotalStock(record: ProductWithVariants): number {
  const sum = (rows?: { quantity_available?: number | null }[] | null) =>
    (rows ?? []).reduce((total, row) => total + (row.quantity_available ?? 0), 0);
  const variants = record.product_variants ?? [];
  return variants.length > 0
    ? variants.reduce((total, v) => total + sum(v.product_inventory), 0)
    : sum(record.product_inventory);
}

// ── Main Component ────────────────────────────────────────────────────────────

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading,
  onDeleteSuccess,
  storeSlug,
  storeName,
  storeLogoUrl,
  onReorderSuccess,
  qrAllowed = false,
  barcodeAllowed = false,
  allowDrag = false,
  highlightId = null,
}) => {
  const t = useTranslation();
  const n = useLocalNum();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { can } = usePermissions();
  const canEdit = can("products.edit");
  const canDelete = can("products.delete");
  const canAdd = can("products.add");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [qrProduct, setQrProduct] = useState<ProductWithVariants | null>(null);
  const [qrInitialMode, setQrInitialMode] = useState<"qr" | "barcode">("qr");
  const [featuredOverrides, setFeaturedOverrides] = useState<
    Record<string, boolean>
  >({});
  const [freeDeliveryOverrides, setFreeDeliveryOverrides] = useState<
    Record<string, boolean>
  >({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingFreeDeliveryId, setTogglingFreeDeliveryId] = useState<
    string | null
  >(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkLabelsBlob, setBulkLabelsBlob] = useState<Blob | null>(null);
  const [bulkLabelsFileName, setBulkLabelsFileName] = useState("");
  const [bulkLabelsTitle, setBulkLabelsTitle] = useState("QR Labels");
  const [bulkLabelsPreferShare, setBulkLabelsPreferShare] = useState(false);
  const [bulkLabelsPreviewOpen, setBulkLabelsPreviewOpen] = useState(false);
  const sheiNotif = useSheiNotification();
  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();
  const cur = currencyLoading ? "" : (currencyIcon ?? "৳");

  // Mirrors the fetched page so a drag lands instantly; replaced whenever the
  // parent refetches (filter, search, page change, saved reorder).
  const [orderedProducts, setOrderedProducts] = useState(products);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    setOrderedProducts(products);
  }, [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedProducts.findIndex((p) => p.id === active.id);
    const newIndex = orderedProducts.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = orderedProducts;
    const reordered = arrayMove(orderedProducts, oldIndex, newIndex);
    setOrderedProducts(reordered);
    setSavingOrder(true);
    try {
      const result = await reorderProducts(reordered.map((p) => p.id));
      if (!result.success) {
        setOrderedProducts(previous);
        sheiNotif.error(result.error ?? t.admin.reorderFailed);
        return;
      }
      onReorderSuccess?.();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleShowBarcode = (record: ProductWithVariants) => {
    setQrInitialMode("barcode");
    setQrProduct(record);
  };

  const getFeatured = (record: ProductWithVariants) =>
    featuredOverrides[record.id] ?? record.featured;

  const handleToggleFeatured = async (record: ProductWithVariants) => {
    const next = !getFeatured(record);
    setFeaturedOverrides((prev) => ({ ...prev, [record.id]: next }));
    setTogglingId(record.id);
    try {
      await toggleProductFeatured(record.id, next);
    } catch {
      setFeaturedOverrides((prev) => ({ ...prev, [record.id]: !next }));
      sheiNotif.error(t.admin.featuredUpdateFailed);
    } finally {
      setTogglingId(null);
    }
  };

  const getFreeDelivery = (record: ProductWithVariants) =>
    freeDeliveryOverrides[record.id] ?? record.free_delivery;

  const handleToggleFreeDelivery = async (record: ProductWithVariants) => {
    const next = !getFreeDelivery(record);
    setFreeDeliveryOverrides((prev) => ({ ...prev, [record.id]: next }));
    setTogglingFreeDeliveryId(record.id);
    try {
      await toggleProductFreeDelivery(record.id, next);
    } catch {
      setFreeDeliveryOverrides((prev) => ({ ...prev, [record.id]: !next }));
      sheiNotif.error(t.admin.freeDeliveryUpdateFailed);
    } finally {
      setTogglingFreeDeliveryId(null);
    }
  };

  const handleEdit = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const returnUrl = `${pathname}?${params.toString()}`;
    router.push(
      `/dashboard/products/edit-product/${slug}?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  };

  // Opens Add Product pre-filled from this product; nothing is saved until
  // the owner reviews it and presses Save.
  const handleDuplicate = (slug: string) => {
    router.push(`/dashboard/products/add-product?duplicate=${encodeURIComponent(slug)}`);
  };

  const showDeleteModal = (id: string) => {
    setDeletingId(id);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deletingId);
      sheiNotif.success(t.admin.productDeletedSuccess);
      setModalOpen(false);
      setDeletingId(null);
      onDeleteSuccess?.();
    } catch {
      sheiNotif.error(t.admin.productDeleteFailed);
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  // Shared by both bulk actions below. "pages"/"strip" share the same
  // vector-QR thermal label as the single-product modal (see
  // generateBulkLabelPdf's doc comment for the difference between them);
  // "sheet" is a completely different A4 grid layout for a regular printer.
  const buildSelectedLabelsPdf = (layout: QrLayout) => {
    if (!storeSlug) return null;
    const items = selectedProducts.map((p) => ({
      qrUrl: getProductPublicUrl(storeSlug, p.slug),
      productName: p.name,
    }));
    if (layout === "sheet") {
      return generateLabelSheetPdf(storeName || "My Shop", storeLogoUrl, items);
    }
    return generateBulkLabelPdf(storeName || "My Shop", storeLogoUrl, items, layout);
  };

  // Generates the selected labels, then hands them to a preview modal (same
  // "generate → preview in a modal → Print/Download from inside it" pattern
  // as Quick Sale's checkout receipt) instead of jumping straight to the
  // browser's native print/save dialog with no on-page feedback first — that
  // abrupt full-screen takeover was reading as an unexpected page change.
  const handleGenerateLabels = async (layout: QrLayout) => {
    const build = buildSelectedLabelsPdf(layout);
    if (!build) return;
    setBulkGenerating(true);
    try {
      const blob = await build;
      setBulkLabelsBlob(blob);
      setBulkLabelsFileName(`${sanitizeFilename(storeName || "My Shop")}-QR-Labels.pdf`);
      setBulkLabelsTitle("QR Labels");
      setBulkLabelsPreferShare(false);
      setBulkLabelsPreviewOpen(true);
    } catch (err) {
      sheiNotif.error(
        err instanceof Error ? err.message : "Couldn't generate QR labels",
      );
    } finally {
      setBulkGenerating(false);
    }
  };

  // One label per SKU, not per product row — a product with variants has no
  // barcode-able SKU of its own (see productSchema.ts), only its variants
  // do, so a selected product with 3 variants becomes 3 separate 50×32mm
  // labels here. Two kinds of item get excluded before anything is
  // generated, each reported separately: no SKU set at all, or a SKU too
  // long to hold a reliably-scannable module width on this fixed label size
  // (see isSkuTooLongForBarcodeLabel) — a barcode is never generated for one
  // that's known in advance not to print legibly, rather than handing the
  // owner a sheet with some labels that silently won't scan.
  const handleGenerateBarcodeLabels = async () => {
    const candidates = selectedProducts.flatMap((p) => {
      const activeVariants = (p.product_variants || []).filter((v) => v.is_active);
      if (activeVariants.length > 0) {
        return activeVariants.map((v) => ({
          sku: v.sku,
          productName: `${p.name} — ${v.variant_name ?? "Unnamed"}`,
        }));
      }
      return [{ sku: p.sku, productName: p.name }];
    });

    const noSkuCount = candidates.filter((c) => !c.sku || !isBarcode128Encodable(c.sku)).length;
    const withSku = candidates.filter(
      (c): c is { sku: string; productName: string } => !!c.sku && isBarcode128Encodable(c.sku),
    );
    const tooLong = withSku.filter((c) => isSkuTooLongForBarcodeLabel(c.sku));
    const items = withSku.filter((c) => !isSkuTooLongForBarcodeLabel(c.sku));

    if (items.length === 0) {
      sheiNotif.error("None of the selected products/variants have a SKU that fits this label size (13 characters or fewer).");
      return;
    }

    setBulkGenerating(true);
    try {
      const blob = await generateBulkBarcodeLabelPdf(storeName || "My Shop", storeLogoUrl, items);
      setBulkLabelsBlob(blob);
      setBulkLabelsFileName(`${sanitizeFilename(storeName || "My Shop")}-Barcode-Labels.pdf`);
      setBulkLabelsTitle("Barcode Labels");
      setBulkLabelsPreferShare(true);
      setBulkLabelsPreviewOpen(true);
      if (noSkuCount > 0) {
        sheiNotif.error(`${noSkuCount} item(s) were skipped — no SKU set.`);
      }
      if (tooLong.length > 0) {
        sheiNotif.error(
          `${tooLong.length} item(s) were skipped — SKU too long for a 50×32mm label (13 characters max): ${tooLong.map((c) => c.productName).join(", ")}`,
        );
      }
    } catch (err) {
      sheiNotif.error(err instanceof Error ? err.message : "Couldn't generate barcode labels");
    } finally {
      setBulkGenerating(false);
    }
  };

  // ── Row helpers ─────────────────────────────────────────────────────────────

  const renderBadges = (record: ProductWithVariants) => {
    const featured = getFeatured(record);
    const freeDelivery = getFreeDelivery(record);
    const flashSale = hasActiveFlashSale(record);
    if (!featured && !freeDelivery && !flashSale) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
            {t.admin.productFeaturedBadge}
          </span>
        )}
        {freeDelivery && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Truck className="h-2.5 w-2.5" aria-hidden="true" />
            {t.admin.productFreeDeliveryBadge}
          </span>
        )}
        {flashSale && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            <Zap className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
            {t.admin.productFlashSaleBadge}
          </span>
        )}
      </div>
    );
  };

  const renderPrice = (record: ProductWithVariants) => {
    const display = getDisplayPrice(record);
    if (!display) return <span className="text-sm font-medium text-foreground">—</span>;
    if (display.onSale) {
      return (
        <div className="inline-flex flex-col items-center leading-tight">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {cur}
            {n(display.price.toFixed(2))}
          </span>
          <span className="text-xs text-muted-foreground line-through">
            {cur}
            {n(display.original.toFixed(2))}
          </span>
        </div>
      );
    }
    return (
      <span className="text-sm font-medium text-foreground">
        {cur}
        {n(display.price.toFixed(2))}
      </span>
    );
  };

  const renderStock = (record: ProductWithVariants) => {
    const stock = getTotalStock(record);
    if (stock <= 0) {
      return (
        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
          {t.admin.productOutOfStock}
        </span>
      );
    }
    return (
      <span
        className={`text-sm font-medium ${stock <= LOW_STOCK_AT ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
      >
        {n(stock)}
        {stock <= LOW_STOCK_AT && (
          <span className="ml-1 text-[10px] font-semibold uppercase">{t.admin.productLowStock}</span>
        )}
      </span>
    );
  };

  // Everything except Edit lives in one "⋯" menu, so a row has two controls
  // instead of six, and only shows what this person is allowed to do.
  const menuFor = (record: ProductWithVariants): NonNullable<MenuProps["items"]> => {
    const items: NonNullable<MenuProps["items"]> = [];
    if (canAdd) {
      items.push({
        key: "duplicate",
        icon: <Copy className="h-3.5 w-3.5" />,
        label: t.admin.productDuplicate,
        onClick: () => handleDuplicate(record.slug),
      });
    }
    if (canEdit) {
      items.push({
        key: "featured",
        icon: <Star className="h-3.5 w-3.5" fill={getFeatured(record) ? "currentColor" : "none"} />,
        label: getFeatured(record) ? t.admin.removeFromFeatured : t.admin.markAsFeatured,
        disabled: togglingId === record.id,
        onClick: () => handleToggleFeatured(record),
      });
      items.push({
        key: "free-delivery",
        icon: <Truck className="h-3.5 w-3.5" />,
        label: getFreeDelivery(record) ? t.admin.productFreeDeliveryOff : t.admin.productFreeDeliveryOn,
        disabled: togglingFreeDeliveryId === record.id,
        onClick: () => handleToggleFreeDelivery(record),
      });
    }
    if (storeSlug && qrAllowed) {
      items.push({
        key: "qr",
        icon: <QrCode className="h-3.5 w-3.5" />,
        label: t.admin.productQrCode,
        onClick: () => {
          setQrInitialMode("qr");
          setQrProduct(record);
        },
      });
    }
    if (storeSlug && barcodeAllowed) {
      items.push({
        key: "barcode",
        icon: <Barcode className="h-3.5 w-3.5" />,
        label: t.admin.productBarcode,
        onClick: () => handleShowBarcode(record),
      });
    }
    if (canDelete) {
      if (items.length > 0) items.push({ type: "divider" });
      items.push({
        key: "delete",
        danger: true,
        icon: <Trash2 className="h-3.5 w-3.5" />,
        label: t.admin.productDeleteAction,
        onClick: () => showDeleteModal(record.id),
      });
    }
    return items;
  };

  const renderActions = (record: ProductWithVariants) => {
    const items = menuFor(record);
    return (
      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {canEdit && <EditButton onClick={() => handleEdit(record.slug)} />}
        {items.length > 0 && (
          <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items }}>
            <button
              type="button"
              aria-label={t.admin.productMoreActions}
              title={t.admin.productMoreActions}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </Dropdown>
        )}
      </div>
    );
  };

  // ── Desktop columns ─────────────────────────────────────────────────────────

  const allColumns: ColumnsType<ProductWithVariants> = [
    {
      title: "",
      key: "drag",
      align: "center",
      width: 44,
      responsive: ["md"],
      render: () => <DragHandle disabled={savingOrder} />,
    },
    {
      title: "",
      key: "image",
      align: "center",
      width: 60,
      responsive: ["md"],
      render: (_, record) => (
        <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-border bg-background/50 shrink-0">
          <ProductImage
            src={getProductImage(record)}
            alt={record.name}
            iconClassName="h-5 w-5 text-stone-400 dark:text-gray-500"
          />
        </div>
      ),
    },
    {
      title: t.admin.productCol,
      key: "name",
      // Capped so short names don't push Price/Stock/Status to the far edge;
      // those three share the rest of the row evenly.
      width: "40%",
      render: (_, record) => {
        const variantCount = record.product_variants?.length ?? 0;
        return (
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2" title={record.name}>
              {record.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {record.category?.name || t.admin.uncategorized}
              {variantCount > 0 &&
                ` · ${t.admin.productVariantCount.replace("{count}", n(variantCount))}`}
            </span>
            {renderBadges(record)}
          </div>
        );
      },
    },
    {
      title: t.admin.productPriceCol,
      key: "price",
      align: "center",
      responsive: ["md"],
      render: (_, record) => renderPrice(record),
    },
    {
      title: t.admin.productStockCol,
      key: "stock",
      align: "center",
      responsive: ["md"],
      render: (_, record) => renderStock(record),
    },
    {
      title: t.admin.statusCol,
      key: "status",
      align: "center",
      responsive: ["md"],
      render: (_, record) => <StatusBadge status={record.status as ProductStatus} />,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 96,
      render: (_, record) => renderActions(record),
    },
  ];
  // The drag handle only appears in store order — dragging a newest-first or
  // A–Z list would reorder the storefront by an order nobody is looking at.
  const columns = allowDrag ? allColumns : allColumns.filter((column) => column.key !== "drag");

  return (
    <>
      {/* ── Table header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-base">
            🛍️
          </div>
          <h2 className="text-sm font-bold text-foreground tracking-tight">
            {t.admin.menuAllProducts}
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
          {n(products.length)} {t.admin.itemsLabel}
        </span>
      </div>

      {/* ── Bulk QR selection bar ── */}
      {storeSlug && selectedIds.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-2.5 border-b border-border/60 bg-emerald-50/60 dark:bg-emerald-500/10">
          <span className="text-xs font-semibold text-foreground">
            {n(selectedIds.length)} selected
          </span>
          <div className="flex items-center gap-2">
            {qrAllowed ? (
              <Dropdown.Button
                size="small"
                type="primary"
                onClick={() => handleGenerateLabels("pages")}
                loading={bulkGenerating}
                disabled={bulkGenerating}
                menu={{
                  items: qrLayoutMenuItems,
                  onClick: ({ key }) => handleGenerateLabels(key as QrLayout),
                }}
              >
                <QrCode className="w-3.5 h-3.5 mr-1.5 inline-block align-text-bottom" />
                QR Labels
              </Dropdown.Button>
            ) : (
              <Popover
                content={
                  <FeatureUpsell
                    title="QR labels are a Pro feature"
                    description="Your current plan doesn't include QR code labels. Upgrade to print them for your catalog."
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button size="small" icon={<LockOutlined />}>
                  QR Labels
                </Button>
              </Popover>
            )}
            {barcodeAllowed ? (
              <Button
                size="small"
                onClick={handleGenerateBarcodeLabels}
                loading={bulkGenerating}
                disabled={bulkGenerating}
              >
                <Barcode className="w-3.5 h-3.5 mr-1.5 inline-block align-text-bottom" />
                Barcode Labels
              </Button>
            ) : (
              <Popover
                content={
                  <FeatureUpsell
                    title="Barcode labels are a Pro feature"
                    description="Your current plan doesn't include barcode labels. Upgrade to print them for your catalog."
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button size="small" icon={<LockOutlined />}>
                  Barcode Labels
                </Button>
              </Popover>
            )}
            <Button size="small" onClick={() => setSelectedIds([])} disabled={bulkGenerating}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Mobile cards ── */}
      <div className="md:hidden flex flex-col gap-2.5 p-3">
        {orderedProducts.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-4xl">📦</span>
            <p className="text-sm text-muted-foreground">
              {t.admin.noProductsFound}
            </p>
          </div>
        )}

        {orderedProducts.map((record) => {
          const variants = record.product_variants || [];

          return (
            <ProductCardLayout
              key={record.id}
              selection={
                storeSlug && (
                  <Checkbox
                    checked={selectedIds.includes(record.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked
                          ? [...prev, record.id]
                          : prev.filter((id) => id !== record.id),
                      )
                    }
                  />
                )
              }
              image={
                <ProductImage
                  src={getProductImage(record)}
                  alt={record.name}
                  iconClassName="h-8 w-8 text-stone-400 dark:text-gray-500"
                />
              }
              title={record.name}
              subtitle={record.category?.name || t.admin.uncategorized}
              content={
                <div className="flex flex-col gap-2.5 mt-1">
                  {/* Variants */}
                  {variants.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <VariantChip
                        label={`${variants[0].variant_name ?? "Unnamed"}: ${cur}${n(variants[0].base_price ?? 0)}`}
                      />
                      {variants.length > 1 && (
                        <span className="text-[11px] text-muted-foreground">
                          +{n(variants.length - 1)} {t.admin.moreVariants}
                        </span>
                      )}
                    </div>
                  )}

                  {renderBadges(record)}

                  {/* Price + Stock + Status + Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {renderPrice(record)}
                      {renderStock(record)}
                    </div>
                    <StatusBadge status={record.status as ProductStatus} />
                    <div className="ml-auto">{renderActions(record)}</div>
                  </div>
                </div>
              }
            />
          );
        })}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        {allowDrag && (
          <p className="px-4 pb-2 text-xs text-muted-foreground">{t.admin.productDragHint}</p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedProducts.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <DataTable<ProductWithVariants>
              columns={columns}
              data={orderedProducts}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="middle"
              bordered={false}
              components={allowDrag ? { body: { row: SortableTableRow } } : undefined}
              rowClassName={(record) =>
                record.id === highlightId ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
              }
              rowSelection={
                storeSlug
                  ? {
                      selectedRowKeys: selectedIds,
                      onChange: (keys) => setSelectedIds(keys as string[]),
                    }
                  : undefined
              }
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* ── Delete Modal ── */}
      <Modal
        open={modalOpen}
        title={
          <span className="text-sm font-bold text-foreground">
            {t.admin.deleteProductTitle}
          </span>
        }
        onOk={handleDelete}
        onCancel={() => setModalOpen(false)}
        okText={t.admin.deleteBtn}
        cancelText={t.admin.cancelBtn}
        confirmLoading={deleteLoading}
        centered
        okButtonProps={{ danger: true }}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t.admin.deleteProductConfirm}
        </p>
      </Modal>

      {storeSlug && (
        <ProductQrModal
          open={!!qrProduct}
          onClose={() => setQrProduct(null)}
          product={qrProduct}
          storeSlug={storeSlug}
          storeName={storeName || "My Shop"}
          logoUrl={storeLogoUrl}
          initialMode={qrInitialMode}
          qrAllowed={qrAllowed}
          barcodeAllowed={barcodeAllowed}
        />
      )}

      <QrLabelPreviewModal
        open={bulkLabelsPreviewOpen}
        pdfBlob={bulkLabelsBlob}
        fileName={bulkLabelsFileName}
        title={bulkLabelsTitle}
        preferShare={bulkLabelsPreferShare}
        onClose={() => setBulkLabelsPreviewOpen(false)}
      />
    </>
  );
};

export default ProductTable;
