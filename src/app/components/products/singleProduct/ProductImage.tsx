import { FC } from "react";
import MainImage from "../image/MainImage";
import Thumbnails from "../image/Thumbnails";
import { useProductImage } from "../../../../lib/hook/useProductImage";

interface ProductImageProps {
  images: string[];
  basePrice: number;
  discountedPrice?: number | null;
  alt?: string;
}

const ProductImage: FC<ProductImageProps> = ({ images, basePrice, discountedPrice, alt }) => {
  const { mainIndex, handleThumbnailClick, swipeHandlers } = useProductImage({ images });

  if (!images || images.length === 0)
    return <div className="w-full h-64 flex items-center justify-center">No image</div>;

  // ✅ Calculate discount percentage internally
  const discountPercent =
    discountedPrice && discountedPrice < basePrice
      ? Math.round(((basePrice - discountedPrice) / basePrice) * 100)
      : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Thumbnails images={images} mainIndex={mainIndex} onClick={handleThumbnailClick} desktop />
      <MainImage
        src={images[mainIndex]}
        alt={alt}
        discount={discountPercent} // pass calculated discount
        swipeHandlers={swipeHandlers}
      />
      <Thumbnails images={images} mainIndex={mainIndex} onClick={handleThumbnailClick} desktop={false} />
    </div>
  );
};

export default ProductImage;
