"use client";

import React from "react";
import { useDropzone } from "react-dropzone";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ImagePlus, UploadCloud } from "lucide-react";

interface ImageUploaderProps {
  images: FrontendImage[];
  setImages: (files: FrontendImage[]) => void;
  error?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  setImages,
  error,
}) => {
  const onDrop = (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const availableSlots = 5 - images.length;
    const filesToAdd = acceptedFiles.slice(0, availableSlots);
    const newImages: FrontendImage[] = filesToAdd.map((file, index) => ({
      imageUrl: URL.createObjectURL(file),
      altText: file.name,
      isPrimary: images.length + index === 0,
    }));
    setImages([...images, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    maxSize: 5 * 1024 * 1024,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        if (file.file.size > 5 * 1024 * 1024) {
          alert(`${file.file.name} is too large. Max size is 5MB.`);
        }
      });
    },
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer
          ${
            isDragActive
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
              : "border-border hover:border-emerald-400 hover:bg-muted/40"
          }`}
      >
        <input {...getInputProps()} />

        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <ImagePlus className="h-48 w-48" />
        </div>

        <div className="relative flex flex-col items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors
            ${isDragActive ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}
          >
            <UploadCloud className="h-6 w-6" />
          </div>

          <div>
            <p className="font-semibold text-foreground">
              {isDragActive
                ? "Drop your images here"
                : "Drag & drop images here"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                browse files
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">
              PNG · JPG · WEBP
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              Max 5 images
            </span>
            <span className="rounded-full bg-muted px-3 py-1">5MB each</span>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

export default ImageUploader;
