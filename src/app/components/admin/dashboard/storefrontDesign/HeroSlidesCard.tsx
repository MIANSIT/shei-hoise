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
import { getHeroSlidesForAdmin } from "@/lib/queries/storefront/heroSlides/getHeroSlidesForAdmin";
import { createHeroSlide } from "@/lib/queries/storefront/heroSlides/createHeroSlide";
import { updateHeroSlide } from "@/lib/queries/storefront/heroSlides/updateHeroSlide";
import { deleteHeroSlide } from "@/lib/queries/storefront/heroSlides/deleteHeroSlide";
import { reorderHeroSlides } from "@/lib/queries/storefront/heroSlides/reorderHeroSlides";
import type { HeroSlide } from "@/lib/types/heroSlide";
import SlideFormModal, { type SlideFormValues } from "./SlideFormModal";

const MAX_SLIDES = 10;

function SortableSlideRow({
  slide,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  slide: HeroSlide;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
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
        {slide.image_url ? (
          <Image src={slide.image_url} alt={slide.headline ?? ""} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{slide.headline || "Untitled slide"}</p>
        {slide.subtext && <p className="text-xs text-muted-foreground truncate">{slide.subtext}</p>}
      </div>

      <Switch checked={slide.is_active} onChange={onToggleActive} size="small" />

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

export function HeroSlidesCard() {
  const notify = useSheiNotification();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getHeroSlidesForAdmin()
      .then(setSlides)
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
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(slides, oldIndex, newIndex);
    setSlides(reordered);
    const result = await reorderHeroSlides(reordered.map((s) => s.id));
    if (!result.success) {
      notify.error(result.error ?? "Failed to save the new order");
      load();
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditingSlide(null);
    setModalOpen(true);
  };
  const openEdit = (slide: HeroSlide) => {
    setMode("edit");
    setEditingSlide(slide);
    setModalOpen(true);
  };

  const handleSubmit = async (values: SlideFormValues, file: File | null) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        if (!file) return;
        const result = await createHeroSlide(file, { ...values, is_active: values.is_active });
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success("Slide added");
      } else if (editingSlide) {
        const result = await updateHeroSlide(editingSlide.id, { ...values, is_active: values.is_active }, file);
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success("Slide updated");
      }
      setModalOpen(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (slide: HeroSlide, active: boolean) => {
    setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, is_active: active } : s)));
    const result = await updateHeroSlide(
      slide.id,
      {
        headline: slide.headline,
        subtext: slide.subtext,
        button_text: slide.button_text,
        button_link: slide.button_link,
        is_active: active,
      },
      null,
    );
    if (!result.success) {
      notify.error(result.error);
      load();
    }
  };

  const handleDelete = (slide: HeroSlide) => {
    AntModal.confirm({
      title: "Delete this slide?",
      content: "This can't be undone — the image will be removed from storage too.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await deleteHeroSlide(slide.id);
        if (!result.success) {
          notify.error(result.error ?? "Failed to delete slide");
          return;
        }
        setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      },
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground max-w-md">
          Shown as a carousel at the top of your homepage — drag to reorder.
        </p>
        <button
          type="button"
          onClick={openCreate}
          disabled={slides.length >= MAX_SLIDES}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Slide
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : slides.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No slides yet — your homepage will show its default banner until you add one.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map((slide) => (
                <SortableSlideRow
                  key={slide.id}
                  slide={slide}
                  onEdit={() => openEdit(slide)}
                  onDelete={() => handleDelete(slide)}
                  onToggleActive={(active) => handleToggleActive(slide, active)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <SlideFormModal
        open={modalOpen}
        mode={mode}
        editingSlide={editingSlide}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
