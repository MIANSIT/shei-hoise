"use client";
import React from "react";
import { useDropzone } from "react-dropzone";

interface ImageObj {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
}

interface ImageUploaderProps {
  images: ImageObj[];
  setImages: (files: ImageObj[]) => void;
  error?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  setImages,
  error,
}) => {
  const onDrop = (acceptedFiles: File[]) => {
    // Convert files to DB-safe image URLs
    const newImages: ImageObj[] = acceptedFiles.map((file) => ({
      imageUrl: URL.createObjectURL(file), // temporary preview
      altText: file.name,
      isPrimary: false,
    }));

    setImages([...images, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  return (
    <div className="flex flex-col gap-2">
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
          <p className="font-medium">
            {isDragActive
              ? "Drop images here..."
              : "Drag and drop images here or click to browse"}
          </p>
          <p className="text-xs">
            Accepted formats: <span>.jpeg, .png, .webp</span> <br />
            Max size: <span>5MB</span>
          </p>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default ImageUploader;
