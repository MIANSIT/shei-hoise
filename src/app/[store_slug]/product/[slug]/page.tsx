/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import { getClientProductBySlug } from "@/lib/queries/products/getClientProductBySlug";
import ProductImage from "@/app/components/products/singleProduct/ProductImage";
import ProductTitle from "@/app/components/products/singleProduct/ProductTitle";
import ProductPrice from "@/app/components/products/singleProduct/ProductPrice";
import ProductQuantitySelector from "@/app/components/products/singleProduct/ProductQuantitySelector";
import AddToCartButton from "@/app/components/products/singleProduct/AddToCartButton";
import BackButton from "@/app/components/products/singleProduct/BackButton";
import { motion } from "framer-motion";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { ProductPageSkeleton } from "../../../components/skeletons/ProductPageSkeleton";

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  discounted_price: number | null;
  discount_amount?: number;
  categories: {
    id: string;
    name: string;
  } | null;
  product_images: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
  }>;
  product_variants: Array<{
    primary_image: any;
    id: string;
    variant_name: string;
    base_price: number;
    discounted_price: number | null;
    discount_amount?: number;
    color: string | null;
    product_inventory: Array<{
      quantity_available: number;
      quantity_reserved: number;
    }>;
    product_images: Array<{
      id: string;
      image_url: string;
      is_primary: boolean;
    }>;
  }>;
}

