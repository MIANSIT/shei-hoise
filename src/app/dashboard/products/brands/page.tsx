"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Spin } from "antd";
import { Award, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";
import ConfirmModal from "@/app/components/admin/common/ConfirmModal";
import {
  BrandFormModal,
  type BrandFormValues,
} from "@/app/components/admin/dashboard/products/brands/BrandFormModal";
import { getBrands } from "@/lib/queries/brands/getBrands";
import { createBrand } from "@/lib/queries/brands/createBrand";
import { updateBrand } from "@/lib/queries/brands/updateBrand";
import { deleteBrand } from "@/lib/queries/brands/deleteBrand";
import { reorderBrands } from "@/lib/queries/brands/reorderBrands";
import { BRANDS_FEATURE_KEY, type Brand } from "@/lib/types/brand";

interface SortableBrandCardProps {
  brand: Brand;
  productCount: number;
  canDrag: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableBrandCard({ brand, productCount, canDrag, onEdit, onDelete }: SortableBrandCardProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: brand.id, disabled: !canDrag });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`flex items-center gap-2 rounded-xl border bg-card p-3 ${
        isDragging ? "relative z-10 border-primary shadow-lg ring-2 ring-primary" : "border-border"
      }`}
    >
      {canDrag && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${t.admin.brandsDragHandle}: ${brand.name}`}
          title={t.admin.brandsDragHandle}
          style={{ touchAction: "none" }}
          className="flex h-10 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {brand.logo_url ? (
          <Image src={brand.logo_url} alt={brand.name} fill className="object-contain p-1.5" sizes="64px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Award className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{brand.name}</p>
        <p className="text-xs text-muted-foreground">{t.admin.brandsProductCount.replace("{n}", n(productCount))}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            brand.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {brand.is_active ? t.admin.brandsActive : t.admin.brandsInactive}
        </span>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${t.admin.brandsEdit} ${brand.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${t.admin.brandsDelete} ${brand.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-rose-500 transition-colors hover:bg-rose-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function BrandsPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const notify = useSheiNotification();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, BRANDS_FEATURE_KEY);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [limit, setLimit] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBrands();
      if (!result.success) {
        notify.error(result.error);
        return;
      }
      setBrands(result.brands);
      setProductCounts(result.productCounts);
      setLimit(result.limit);
    } catch (err) {
      console.error("Failed to load brands:", err);
      notify.error(t.admin.brandsLoadFailed);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userLoading && !featureLoading && allowed) void loadBrands();
  }, [userLoading, featureLoading, allowed, loadBrands]);

  const visibleBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands;
  }, [brands, search]);

  const limitReached = limit !== -1 && brands.length >= limit;

  // Reordering a filtered list would be ambiguous, so dragging is off while searching.
  const canReorder = brands.length > 1 && !search.trim();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!canReorder || !over || active.id === over.id) return;
    const oldIndex = brands.findIndex((b) => b.id === active.id);
    const newIndex = brands.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(brands, oldIndex, newIndex);
    setBrands(reordered);
    try {
      const result = await reorderBrands(reordered.map((b) => b.id));
      if (!result.success) {
        notify.error(result.error);
        await loadBrands();
      }
    } catch (err) {
      console.error("Failed to reorder brands:", err);
      notify.error(t.admin.brandsReorderFailed);
      await loadBrands();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setFormOpen(true);
  };

  const handleSubmit = async (values: BrandFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        const result = await updateBrand(
          { id: editing.id, name: values.name, is_active: values.is_active },
          values.logo,
        );
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success(`"${values.name}" – ${t.admin.brandsUpdated}`);
      } else {
        const result = await createBrand({ name: values.name, is_active: values.is_active }, values.logo);
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success(`"${values.name}" – ${t.admin.brandsCreated}`);
        if (result.logoError) notify.error(`${t.admin.brandsLogoFailed} ${result.logoError}`);
      }
      setFormOpen(false);
      setEditing(null);
      await loadBrands();
    } catch (err) {
      console.error("Failed to save brand:", err);
      notify.error(t.admin.brandsSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const result = await deleteBrand(deleting.id);
      if (!result.success) {
        notify.error(result.error);
        return;
      }
      notify.info(`"${deleting.name}" – ${t.admin.brandsDeleted}`);
      setDeleting(null);
      await loadBrands();
    } catch (err) {
      console.error("Failed to delete brand:", err);
      notify.error(t.admin.brandsDeleteFailed);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (userLoading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) return <FeatureLocked />;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-0.5">
              {t.admin.brandsSubtitle}
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
              {t.admin.brandsTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">{t.admin.brandsIntro}</p>
            {limit !== -1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t.admin.brandsUsage.replace("{used}", n(brands.length)).replace("{limit}", n(limit))}
              </p>
            )}
          </div>
          <Button onClick={openCreate} disabled={limitReached}>
            <Plus className="mr-2 h-4 w-4" />
            {t.admin.brandsNew}
          </Button>
        </div>

        {brands.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.brandsSearch}
              className="h-10 pl-9"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spin size="large" />
          </div>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Award className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">{t.admin.brandsEmptyTitle}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t.admin.brandsEmptyHint}</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t.admin.brandsNew}
            </Button>
          </div>
        ) : visibleBrands.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t.admin.brandsNoMatch}</p>
        ) : (
          <>
            {!search.trim() && brands.length > 1 && (
              <p className="text-xs text-muted-foreground">{t.admin.brandsDragHint}</p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleBrands.map((b) => b.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleBrands.map((brand) => (
                    <SortableBrandCard
                      key={brand.id}
                      brand={brand}
                      productCount={productCounts[brand.id] ?? 0}
                      canDrag={canReorder}
                      onEdit={() => openEdit(brand)}
                      onDelete={() => setDeleting(brand)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      <BrandFormModal
        open={formOpen}
        brand={editing}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={t.admin.brandsDeleteTitle}
        message={
          <p>
            <span className="font-semibold">{deleting?.name}</span>
            <br />
            {t.admin.brandsDeleteNote}
          </p>
        }
        confirmText={t.admin.brandsDelete}
        cancelText={t.admin.brandsCancel}
        type="danger"
        confirmLoading={deleteBusy}
      />
    </div>
  );
}
