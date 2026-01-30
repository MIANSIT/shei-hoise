// File: components/product/ProductImages.tsx
"use client";

import React from "react";
import ImageUploader from "./ImageUploader";
import PicturesWallUploader from "./PicturesWallUploader";
import { FrontendImage } from "@/lib/types/frontendImage";

interface ProductImagesProps {
  images: FrontendImage[];
  setImages: (files: FrontendImage[]) => void;
  error?: string;
}

const ProductImages: React.FC<ProductImagesProps> = ({
  images = [],
  setImages,
  error,
}) => {
  return (
    <div className="col-span-full w-full">
      {images.length === 0 ? (
        <ImageUploader images={images} setImages={setImages} error={error} />
      ) : (
        <PicturesWallUploader
          images={images}
          setImages={setImages}
          error={error}
        />
      )}

      {images.length > 5 && (
        <p className="text-yellow-500 text-sm mt-1">
          Only the first 5 images will be saved.
        </p>
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default ProductImages;
