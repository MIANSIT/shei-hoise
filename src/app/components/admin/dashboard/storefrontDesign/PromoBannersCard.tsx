"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Switch, Modal as AntModal } from "antd";
import { GripVertical, Pencil, Trash2, Plus, ImageOff } from "lucide-react";
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
import { getPromoBannersForAdmin } from "@/lib/queries/storefront/promoBanners/getPromoBannersForAdmin";
import { createPromoBanner } from "@/lib/queries/storefront/promoBanners/createPromoBanner";
import { updatePromoBanner } from "@/lib/queries/storefront/promoBanners/updatePromoBanner";
import { deletePromoBanner } from "@/lib/queries/storefront/promoBanners/deletePromoBanner";
import { reorderPromoBanners } from "@/lib/queries/storefront/promoBanners/reorderPromoBanners";
import type { PromoBanner } from "@/lib/types/promoBanner";
import PromoBannerFormModal, { type PromoBannerFormValues } from "./PromoBannerFormModal";

const MAX_BANNERS = 10;

function SortableBannerRow({
  banner,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  banner: PromoBanner;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border p-3 bg-card ${isDragging ? "shadow-lg ring-2 ring-primary" : "border-border"}`}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: "none" }}
        className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
      >
        <GripVertical className="h-4.5 w-4.5" />
      </div>

      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {banner.image_url ? (
          <Image src={banner.image_url} alt={banner.headline ?? ""} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{banner.headline || "Untitled banner"}</p>
        {banner.subtext && <p className="text-xs text-muted-foreground truncate">{banner.subtext}</p>}
      </div>

      <Switch checked={banner.is_active} onChange={onToggleActive} size="small" />

      <button
        type="button"
        onClick={onEdit}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function PromoBannersCard() {
  const notify = useSheiNotification();
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getPromoBannersForAdmin()
      .then(setBanners)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(banners, oldIndex, newIndex);
    setBanners(reordered);
    const result = await reorderPromoBanners(reordered.map((b) => b.id));
    if (!result.success) {
      notify.error(result.error ?? "Failed to save the new order");
      load();
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditingBanner(null);
    setModalOpen(true);
  };
  const openEdit = (banner: PromoBanner) => {
    setMode("edit");
    setEditingBanner(banner);
    setModalOpen(true);
  };

  const handleSubmit = async (values: PromoBannerFormValues, file: File | null) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        if (!file) return;
        const result = await createPromoBanner(file, { ...values, is_active: values.is_active });
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success("Banner added");
      } else if (editingBanner) {
        const result = await updatePromoBanner(editingBanner.id, { ...values, is_active: values.is_active }, file);
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success("Banner updated");
      }
      setModalOpen(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: PromoBanner, active: boolean) => {
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, is_active: active } : b)));
    const result = await updatePromoBanner(
      banner.id,
      {
        headline: banner.headline,
        subtext: banner.subtext,
        button_text: banner.button_text,
        button_link: banner.button_link,
        is_active: active,
      },
      null,
    );
    if (!result.success) {
      notify.error(result.error);
      load();
    }
  };

  const handleDelete = (banner: PromoBanner) => {
    AntModal.confirm({
      title: "Delete this banner?",
      content: "This can't be undone — the image will be removed from storage too.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await deletePromoBanner(banner.id);
        if (!result.success) {
          notify.error(result.error ?? "Failed to delete banner");
          return;
        }
        setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      },
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground max-w-md">
          The first 2 active banners are shown on your homepage — drag to reorder which ones.
        </p>
        <button
          type="button"
          onClick={openCreate}
          disabled={banners.length >= MAX_BANNERS}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Banner
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No promo banners yet — this section won&apos;t show on your homepage until you add at least one.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {banners.map((banner) => (
                <SortableBannerRow
                  key={banner.id}
                  banner={banner}
                  onEdit={() => openEdit(banner)}
                  onDelete={() => handleDelete(banner)}
                  onToggleActive={(active) => handleToggleActive(banner, active)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <PromoBannerFormModal
        open={modalOpen}
        mode={mode}
        editingBanner={editingBanner}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
