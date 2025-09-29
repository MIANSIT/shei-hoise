"use client";

import React from "react";
import { useDropzone } from "react-dropzone";
import { FrontendImage } from "@/lib/types/frontendImage";

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
      imageUrl: URL.createObjectURL(file), // preview only
      altText: file.name,
      isPrimary: images.length + index === 0,
    }));

    setImages([...images, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={`mt-2 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition hover:border-yellow-400 ${
          isDragActive ? "border-yellow-500" : "border-gray-600"
        }`}
      >
        <input {...getInputProps()} />
        <p className="font-medium">
          {isDragActive
            ? "Drop images here..."
            : "Drag and drop images here or click to browse"}
        </p>
        <p className="text-xs">
          Accepted formats: <span>.jpeg, .png, .webp</span> <br />
          Max 5 images
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default ImageUploader;
