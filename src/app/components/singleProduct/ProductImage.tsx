import Image from "next/image";
import { FC } from "react";

interface ProductImageProps {
  src: string;
  alt: string;
  discount?: number;
}

const ProductImage: FC<ProductImageProps> = ({ src, alt, discount }) => {
  return (
    <div className="relative w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden">
      {discount && (
        <span className="absolute top-2 left-2 bg-red-600 text-white text-sm px-2 py-1 rounded-md">
          -{discount}%
        </span>
      )}
      <Image src={src} alt={alt} fill className="object-contain" />
    </div>
  );
};

export default ProductImage;
