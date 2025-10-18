"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import Header from "@/app/components/common/Header";
import { getClientProductBySlug } from "@/lib/queries/products/getClientProductBySlug";

// Import your components
import ProductImage from "@/app/components/products/singleProduct/ProductImage";
import ProductTitle from "@/app/components/products/singleProduct/ProductTitle";
import ProductPrice from "@/app/components/products/singleProduct/ProductPrice";
import ProductQuantitySelector from "@/app/components/products/singleProduct/ProductQuantitySelector";
import AddToCartButton from "@/app/components/products/singleProduct/AddToCartButton";
import ProductFeatures from "@/app/components/products/singleProduct/ProductFeatures";
import ProductSpecifications from "@/app/components/products/singleProduct/ProductSpecifications";
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
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const productData = await getClientProductBySlug(store_slug, product_slug);
        // setProduct(productData);
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    if (store_slug && product_slug) {
      fetchProduct();
    }
  }, [store_slug, product_slug]);

  const handleAddToCart = async (): Promise<void> => {
    if (!product) return;
    
    setIsAdding(true);
    try {
      // Map API product to cart product structure
      const cartProduct = {
        id: product.id,
        title: product.name,
        currentPrice: product.discounted_price || product.base_price,
        originalPrice: product.base_price,
        images: product.product_images.map(img => img.image_url),
        imageUrl: product.product_images.find(img => img.is_primary)?.image_url || 
                 product.product_images[0]?.image_url || 
                 "/placeholder.png",
        category: product.categories?.name || "Uncategorized",
        rating: 0,
        discount: product.discounted_price ? 
          Math.round(((product.base_price - product.discounted_price) / product.base_price) * 100) : 0
      };

      // Add to cart with selected quantity
      for (let i = 0; i < quantity; i++) {
        // await addToCart(cartProduct);
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

  if (loading) {
    return (
      <>
        <Header />
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
        <Header />
        <div className="container mx-auto px-4 py-6">
          <p className="text-center mt-20 text-lg md:text-xl text-foreground">
            Product not found.
          </p>
        </div>
      </>
    );
  }

  const displayPrice = product.discounted_price || product.base_price;
  const totalPrice = displayPrice * quantity;
  const images = product.product_images.map(img => img.image_url);
  const discount = product.discounted_price ? 
    Math.round(((product.base_price - product.discounted_price) / product.base_price) * 100) : 0;

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <BackButton href={`/${store_slug}`} label="Back to Products" />

        {/* Top section: image + details */}
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
              rating={0}
            />
            <ProductPrice
              price={displayPrice}
              originalPrice={product.base_price}
            />
            <p className="text-muted-foreground mt-4 text-sm sm:text-base md:text-lg">
              {product.description || "No description available."}
            </p>

            {/* Variant Selection - if product has variants */}
            {product.product_variants && product.product_variants.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Variants:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants.map((variant) => (
                    <button
                      key={variant.id}
                      className="px-3 py-2 border border-border rounded-md text-sm hover:bg-accent"
                    >
                      {variant.variant_name}
                      {variant.color && ` - ${variant.color}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                className=""
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-10 border-border" />

        {/* Bottom section: Features + Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10">
          <ProductFeatures features={[]} />
          <ProductSpecifications specs={[]} />
        </div>
      </div>
    </>
  );
}