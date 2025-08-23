"use client";

import { useParams } from "next/navigation";
import { dummyProducts } from "../../../lib/store/dummyProducts";
import MobileHeader from "../../components/common/MobileHeader";
import DesktopHeader from "../../components/common/DesktopHeader";

import ProductImage from "../../components/products/singleProduct/ProductImage";
import ProductTitle from "../../components/products/singleProduct/ProductTitle";
import ProductPrice from "../../components/products/singleProduct/ProductPrice";
import ProductQuantitySelector from "../../components/products/singleProduct/ProductQuantitySelector";
import AddToCartButton from "../../components/products/singleProduct/AddToCartButton";
import ProductFeatures from "../../components/products/singleProduct/ProductFeatures";
import ProductSpecifications from "../../components/products/singleProduct/ProductSpecifications";
import BackButton from "@/app/components/products/singleProduct/BackButton";

type Product = {
  id: number;
  title: string;
  category: string;
  currentPrice: string;
  originalPrice: string;
  rating: number;
  images: string[];
  discount: number;
  description?: string;
  features?: string[];
  specifications?: { label: string; value: string }[];
};

export default function ProductPage() {
  const params = useParams();
  const productId = Number(params.id);

  const product: Product | undefined = dummyProducts.find(
    (p) => p.id === productId
  );

  if (!product)
    return <p className="text-center mt-20 text-lg md:text-xl">Product not found.</p>;

  const handleAddToCart = async (): Promise<void> => {
    console.log("Added to cart:", product.id);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  };

  return (
 <>
      {/* Headers outside of the container */}
      <div className="block md:hidden">
        <MobileHeader />
      </div>
      <div className="hidden md:block">
        <DesktopHeader />
      </div>

      {/* Main page content inside container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Back button */}
        <BackButton href="/shop" label="Back to Products" />

        {/* Top section: image + details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start mt-6">
          <div className="w-full">
            <ProductImage
              images={product.images}
              alt={product.title}
              discount={product.discount}
            />
          </div>
          <div className="flex flex-col justify-start w-full">
            <ProductTitle
              name={product.title}
              category={product.category}
              rating={product.rating}
            />
            <ProductPrice
              price={Number(product.currentPrice)}
              originalPrice={Number(product.originalPrice)}
            />
            <p className="text-gray-600 mt-4 text-sm sm:text-base md:text-lg">
              {product.description || "No description available."}
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
              <ProductQuantitySelector />
              <AddToCartButton onAdd={handleAddToCart} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-10 border-gray-300" />

        {/* Bottom section: Features + Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10">
          <ProductFeatures features={product.features || []} />
          <ProductSpecifications specs={product.specifications || []} />
        </div>
      </div>
    </>
  );
}