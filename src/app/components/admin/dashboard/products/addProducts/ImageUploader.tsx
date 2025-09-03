"use client";
import React from "react";
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



  return (
    <div className="flex flex-col gap-2">
      <Label>Upload Images</Label>

      <div
        {...getRootProps()}
        className={`mt-2 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition  hover:border-yellow-400 ${
          isDragActive ? "border-yellow-500 " : "border-gray-600"
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
            <p className=" font-medium">Drop images here...</p>
          ) : (
            <p className=" font-medium">
              Drag and drop an image here or click to browse
            </p>
          )}
          <p className="text-xs ">
            Accepted formats: <span className="">.jpeg, .png, .webp</span> <br />
            Max size: <span className="">5MB</span>
          </p>
        </div>
      </div>

      {/* Show error message below dropzone */}
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

      {/* Previews */}
     
    </div>
  );
};

export default ImageUploader;
