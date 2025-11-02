/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import { getClientProductBySlug } from "@/lib/queries/products/getClientProductBySlug";

// Import your components
import ProductImage from "@/app/components/products/singleProduct/ProductImage";
import ProductTitle from "@/app/components/products/singleProduct/ProductTitle";
import ProductPrice from "@/app/components/products/singleProduct/ProductPrice";
import ProductQuantitySelector from "@/app/components/products/singleProduct/ProductQuantitySelector";
import AddToCartButton from "@/app/components/products/singleProduct/AddToCartButton";
import BackButton from "@/app/components/products/singleProduct/BackButton";
import { motion } from "framer-motion";

// Define the product type based on your API response
interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  discounted_price: number | null;
  discount_amount?: number; // ✅ Added discount_amount
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
    id: string;
    variant_name: string;
    base_price: number;
    discounted_price: number | null;
    discount_amount?: number; // ✅ Added discount_amount for variants
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

// Simple interface for cart product to avoid type issues
// interface CartProduct {
//   id: string;
//   slug: string;
//   name: string;
//   base_price: number;
//   discounted_price?: number;
//   variants?: any[];
//   images?: string[];
//   [key: string]: any;
// }

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
        const productData = await getClientProductBySlug(product_slug);

        // Fix the categories structure - ensure it's an object, not array
        const fixedProductData = {
          ...productData,
          categories: Array.isArray(productData.categories)
            ? productData.categories[0] || null
            : productData.categories,
        };

        setProduct(fixedProductData as ApiProduct);

        // Auto-select first variant if available
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

  // Get the selected variant data
  const selectedVariantData = product?.product_variants?.find(
    (variant) => variant.id === selectedVariant
  );

  // ✅ PERFECT DISCOUNT CALCULATION
  const calculateDiscountPercentage = (
    originalPrice: number,
    discountedPrice: number | null,
    discountAmount?: number
  ): number => {
    // If we have discount_amount, use it directly for percentage calculation
    if (discountAmount && discountAmount > 0) {
      // Check if discount_amount is already a percentage or fixed amount
      if (discountAmount <= 100) {
        // Assume it's a percentage if <= 100
        return Math.round(discountAmount);
      } else {
        // It's a fixed amount, calculate percentage
        return Math.round((discountAmount / originalPrice) * 100);
      }
    }

    // Fallback to discounted_price vs base_price comparison
    if (discountedPrice && discountedPrice < originalPrice) {
      return Math.round(
        ((originalPrice - discountedPrice) / originalPrice) * 100
      );
    }

    return 0;
  };

  // Calculate display price based on selected variant or product base price
  const displayPrice = selectedVariantData
    ? selectedVariantData.discounted_price || selectedVariantData.base_price
    : product?.discounted_price || product?.base_price || 0;

  // Calculate original price
  const originalPrice = selectedVariantData
    ? selectedVariantData.base_price
    : product?.base_price || 0;

  // ✅ Calculate discount percentage using the perfect function
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

  // Calculate actual discount amount in dollars
  const discountAmountInDollars = originalPrice - displayPrice;

  // Get stock availability for selected variant
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

  // Get stock availability for product without variants
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
      // Create base cart product
      const cartProduct: any = {
        id: selectedVariantData ? selectedVariantData.id : product.id,
        slug: product.slug,
        name: product.name,
        base_price: originalPrice,
        discounted_price:
          displayPrice < originalPrice ? displayPrice : undefined,
        images: product.product_images.map((img) => img.image_url),
        quantity: quantity,
        store_slug: store_slug,
        category: product.categories
          ? {
              id: product.categories.id,
              name: product.categories.name,
            }
          : undefined,
      };

      // ✅ ADD COMPLETE VARIANT DATA
      if (selectedVariantData) {
        cartProduct.variants = [
          {
            id: selectedVariantData.id,
            variant_name: selectedVariantData.variant_name,
            base_price: selectedVariantData.base_price,
            discounted_price: selectedVariantData.discounted_price || undefined,
            color: selectedVariantData.color || undefined,
            product_images: selectedVariantData.product_images || [],
          },
        ];
      }

      // Add to cart
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

  if (loading) {
    return (
      <>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-foreground">Loading product...</p>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <div className="container mx-auto px-4 py-6">
          <p className="text-center mt-20 text-lg md:text-xl text-foreground">
            Product not found.
          </p>
        </div>
      </>
    );
  }

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

        {/* Top section: image + details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start mt-6">
          <div className="w-full">
            <ProductImage
              images={images}
              alt={product.name}
              discount={discount} // ✅ Only shows if discount > 0
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
              discount={discount} // ✅ Pass discount to show savings
            />

            <p className="text-muted-foreground mt-4 text-sm sm:text-base md:text-lg">
              {product.description || "No description available."}
            </p>

            {/* Variant Selection - only show if product has variants */}
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
            {/* Stock Badge */}
            <div className="mt-4">
              {hasVariants && selectedVariantData && getStockBadge()}
              {!hasVariants && getProductStockBadge()}
            </div>
            {/* Quantity Selector and Add to Cart */}
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
                    ${totalPrice.toFixed(2)}
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

        {/* Product Details Section */}
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
