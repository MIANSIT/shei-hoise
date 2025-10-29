"use client";

import React from "react";
import ImageUploader from "./ImageUploader";
import PicturesWallUploader from "./PicturesWallUploader";
import { FrontendImage } from "@/lib/types/frontendImage";

interface ProductImagesProps {
  images: FrontendImage[];
  setImages: (files: FrontendImage[]) => void;
  error?: string; // Add error prop
}

const ProductImages: React.FC<ProductImagesProps> = ({
  images = [],
  setImages,
  error,
}) => {
  return (
    <div className="col-span-1 md:col-span-2">
      {images.length === 0 ? (
        <ImageUploader images={images} setImages={setImages} />
      ) : (
        <PicturesWallUploader images={images} setImages={setImages} />
      )}

      {images.length > 5 && (
        <p className="text-yellow-500 text-sm mt-1">
          Only the first 5 images will be saved.
        </p>
      )}

      {/* Show validation error */}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default ProductImages;
