"use client";

import { useEffect, useState } from "react";
import { GripVertical, ArrowLeft } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getProductsWithVariants, ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { reorderProducts } from "@/lib/queries/products/reorderProducts";
import { ProductImage } from "@/app/components/products/ProductImage";

interface ProductReorderListProps {
  storeId: string;
  /** Scrolled to and briefly highlighted once the list loads — set right after creating a product, since it always lands at the very end of this list. */
  highlightId?: string | null;
  /** Back to the normal paginated/filtered browse view. */
  onDone: () => void;
}

const getProductImageUrl = (record: ProductWithVariants): string | null => {
  const img =
    record.product_images?.find((i) => i.is_primary) ||
    record.product_images?.[0] ||
    record.product_variants?.flatMap((v) => v.product_images || []).find((i) => i.is_primary) ||
    record.product_variants?.flatMap((v) => v.product_images || [])[0];
  return img?.image_url || null;
};

function SortableProductRow({ product, highlighted }: { product: ProductWithVariants; highlighted: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      id={`product-row-${product.id}`}
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors duration-500 ${
        isDragging
          ? "shadow-lg ring-2 ring-primary bg-card border-border"
          : highlighted
            ? "bg-primary/10 border-primary ring-2 ring-primary"
            : "bg-card border-border"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: "none" }}
        className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
      >
        <GripVertical className="h-4.5 w-4.5" />
      </div>

      <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-border bg-background/50 shrink-0">
        <ProductImage src={getProductImageUrl(product)} alt={product.name} iconClassName="h-5 w-5 text-stone-400 dark:text-gray-500" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground truncate">{product.category?.name || "Uncategorized"}</p>
      </div>
    </div>
  );
}

/**
 * The whole (non-bundle) catalog in one unpaginated drag list — the fix for
 * what page-scoped drag in ProductTable can't do: reorder a product that's
 * alone on its page (nothing there to drag against), or drop a product into
 * the *middle* of the catalog rather than only ever the top or bottom.
 * Everything is visible at once, so any product can be dragged next to any
 * other regardless of where pagination would otherwise have split them.
 */
export function ProductReorderList({ storeId, highlightId, onDone }: ProductReorderListProps) {
  const notify = useSheiNotification();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [pulseId, setPulseId] = useState(highlightId ?? null);

  useEffect(() => {
    setLoading(true);
    getProductsWithVariants({ storeId, excludeBundles: true, withCounts: false })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Scroll the newly-added product into view once the list has actually
  // rendered it, then let the highlight fade after a few seconds — it's a
  // one-time "here it is" cue, not a permanent marker.
  useEffect(() => {
    if (!pulseId || loading) return;
    const el = document.getElementById(`product-row-${pulseId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => setPulseId(null), 2500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pulseId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = products;
    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);
    setSavingOrder(true);
    try {
      const result = await reorderProducts(reordered.map((p) => p.id));
      if (!result.success) {
        setProducts(previous);
        notify.error(result.error ?? "Couldn't save the new order");
      }
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight">Reorder products</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your whole catalog, one list — drag any product anywhere, including into the middle.
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Done
        </button>
      </div>

      <div className="p-3">
        {loading ? (
          <p className="text-sm text-muted-foreground px-2 py-6 text-center">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-6 text-center">No products to reorder yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {products.map((product) => (
                  <SortableProductRow key={product.id} product={product} highlighted={product.id === pulseId} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {savingOrder && <p className="text-xs text-muted-foreground text-center pt-2">Saving order…</p>}
      </div>
    </div>
  );
}
