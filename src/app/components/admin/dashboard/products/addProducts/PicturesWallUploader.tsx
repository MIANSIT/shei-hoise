// File: components/product/PicturesWallUploader.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Upload, Modal } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload";
import { FrontendImage } from "@/lib/types/frontendImage";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
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
}

const SortableItem: React.FC<SortableItemProps> = ({
  file,
  index,
  onPreview,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: file.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    touchAction: "pan-y", // important for mobile scroll + drag
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners} // attach listeners here for full item drag
      className="relative w-24 h-24 flex items-center justify-center border rounded"
    >
      <span className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold px-1 rounded-br">
        {index + 1}
      </span>

      <div
        className="w-full h-full cursor-pointer"
        onClick={() => onPreview(file)}
      >
        {file.url || file.thumbUrl ? (
          <Image
            src={file.url || file.thumbUrl!}
            alt={file.name || ""}
            width={96}
            height={96}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            No Preview
          </div>
        )}
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

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || file.thumbUrl || "");
    setPreviewTitle(file.name || "");
    setPreviewOpen(true);
  };

  const handleBeforeUpload = (file: File) => {
    const isLt5M = file.size / 1024 / 1024 <= 5;
    if (!isLt5M) alert(`${file.name} is too large. Max size is 5MB.`);
    return isLt5M;
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    const limitedFiles = newFileList.slice(0, 5);
    setFileList(limitedFiles);

    const newImages: FrontendImage[] = limitedFiles.map((file, index) => {
      let previewUrl = file.url || file.thumbUrl || "";
      if (!previewUrl && file.originFileObj) {
        previewUrl = URL.createObjectURL(file.originFileObj);
      }
      return {
        imageUrl: previewUrl,
        altText: file.name,
        isPrimary: index === 0,
      };
    });

    setImages(newImages);
  };

  // ✅ Mobile-compatible sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fileList.findIndex((f) => f.uid === active.id);
    const newIndex = fileList.findIndex((f) => f.uid === over.id);

    const newFileList = arrayMove(fileList, oldIndex, newIndex);
    setFileList(newFileList);

    const newImages: FrontendImage[] = newFileList.map((file, index) => ({
      imageUrl: file.url || file.thumbUrl || "",
      altText: file.name,
      isPrimary: index === 0,
    }));
    setImages(newImages);
  };

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fileList.map((f) => f.uid)}
          strategy={verticalListSortingStrategy}
        >
          <Upload
            action={undefined}
            listType="picture-card"
            fileList={fileList}
            onPreview={handlePreview}
            onChange={handleChange}
            beforeUpload={handleBeforeUpload}
          >
            {fileList.length >= 5 ? null : <div>Upload</div>}
          </Upload>

          <div className="mt-2">
            <h3 className="text-lg font-semibold mb-2">Rearrange Images</h3>
            <div className="flex gap-2 flex-wrap">
              {fileList.map((file, index) => (
                <SortableItem
                  key={file.uid}
                  file={file}
                  onPreview={handlePreview}
                  index={index}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        {previewImage && (
          <div className="relative w-full h-96">
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

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default PicturesWallUploader;
