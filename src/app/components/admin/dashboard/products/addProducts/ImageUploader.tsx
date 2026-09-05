"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FrontendImage } from "@/lib/types/frontendImage";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { fileToBase64 } from "@/lib/utils/fileToBase64";
import { useTranslation } from "@/lib/hook/useTranslation";

interface ImageUploaderProps {
  images: FrontendImage[];
  setImages: (files: FrontendImage[]) => void;
  error?: string;
}

// Recognized by extension as a fallback for files whose browser/OS-reported
// MIME type doesn't start with "image/" — some Photoshop exports come
// through with a missing or unusual MIME type, which would otherwise make
// react-dropzone's "image/*" accept filter reject them with no feedback.
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|tiff?|avif|heic|heif)$/i;

const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  setImages,
  error,
}) => {
  const t = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploadError(null);
    setIsProcessing(true);
    try {
      const availableSlots = 5 - images.length;
      const filesToAdd = acceptedFiles.slice(0, availableSlots);
      const newImages: FrontendImage[] = await Promise.all(
        filesToAdd.map(async (file, index) => ({
          imageUrl: await fileToBase64(file),
          altText: file.name,
          isPrimary: images.length + index === 0,
        }))
      );
      setImages([...images, ...newImages]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to read image file",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    maxSize: 3 * 1024 * 1024,
    onDropRejected: (rejectedFiles) => {
      // A file whose only problem is a MIME type react-dropzone doesn't
      // recognize (common with some Photoshop exports) still gets a real
      // shot via onDrop instead of vanishing with no feedback.
      const salvageable: File[] = [];
      const messages: string[] = [];

      rejectedFiles.forEach(({ file, errors }) => {
        const onlyInvalidType =
          errors.length === 1 && errors[0].code === "file-invalid-type";
        if (onlyInvalidType && IMAGE_EXTENSIONS.test(file.name)) {
          salvageable.push(file);
          return;
        }
        if (file.size > 3 * 1024 * 1024) {
          messages.push(`${file.name} is too large. Max size is 3MB.`);
        } else {
          messages.push(`${file.name} couldn't be added (unrecognized file type).`);
        }
      });

      if (messages.length) setUploadError(messages.join(" "));
      if (salvageable.length) onDrop(salvageable);
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
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>

          <div>
            <p className="font-semibold text-foreground">
              {isProcessing
                ? "Adding image…"
                : isDragActive
                  ? t.admin.imgDropHere
                  : t.admin.imgDragHere}
            </p>
            {!isProcessing && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t.admin.imgOrText}{" "}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {t.admin.imgBrowse}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">
              {t.admin.imgFormats}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {t.admin.imgMaxCount}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">{t.admin.imgMaxSize}</span>
          </div>
        </div>
      </div>

      {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

export default ImageUploader;
