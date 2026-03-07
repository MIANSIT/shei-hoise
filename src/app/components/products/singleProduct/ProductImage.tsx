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

const ProductImage: FC<ProductImageProps> = ({
  images,
  basePrice,
  discountedPrice,
  alt,
}) => {
  const { mainIndex, handleThumbnailClick, swipeHandlers } = useProductImage({
    images,
  });

  if (!images || images.length === 0)
    return (
      <div className="w-full h-64 flex items-center justify-center text-muted-foreground">
        No image
      </div>
    );

  const discountPercent =
    discountedPrice && discountedPrice < basePrice
      ? Math.round(((basePrice - discountedPrice) / basePrice) * 100)
      : 0;

  return (
    /*
      max-w-[500px]: stops the image section from stretching across the full desktop half
      On lg grid it sits in a col, this keeps it compact and natural
    */
    <div className="w-full ">
      <div className="flex flex-row gap-3">
        {/* Thumbnails — left side, desktop only */}
        <Thumbnails
          images={images}
          mainIndex={mainIndex}
          onClick={handleThumbnailClick}
          desktop
        />

        {/* Main image */}
        <div className="flex-1 min-w-0">
          <MainImage
            src={images[mainIndex]}
            alt={alt}
            discount={discountPercent}
            swipeHandlers={swipeHandlers}
          />
        </div>
      </div>

      {/* Mobile thumbnails */}
      <Thumbnails
        images={images}
        mainIndex={mainIndex}
        onClick={handleThumbnailClick}
        desktop={false}
      />
    </div>
  );
};

export default ProductImage;
