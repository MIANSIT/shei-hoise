import { FC } from "react";
import MainImage from "../image/MainImage";
import Thumbnails from "../image/Thumbnails";
import { useProductImage } from "../../../../lib/hook/useProductImage";

interface ProductImageProps {
  images: string[];
  discount?: number;
  alt?: string;
}

const ProductImage: FC<ProductImageProps> = ({ images, discount, alt }) => {
  const { mainIndex, handleThumbnailClick, swipeHandlers } = useProductImage({ images });

  if (!images || images.length === 0) return <div className="w-full h-64 flex items-center justify-center">No image</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Thumbnails images={images} mainIndex={mainIndex} onClick={handleThumbnailClick} desktop />
      <MainImage src={images[mainIndex]} alt={alt} discount={discount} swipeHandlers={swipeHandlers} />
      <Thumbnails images={images} mainIndex={mainIndex} onClick={handleThumbnailClick} desktop={false} />
    </div>
  );
};

export default ProductImage;
