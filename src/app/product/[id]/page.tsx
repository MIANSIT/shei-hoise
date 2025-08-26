"use client";

import { useParams } from "next/navigation";
import { dummyProducts } from "../../../lib/store/dummyProducts";
import MobileHeader from "../../components/common/MobileHeader";
import DesktopHeader from "../../components/common/DesktopHeader";
import { useState } from "react";
import useCartStore from "@/lib/store/cartStore";

import ProductImage from "../../components/products/singleProduct/ProductImage";
import ProductTitle from "../../components/products/singleProduct/ProductTitle";
import ProductPrice from "../../components/products/singleProduct/ProductPrice";
import ProductQuantitySelector from "../../components/products/singleProduct/ProductQuantitySelector";
import AddToCartButton from "../../components/products/singleProduct/AddToCartButton";
import ProductFeatures from "../../components/products/singleProduct/ProductFeatures";
import ProductSpecifications from "../../components/products/singleProduct/ProductSpecifications";
import BackButton from "@/app/components/products/singleProduct/BackButton";
import { motion } from "framer-motion";

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
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get the addToCart function from the cart store
  const addToCart = useCartStore((state) => state.addToCart);

  const product: Product | undefined = dummyProducts.find(
    (p) => p.id === productId
  );

  if (!product)
    return (
      <p className="text-center mt-20 text-lg md:text-xl">Product not found.</p>
    );

  const handleAddToCart = async (): Promise<void> => {
    setIsAdding(true);

    try {
      // Convert the product to match the expected format for the cart
      const cartProduct = {
        id: product.id,
        title: product.title,
        currentPrice: Number(product.currentPrice),
        originalPrice: Number(product.originalPrice),
        images: product.images,
        imageUrl: product.images[0], // Use the first image as imageUrl
        category: product.category,
        rating: product.rating,
        discount: product.discount,
      };

      // Add the product to the cart with the selected quantity
      // We need to call addToCart for each quantity unit
      for (let i = 0; i < quantity; i++) {
        await addToCart(cartProduct);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const totalPrice = Number(product.currentPrice) * quantity;

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

            {/* Quantity Selector and Add to Cart */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  Quantity:
                </span>
                <ProductQuantitySelector
                  quantity={quantity}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                />
                <div className="ml-2">
                  <motion.span
                    key={totalPrice}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg font-semibold"
                  >
                    ${totalPrice.toFixed(2)}
                  </motion.span>
                  {quantity > 1 && (
                    <span className="text-sm text-gray-500 ml-2">
                      (${Number(product.currentPrice).toFixed(2)} each)
                    </span>
                  )}
                </div>
              </div>

              <AddToCartButton
                onClick={handleAddToCart}
                isLoading={isAdding}
                showSuccess={showSuccess}
                className="flex-1 sm:flex-initial"
              />
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
