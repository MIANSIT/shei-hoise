import React from "react";
import ImageUploader from "./ImageUploader";
import PicturesWallUploader from "./PicturesWallUploader";
import { ProductType } from "@/lib/schema/productSchema";

interface ProductImagesProps {
  images: ProductType["images"];
  setImages: (files: ProductType["images"]) => void;
}

const ProductImages: React.FC<ProductImagesProps> = ({ images, setImages }) => {
  return (
    <div className="col-span-1 md:col-span-2">
      {(!images || images.length === 0) ? (
        <ImageUploader images={images ?? []} setImages={setImages} />
      ) : (
        <PicturesWallUploader images={images} setImages={setImages} />
      )}
    </div>
  );
};

export default ProductImages;