export default function ProductPage() {
  const params = useParams();
  const store_slug = params.store_slug as string;
  const product_slug = params.slug as string;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);

        if (!product_slug) {
          console.error("No product slug provided");
          return;
        }

        const productData = await getClientProductBySlug(product_slug);

        // Handle case where product is not found (returns null)
        if (!productData) {
          console.log("Product not found for slug:", product_slug);
          setProduct(null);
          return;
        }

        const fixedProductData = {
          ...productData,
          categories: Array.isArray(productData.categories)
            ? productData.categories[0] || null
            : productData.categories,
        };

        setProduct(fixedProductData as ApiProduct);

        if (
          fixedProductData.product_variants &&
          fixedProductData.product_variants.length > 0
        ) {
          setSelectedVariant(fixedProductData.product_variants[0].id);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    if (product_slug) {
      fetchProduct();
    }
  }, [product_slug]);

  if (loading) {
    return <ProductPageSkeleton />;
  }

  // Handle product not found case
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-6">
        <BackButton href={`/${store_slug}`} label="Back to Products" />

        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Product Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              Sorry, we couldn&apos;t find the product you&apos;re looking for.
              It may have been removed or the URL might be incorrect.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedVariantData = product?.product_variants?.find(
    (variant) => variant.id === selectedVariant
  );

  const calculateDiscountPercentage = (
    originalPrice: number,
    discountedPrice: number | null,
    discountAmount?: number
  ): number => {
    if (discountAmount && discountAmount > 0) {
      if (discountAmount <= 100) {
        return Math.round(discountAmount);
      } else {
        return Math.round((discountAmount / originalPrice) * 100);
      }
    }

    if (discountedPrice && discountedPrice < originalPrice) {
      return Math.round(
        ((originalPrice - discountedPrice) / originalPrice) * 100
      );
    }

    return 0;
  };

  const displayPrice = selectedVariantData
    ? selectedVariantData.discounted_price || selectedVariantData.base_price
    : product?.discounted_price || product?.base_price || 0;

  const originalPrice = selectedVariantData
    ? selectedVariantData.base_price
    : product?.base_price || 0;

  const discount = selectedVariantData
    ? calculateDiscountPercentage(
        selectedVariantData.base_price,
        selectedVariantData.discounted_price,
        selectedVariantData.discount_amount
      )
    : calculateDiscountPercentage(
        product?.base_price || 0,
        product?.discounted_price || null,
        product?.discount_amount
      );

  const discountAmountInDollars = originalPrice - displayPrice;

  const getStockBadge = () => {
    if (!selectedVariantData) return null;

    const stock =
      selectedVariantData.product_inventory[0]?.quantity_available || 0;

    if (stock <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          Out of Stock
        </span>
      );
    } else if (stock < 10) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          Limited quantities remaining
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Available
        </span>
      );
    }
  };

  const getProductStockBadge = () => {
    if (!product?.product_variants || product.product_variants.length === 0)
      return null;

    const stock =
      product.product_variants[0]?.product_inventory[0]?.quantity_available ||
      0;

    if (stock <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          Out of Stock
        </span>
      );
    } else if (stock < 10) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          Limited quantities remaining
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Available
        </span>
      );
    }
  };

  const handleAddToCart = async (): Promise<void> => {
    if (!product) return;

    setIsAdding(true);
    try {
      const cartProduct: AddToCartType = {
        productId: product.id,
        storeSlug: store_slug,
        quantity: quantity,
        variantId: selectedVariantData?.id || null,
      };

      await addToCart(cartProduct);

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

  const totalPrice = displayPrice * quantity;
  const images = product.product_images.map((img) => img.image_url);
  const hasVariants =
    product.product_variants && product.product_variants.length > 0;
  const isOutOfStock = selectedVariantData
    ? (selectedVariantData.product_inventory[0]?.quantity_available || 0) <= 0
    : product.product_variants?.[0]?.product_inventory[0]?.quantity_available <=
      0;

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <BackButton href={`/${store_slug}`} label="Back to Products" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start mt-6">
          <div className="w-full">
            <ProductImage
              images={images}
              alt={product.name}
              discount={discount}
            />
          </div>

          <div className="flex flex-col justify-start w-full">
            <ProductTitle
              name={product.name}
              category={product.categories?.name || "Uncategorized"}
              rating={5}
            />

            <ProductPrice
              price={displayPrice}
              originalPrice={originalPrice}
              discount={discount}
            />

            <p className="text-muted-foreground mt-4 text-sm sm:text-base md:text-lg">
              {product.description || "No description available."}
            </p>

            {hasVariants && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Select Variant:
                </h4>
                <div className="flex flex-wrap gap-2 ">
                  {product.product_variants.map((variant) => {
                    const isAvailable =
                      variant.product_inventory[0]?.quantity_available > 0;
                    const isSelected = selectedVariant === variant.id;
                    const variantDiscount = calculateDiscountPercentage(
                      variant.base_price,
                      variant.discounted_price,
                      variant.discount_amount
                    );

                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant.id)}
                        disabled={!isAvailable}
                        className={`px-3 py-2 border rounded-md text-sm transition-all ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-accent "
                        } ${
                          !isAvailable ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {variant.variant_name}
                        {variant.color && ` - ${variant.color}`}
                        {variantDiscount > 0 && (
                          <span className="ml-1 text-xs text-green-600">
                            (-{variantDiscount}%)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4">
              {hasVariants && selectedVariantData && getStockBadge()}
              {!hasVariants && getProductStockBadge()}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">
                  Quantity:
                </span>
                <ProductQuantitySelector
                  quantity={quantity}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  disabled={isOutOfStock}
                />
                <div className="ml-2">
                  <motion.span
                    key={totalPrice}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg font-semibold text-foreground"
                  >
                    ৳{totalPrice.toFixed(2)}
                  </motion.span>
                  {quantity > 1 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (${displayPrice.toFixed(2)} each)
                    </span>
                  )}
                </div>
              </div>

              <AddToCartButton
                onClick={handleAddToCart}
                isLoading={isAdding}
                showSuccess={showSuccess}
                disabled={isOutOfStock}
                className=""
              />
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-4">Product Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Product Information</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Category:</strong>{" "}
                  {product.categories?.name || "Uncategorized"}
                </li>
                <li>
                  <strong>SKU:</strong> {product.id}
                </li>
                {hasVariants && selectedVariantData && (
                  <>
                    <li>
                      <strong>Variant:</strong>{" "}
                      {selectedVariantData.variant_name}
                    </li>
                    {selectedVariantData.color && (
                      <li>
                        <strong>Color:</strong> {selectedVariantData.color}
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Pricing</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Base Price:</strong> ${originalPrice.toFixed(2)}
                </li>
                {discount > 0 && (
                  <>
                    <li>
                      <strong>Discounted Price:</strong> $
                      {displayPrice.toFixed(2)}
                    </li>
                    <li>
                      <strong>You Save:</strong> $
                      {discountAmountInDollars.toFixed(2)} ({discount}%)
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
