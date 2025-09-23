// File: components/product/ImageUploader.tsx
"use client";
import React from "react";
import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";
import Image from "next/image";

export interface ImageObj {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
  file?: File;
}

interface ImageUploaderProps {
  images: ImageObj[];
  setImages: (files: ImageObj[]) => void;
  error?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, setImages, error }) => {
  const onDrop = (acceptedFiles: File[]) => {
    const newImages: ImageObj[] = acceptedFiles.map((file) => ({
      file,
      imageUrl: URL.createObjectURL(file),
    }));
    setImages([...images, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  return (
    <div className="flex flex-col gap-2">
      <Label>Upload Images</Label>
      <div
        {...getRootProps()}
        className={`mt-2 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition hover:border-yellow-400 ${
          isDragActive ? "border-yellow-500" : "border-gray-600"
        }`}
      >
        <input {...getInputProps()} multiple />
        <p className="font-medium">
          {isDragActive ? "Drop images here..." : "Drag and drop or click to browse"}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-24 h-24">
              <Image
                src={img.imageUrl}
                alt={img.altText || "preview"}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setImages(images.filter((_, i) => i !== idx))}
                className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-bl"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
