/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import { getClientProductBySlug } from "@/lib/queries/products/getClientProductBySlug";
import ProductImage from "@/app/components/products/singleProduct/ProductImage";
import ProductTitle from "@/app/components/products/singleProduct/ProductTitle";
import ProductPrice from "@/app/components/products/singleProduct/ProductPrice";
import AddToCartButton from "@/app/components/products/singleProduct/AddToCartButton";
import BackButton from "@/app/components/products/singleProduct/BackButton";
import { motion } from "framer-motion";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { ProductPageSkeleton } from "../../../components/skeletons/ProductPageSkeleton";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useSheiNotification } from "@/lib/hook/useSheiNotification"; // ADD THIS IMPORT

interface ApiProduct {
  id: string;
  sku: string;
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
  product_inventory: Array<{
    quantity_available: number;
    quantity_reserved: number;
  }>;
  product_variants: Array<{
    primary_image: any;
    id: string;
    sku: string;
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
  const [inputValue, setInputValue] = useState<string>("");
  const [showMaxQuantityError, setShowMaxQuantityError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const {
    // currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const { cart, addToCart } = useCartStore();
  const { success: showSuccessNotification, error: showErrorNotification } = useSheiNotification(); // ADD THIS

  // Calculate selectedVariantData based on current state
  const selectedVariantData = product?.product_variants?.find(
    (variant) => variant.id === selectedVariant
  );

  // Fixed: Robust cart quantity calculation
  const getCartQuantity = () => {
    if (!product) return 0;

    // Handle both cases: with variant and without variant
    if (selectedVariantData) {
      // For products with variants
      const cartItem = cart.find(
        (item) =>
          item.productId === product.id &&
          item.variantId === selectedVariantData.id && // Must match the variant ID
          item.storeSlug === store_slug
      );
      return cartItem?.quantity || 0;
    } else {
      // For products without variants - variantId should be null
      const cartItem = cart.find(
        (item) =>
          item.productId === product.id &&
          item.variantId === null && // Important: variantId should be null for main product
          item.storeSlug === store_slug
      );
      return cartItem?.quantity || 0;
    }
  };

  // Get available stock - handles both variant and main product inventory
  const getAvailableStock = () => {
    if (selectedVariantData) {
      return (
        selectedVariantData.product_inventory?.[0]?.quantity_available || 0
      );
    }
    // For products without variants, use main product inventory
    return product?.product_inventory?.[0]?.quantity_available || 0;
  };

  const cartQuantity = getCartQuantity();
  const availableStock = getAvailableStock();
  const remainingStock = Math.max(0, availableStock - cartQuantity);
  const isOutOfStock = remainingStock <= 0;
  const isQuantityExceeded = quantity > remainingStock;

  // Simplified stock status without numbers
  const getStockStatus = () => {
    if (availableStock <= 0) {
      return "out-of-stock";
    } else if (remainingStock === 0) {
      return "max-in-cart";
    } else if (availableStock <= 10) {
      return "limited";
    } else {
      return "available";
    }
  };

  const stockStatus = getStockStatus();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);

        if (!product_slug) {
          console.error("No product slug provided");
          return;
        }

        const productData = await getClientProductBySlug(product_slug);

        if (!productData) {
          setProduct(null);
          return;
        }

        const fixedProductData = {
          ...productData,
          categories: Array.isArray(productData.categories)
            ? productData.categories[0] || null
            : productData.categories,
          product_variants: (productData.product_variants || []).map(
            (variant: any) => ({
              ...variant,
              primary_image:
                variant.product_images?.find((img: any) => img.is_primary) ||
                null,
            })
          ),
        };

        setProduct(fixedProductData as ApiProduct);

        if (
          fixedProductData.product_variants &&
          fixedProductData.product_variants.length > 0
        ) {
          // Find the first available variant instead of just the first one
          const firstAvailableVariant = fixedProductData.product_variants.find(
            (variant) =>
              (variant.product_inventory?.[0]?.quantity_available || 0) > 0
          );

          // Set to first available variant, or first variant if none are available
          setSelectedVariant(
            firstAvailableVariant?.id || fixedProductData.product_variants[0].id
          );
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

  // Clear error message after 3 seconds
  useEffect(() => {
    if (showMaxQuantityError) {
      const timer = setTimeout(() => {
        setShowMaxQuantityError(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showMaxQuantityError]);

  // Debug effect for cart changes - MOVED AFTER variable definitions
  useEffect(() => {
   
  }, [
    cart,
    quantity,
    product,
    selectedVariantData,
    availableStock,
    cartQuantity,
    remainingStock,
    isOutOfStock,
    isQuantityExceeded,
    stockStatus,
  ]);

  const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  // const displayCurrency = currencyLoading ? "" : currency ?? "";
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback
  if (loading) {
    return <ProductPageSkeleton />;
  }

  if (!product) {
    return (
      <div className='container mx-auto px-4 py-6'>
        <BackButton href={`/${store_slug}`} label='Back to Products' />
        <div className='flex flex-col items-center justify-center min-h-[50vh] text-center'>
          <div className='max-w-md mx-auto'>
            <div className='w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center'>
              <svg
                className='w-12 h-12 text-muted-foreground'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <h2 className='text-2xl font-bold text-foreground mb-2'>
              Product Not Found
            </h2>
            <p className='text-muted-foreground mb-6'>
              Sorry, we couldn&apos;t find the product you&apos;re looking for.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

  // Updated stock badge function - No numbers shown
  const getStockBadge = () => {
    switch (stockStatus) {
      case "out-of-stock":
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200'>
            Out of Stock
          </span>
        );
      case "max-in-cart":
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200'>
            Max quantity is already in your cart
          </span>
        );
      case "limited":
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200'>
            Limited Stock
          </span>
        );
      case "available":
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200'>
            In Stock
          </span>
        );
      default:
        return null;
    }
  };

  // Fixed: Strict add to cart logic
  const handleAddToCart = async (): Promise<void> => {
    if (!product) return;

    // Get fresh cart quantity
    const currentCartQty = getCartQuantity();
    const currentRemaining = Math.max(0, availableStock - currentCartQty);

    // Emergency fallback - double check everything
    if (currentRemaining <= 0) {
      setShowMaxQuantityError(true);
      return;
    }

    if (quantity > currentRemaining) {
      setShowMaxQuantityError(true);
      return;
    }

    // Original validation
    if (isOutOfStock || isQuantityExceeded || quantity > remainingStock) {
     
      return;
    }

    setIsAdding(true);
    try {
      const cartProduct: AddToCartType = {
        productId: product.id,
        storeSlug: store_slug,
        quantity: quantity,
        variantId: selectedVariantData?.id || null, // Explicitly set to null if no variant
      };

      addToCart(cartProduct); // Remove await since we fixed the cart store
      showSuccessNotification(`${product.name} added to cart`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Reset quantity after successful add
      setQuantity(1);
      setInputValue("");
    } catch (error) {
      console.error("Error adding to cart:", error);
      showErrorNotification("Failed to add product to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const handleIncrement = () => {
    const currentRemaining = Math.max(0, availableStock - getCartQuantity());
    if (quantity < currentRemaining) {
      setQuantity((prev) => prev + 1);
      setInputValue("");
      setIsEditing(false);
    } else {
      setShowMaxQuantityError(true);
      showErrorNotification("Maximum quantity reached");
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
      setInputValue("");
      setIsEditing(false);
    }
  };

  const handleInputClick = () => {
    if (isOutOfStock) return;
    setIsEditing(true);
    setInputValue(quantity.toString());
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleInputBlur = () => {
    if (!inputValue) {
      // If input is empty, set to 1
      setQuantity(1);
      setInputValue("");
    } else {
      let newQuantity = parseInt(inputValue, 10);

      // Validate quantity
      if (isNaN(newQuantity) || newQuantity < 1) {
        newQuantity = 1;
      }

      // Check if quantity exceeds remaining stock
      const currentRemaining = Math.max(0, availableStock - getCartQuantity());
      if (newQuantity > currentRemaining) {
        newQuantity = currentRemaining;
        setShowMaxQuantityError(true);
        showErrorNotification("Maximum quantity reached");
      }

      setQuantity(newQuantity);
      setInputValue("");
    }
    setIsEditing(false);
  };

  const handleInputKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const totalPrice = displayPrice * quantity;
  const images = product.product_images.map((img) => img.image_url);
  const hasVariants =
    product.product_variants && product.product_variants.length > 0;

  return (
    <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10'>
      <BackButton href={`/${store_slug}`} label='Back to Products' />

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start mt-6'>
        <div className='w-full'>
          <ProductImage
            images={images}
            alt={product.name}
            discount={discount}
          />
        </div>

        <div className='flex flex-col justify-start w-full'>
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

          <p className='text-muted-foreground mt-4 text-sm sm:text-base md:text-lg'>
            {product.description || "No description available."}
          </p>

          {hasVariants && (
            <div className='mt-6'>
              <h4 className='text-sm font-medium text-muted-foreground mb-3'>
                Select Variant:
              </h4>
              <div className='flex flex-wrap gap-2'>
                {product.product_variants.map((variant) => {
                  const variantStock =
                    variant.product_inventory?.[0]?.quantity_available || 0;
                  const isAvailable = variantStock > 0;
                  const isSelected = selectedVariant === variant.id;
                  const variantDiscount = calculateDiscountPercentage(
                    variant.base_price,
                    variant.discounted_price,
                    variant.discount_amount
                  );

                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        if (!isAvailable) {
                          showErrorNotification("This variant is out of stock");
                          return;
                        }
                        setSelectedVariant(variant.id);
                        setQuantity(1);
                        setInputValue("");
                        setIsEditing(false);
                      }}
                      disabled={!isAvailable}
                      className={`px-3 py-2 border rounded-md text-sm transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : isAvailable
                          ? "border-border hover:bg-accent text-foreground"
                          : "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                      } ${!isAvailable ? "opacity-50" : ""}`}
                    >
                      <div className='flex items-center gap-1'>
                        <span>{variant.variant_name}</span>
                        {variant.color && <span>- {variant.color}</span>}
                        {variantDiscount > 0 && (
                          <span className='ml-1 text-xs text-green-600'>
                            (-{variantDiscount}%)
                          </span>
                        )}
                        {!isAvailable && (
                          <span className='ml-1 text-xs text-red-600'>
                            (Out of Stock)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className='mt-4'>{getStockBadge()}</div>

          {/* Updated Quantity and Cart Management Section */}
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-6'>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-4 flex-wrap'>
                <span className='text-sm font-medium text-muted-foreground'>
                  Quantity:
                </span>

                {/* Quantity Selector */}
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7 rounded-md cursor-pointer hover:bg-accent'
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || isOutOfStock}
                  >
                    <Minus className='h-3 w-3' />
                  </Button>

                  <div
                    className='relative w-12 h-7 flex items-center justify-center cursor-pointer'
                    onClick={handleInputClick}
                  >
                    {isEditing ? (
                      <input
                        type='text'
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleInputBlur}
                        onKeyPress={handleInputKeyPress}
                        className='w-full h-full text-center border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
                        autoFocus
                      />
                    ) : (
                      <span className='text-sm font-medium'>{quantity}</span>
                    )}
                  </div>

                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7 rounded-md cursor-pointer hover:bg-accent'
                    onClick={handleIncrement}
                    disabled={isOutOfStock || quantity >= remainingStock}
                  >
                    <Plus className='h-3 w-3' />
                  </Button>
                </div>

                <div className='ml-2'>
                  <motion.span
                    key={totalPrice}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className='text-lg font-semibold text-foreground'
                  >
                    {displayCurrencyIconSafe}
                    {totalPrice.toFixed(2)}
                  </motion.span>
                </div>
              </div>

              {/* Show max quantity error under quantity section */}
              {showMaxQuantityError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className='text-xs text-destructive mt-1'
                >
                  Maximum quantity reached
                </motion.p>
              )}
            </div>

            {/* Updated AddToCartButton with strict validation */}
            <AddToCartButton
              onClick={handleAddToCart}
              isLoading={isAdding}
              showSuccess={showSuccess}
              disabled={
                isOutOfStock || isQuantityExceeded || quantity > remainingStock
              }
              isMaxInCart={
                (isQuantityExceeded || remainingStock === 0) && !isOutOfStock
              }
              currentCartQuantity={cartQuantity}
              className=''
            />
          </div>
        </div>
      </div>

      <div className='mt-12'>
        <h3 className='text-2xl font-semibold mb-4'>Product Information</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <h5 className='font-medium mb-2'>Product Details</h5>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <strong>Category:</strong>{" "}
                {product.categories?.name || "Uncategorized"}
              </li>
              <li>
                <strong>SKU:</strong> {selectedVariantData?.sku || product.sku}
              </li>
              {hasVariants && selectedVariantData && (
                <>
                  <li>
                    <strong>Variant:</strong> {selectedVariantData.variant_name}
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
            <h5 className='font-medium mb-2'>Product Pricing</h5>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <strong>Base Price:</strong> {displayCurrencyIconSafe}
                {originalPrice.toFixed(2)}
              </li>
              {discount > 0 && (
                <>
                  <li>
                    <strong>Discounted Price:</strong> {displayCurrencyIconSafe}
                    {displayPrice.toFixed(2)}
                  </li>
                  {/* <li>
                    <strong>You Save:</strong> {displayCurrencyIconSafe}
                    {(originalPrice - displayPrice).toFixed(2)} ({discount}%)
                  </li> */}
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}