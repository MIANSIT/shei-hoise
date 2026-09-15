"use client";

import { useEffect, useState } from "react";
import { Switch, Modal as AntModal } from "antd";
import { GripVertical, Pencil, Trash2, Plus, Megaphone } from "lucide-react";
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
import { getAnnouncementsForAdmin } from "@/lib/queries/storefront/announcements/getAnnouncementsForAdmin";
import { createAnnouncement } from "@/lib/queries/storefront/announcements/createAnnouncement";
import { updateAnnouncement } from "@/lib/queries/storefront/announcements/updateAnnouncement";
import { deleteAnnouncement } from "@/lib/queries/storefront/announcements/deleteAnnouncement";
import { reorderAnnouncements } from "@/lib/queries/storefront/announcements/reorderAnnouncements";
import type { Announcement } from "@/lib/types/announcement";
import AnnouncementFormModal, { type AnnouncementFormValues } from "./AnnouncementFormModal";

const MAX_ANNOUNCEMENTS = 10;

function SortableAnnouncementRow({
  announcement,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  announcement: Announcement;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: announcement.id });
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

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{announcement.text}</p>
      </div>

      <Switch checked={announcement.is_active} onChange={onToggleActive} size="small" />

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

export function AnnouncementsCard() {
  const notify = useSheiNotification();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getAnnouncementsForAdmin()
      .then(setAnnouncements)
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
    const oldIndex = announcements.findIndex((a) => a.id === active.id);
    const newIndex = announcements.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(announcements, oldIndex, newIndex);
    setAnnouncements(reordered);
    const result = await reorderAnnouncements(reordered.map((a) => a.id));
    if (!result.success) {
      notify.error(result.error ?? "Failed to save the new order");
      load();
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditingAnnouncement(null);
    setModalOpen(true);
  };
  const openEdit = (announcement: Announcement) => {
    setMode("edit");
    setEditingAnnouncement(announcement);
    setModalOpen(true);
  };

  const handleSubmit = async (values: AnnouncementFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        const result = await createAnnouncement(values);
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success("Announcement added");
      } else if (editingAnnouncement) {
        const result = await updateAnnouncement(editingAnnouncement.id, values);
        if (!result.success) {
          notify.error(result.error);
          return;
        }
        notify.success("Announcement updated");
      }
      setModalOpen(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (announcement: Announcement, active: boolean) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? { ...a, is_active: active } : a)));
    const result = await updateAnnouncement(announcement.id, { text: announcement.text, is_active: active });
    if (!result.success) {
      notify.error(result.error);
      load();
    }
  };

  const handleDelete = (announcement: Announcement) => {
    AntModal.confirm({
      title: "Delete this announcement?",
      content: "This can't be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await deleteAnnouncement(announcement.id);
        if (!result.success) {
          notify.error(result.error ?? "Failed to delete announcement");
          return;
        }
        setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
      },
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
            Shown above your homepage header. Add more than one and they scroll past like a
            news ticker — drag to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={announcements.length >= MAX_ANNOUNCEMENTS}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No announcements yet — the bar above your storefront header stays hidden until you add one
          (or set a free-shipping threshold in Shipping settings).
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={announcements.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {announcements.map((announcement) => (
                <SortableAnnouncementRow
                  key={announcement.id}
                  announcement={announcement}
                  onEdit={() => openEdit(announcement)}
                  onDelete={() => handleDelete(announcement)}
                  onToggleActive={(active) => handleToggleActive(announcement, active)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AnnouncementFormModal
        open={modalOpen}
        mode={mode}
        editingAnnouncement={editingAnnouncement}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
