"use client";
import React from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";


interface ImageUploaderProps {
  images: (File | string)[];
  setImages: (files: (File | string)[]) => void;
  error?: string; // 👈 add error prop
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, setImages, error }) => {
  const onDrop = (acceptedFiles: File[]) => {
    setImages([
      ...images.filter((img): img is File => img instanceof File), // keep existing files only
      ...acceptedFiles,
    ]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Upload Images</Label>

      <div
        {...getRootProps()}
        className={`mt-2 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition bg-gray-900 hover:border-blue-400 ${
          isDragActive ? "border-blue-500 bg-gray-800" : "border-gray-600"
        }`}
      >
        <input {...getInputProps()} multiple />
        <div className="flex flex-col items-center justify-center space-y-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4"
            />
          </svg>
          {isDragActive ? (
            <p className="text-gray-300 font-medium">Drop images here...</p>
          ) : (
            <p className="text-gray-300 font-medium">
              Drag and drop an image here or click to browse
            </p>
          )}
          <p className="text-xs text-gray-500">
            Accepted formats: <span className="text-gray-400">.jpeg, .png, .webp</span> <br />
            Max size: <span className="text-gray-400">5MB</span>
          </p>
        </div>
      </div>

      {/* Show error message below dropzone */}
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

      {/* Previews */}
      <div className="flex flex-wrap gap-4 mt-4">
        {images.map((file, idx) => (
          <div
            key={idx}
            className="w-24 h-24 relative overflow-hidden rounded-md border border-gray-700 bg-gray-800"
          >
            <Image
              src={file instanceof File ? URL.createObjectURL(file) : file}
              alt={`preview-${idx}`}
              fill
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(idx)}
              className="absolute top-1 right-1 bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;
