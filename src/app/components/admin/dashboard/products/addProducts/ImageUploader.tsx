"use client";
import React from "react";
import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";

interface ImageObj {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
  file?: File; // optional, if it's a new uploaded file
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
            <p className="font-medium">Drop images here...</p>
          ) : (
            <p className="font-medium">
              Drag and drop images here or click to browse
            </p>
          )}
          <p className="text-xs">
            Accepted formats: <span>.jpeg, .png, .webp</span> <br />
            Max size: <span>5MB</span>
          </p>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

      {/* Preview */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-24 h-24 border rounded overflow-hidden">
              <img
                src={img.imageUrl}
                alt={img.altText || "preview"}
                className="w-full h-full object-cover"
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
