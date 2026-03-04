"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Upload, Modal } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload";
import { FrontendImage } from "@/lib/types/frontendImage";
import { Eye, Trash2, GripVertical, Star } from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PicturesWallUploaderProps {
  images: FrontendImage[];
  setImages: (files: FrontendImage[]) => void;
  error?: string;
}

interface SortableItemProps {
  file: UploadFile;
  index: number;
  onPreview: (file: UploadFile) => void;
  onRemove: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  file,
  index,
  onPreview,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.uid,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const src = file.url || file.thumbUrl || "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative shrink-0"
    >
      <div
        className={`relative h-28 w-28 overflow-hidden rounded-xl border-2 transition-all
          ${isDragging ? "shadow-xl ring-2 ring-emerald-500" : ""}
          ${index === 0 ? "border-emerald-500 shadow-md shadow-emerald-500/20" : "border-border"}`}
      >
        {/* Image — not draggable itself */}
        <div className="h-full w-full select-none">
          {src ? (
            <Image
              src={src}
              alt={file.name || ""}
              fill
              style={{ objectFit: "cover" }}
              unoptimized
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              Uploading…
            </div>
          )}
        </div>

        {/* Primary badge */}
        {index === 0 && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow pointer-events-none">
            <Star className="h-2.5 w-2.5 fill-white" />
            Primary
          </div>
        )}

        {/* Number badge (non-primary) */}
        {index > 0 && (
          <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white pointer-events-none">
            {index + 1}
          </div>
        )}

        {/* Action buttons — always visible on mobile, hover on desktop */}
        <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onPreview(file)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-rose-300 hover:bg-black/80 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Drag handle — the ONLY element with dnd listeners */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1.5 bottom-1.5 flex h-7 w-7 touch-none cursor-grab items-center justify-center rounded-full bg-black/60 text-white active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          style={{ touchAction: "none" }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};

const PicturesWallUploader: React.FC<PicturesWallUploaderProps> = ({
  images,
  setImages,
  error,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    const uploadFiles: UploadFile[] = (images ?? []).map((img, index) => ({
      uid: `existing-${index}`,
      name: img.altText || `image-${index}`,
      status: "done",
      url: img.imageUrl,
    }));
    setFileList(uploadFiles);
  }, [images]);

  const handlePreview = (file: UploadFile) => {
    setPreviewImage(file.url || file.thumbUrl || "");
    setPreviewTitle(file.name || "");
    setPreviewOpen(true);
  };

  const handleBeforeUpload = (file: File) => {
    const isLt5M = file.size / 1024 / 1024 <= 5;
    if (!isLt5M) alert(`${file.name} is too large. Max size is 5MB.`);
    return isLt5M;
  };

  const syncImages = (list: UploadFile[]) => {
    const newImages: FrontendImage[] = list.map((file, index) => ({
      imageUrl: file.url || file.thumbUrl || "",
      altText: file.name,
      isPrimary: index === 0,
    }));
    setImages(newImages);
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    const limited = newFileList.slice(0, 5);
    // Generate blob URLs for new files
    const processed = limited.map((file) => {
      if (!file.url && !file.thumbUrl && file.originFileObj) {
        file.thumbUrl = URL.createObjectURL(file.originFileObj);
      }
      return file;
    });
    setFileList(processed);
    syncImages(processed);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small movement required before drag starts — prevents accidental drags on click
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      // No delay since we have a dedicated handle — starts drag immediately on handle touch
      activationConstraint: { delay: 0, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fileList.findIndex((f) => f.uid === active.id);
    const newIndex = fileList.findIndex((f) => f.uid === over.id);
    const newList = arrayMove(fileList, oldIndex, newIndex);
    setFileList(newList);
    syncImages(newList);
  };

  const handleRemove = (uid: string) => {
    const newList = fileList.filter((f) => f.uid !== uid);
    setFileList(newList);
    syncImages(newList);
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fileList.map((f) => f.uid)}
          strategy={horizontalListSortingStrategy}
        >
          {/* Existing images row */}
          {fileList.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {fileList.map((file, index) => (
                <SortableItem
                  key={file.uid}
                  file={file}
                  index={index}
                  onPreview={handlePreview}
                  onRemove={() => handleRemove(file.uid)}
                />
              ))}

              {/* Add more slot */}
              {fileList.length < 5 && (
                <Upload
                  action={undefined}
                  showUploadList={false}
                  multiple
                  accept="image/*"
                  beforeUpload={handleBeforeUpload}
                  onChange={handleChange}
                  fileList={fileList}
                >
                  <button
                    type="button"
                    className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                  >
                    <span className="text-2xl font-light">+</span>
                    <span className="text-[11px] font-medium">Add More</span>
                  </button>
                </Upload>
              )}
            </div>
          )}

          {/* Drop zone when no images */}
          {fileList.length === 0 && (
            <Upload
              action={undefined}
              listType="picture"
              fileList={fileList}
              multiple
              accept="image/*"
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              showUploadList={false}
            >
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-emerald-500 cursor-pointer">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <span className="text-2xl">📷</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Drop images here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG, WEBP · Max 5 images · 5MB each
                  </p>
                </div>
              </div>
            </Upload>
          )}
        </SortableContext>
      </DndContext>

      {fileList.length > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Drag images to reorder. The first image is used as the primary
          listing photo.
        </p>
      )}

      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}

      {/* Preview modal */}
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        {previewImage && (
          <div className="relative h-96 w-full overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={previewImage}
              alt={previewTitle}
              fill
              style={{ objectFit: "contain" }}
              unoptimized
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PicturesWallUploader;
