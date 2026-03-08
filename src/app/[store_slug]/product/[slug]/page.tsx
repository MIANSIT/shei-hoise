/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import useCartStore from "@/lib/store/cartStore";
import { getClientProductBySlug } from "@/lib/queries/products/getClientProductBySlug";
import ProductImage from "@/app/components/products/singleProduct/ProductImage";
import ProductPrice from "@/app/components/products/singleProduct/ProductPrice";
import AddToCartButton from "@/app/components/products/singleProduct/AddToCartButton";
import { motion, AnimatePresence } from "framer-motion";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { ProductPageSkeleton } from "../../../components/skeletons/ProductPageSkeleton";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  Minus,
  Plus,
  // ShoppingCart,
  Truck,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  Star,
} from "lucide-react";

interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  base_price: number;
  discounted_price: number | null;
  discount_amount?: number;
  categories: { id: string; name: string } | null;
  product_images: Array<{ id: string; image_url: string; is_primary: boolean }>;
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
    attributes?: Record<string, any>;
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

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
const Breadcrumb = ({
  store,
  category,
  name,
}: {
  store: string;
  category: string;
  name: string;
}) => (
  <nav className="hidden md:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
    <a
      href={`/${store}`}
      className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
    >
      Shop
    </a>
    <span>/</span>
    <span className="text-gray-500 dark:text-gray-400">{category}</span>
    <span>/</span>
    <span className="text-gray-900 dark:text-gray-100 truncate max-w-45">
      {name}
    </span>
  </nav>
);

// ─── Stars ────────────────────────────────────────────────────────────────────
const Stars = ({
  rating = 5,
  count = 128,
}: {
  rating?: number;
  count?: number;
}) => (
  <div className="flex items-center gap-1.5">
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          }`}
        />
      ))}
    </div>
    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
      ({count})
    </span>
  </div>
);

// ─── Accordion ────────────────────────────────────────────────────────────────
const DescAccordion = ({
  title,
  children,
  open: defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tracking-wide">
          {title}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Trust badge ──────────────────────────────────────────────────────────────
const TrustBadge = ({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) => (
  <div className="flex flex-col items-center gap-2 text-center">
    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
      {icon}
    </div>
    <div>
      <p className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
    </div>
  </div>
);

// ─── Description renderer ─────────────────────────────────────────────────────
function renderDescription(description: string): React.ReactNode[] {
  const lines = description.split("\n");
  const els: React.ReactNode[] = [];
  let list: string[] = [],
    para: string[] = [];

  const fp = (key: string) => {
    if (para.length) {
      els.push(<p key={key}>{para.join(" ")}</p>);
      para = [];
    }
  };
  const fl = (key: string) => {
    if (list.length) {
      els.push(
        <ul key={key} className="ml-1 space-y-1.5">
          {list.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600 shrink-0" />
              {it}
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((line, idx) => {
    const t = line.trim();
    if (!t) {
      fp(`p-${idx}`);
      fl(`ul-${idx}`);
      return;
    }
    if (t.startsWith("•")) {
      fp(`p-${idx}`);
      list.push(t.slice(1).trim());
      return;
    }
    if (t === t.toUpperCase() && t.length > 2) {
      fp(`p-${idx}`);
      fl(`ul-${idx}`);
      els.push(
        <p
          key={`h-${idx}`}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-300 pt-2"
        >
          {t}
        </p>,
      );
      return;
    }
    para.push(t);
  });
  fp("p-end");
  fl("ul-end");
  return els;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const params = useParams();
  const store_slug = params.store_slug as string;
  const product_slug = params.slug as string;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showMaxErr, setShowMaxErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();
  const { cart, addToCart } = useCartStore();
  const { success: toastSuccess, error: toastError } = useSheiNotification();
  const curr = currencyLoading ? "৳" : (currencyIcon ?? "৳");

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedVariantData =
    product?.product_variants?.find((v) => v.id === selectedVariant) ?? null;

  const originalPrice = selectedVariantData
    ? selectedVariantData.base_price
    : product?.base_price || 0;
  const rawDiscounted = selectedVariantData
    ? selectedVariantData.discounted_price
    : product?.discounted_price;
  const displayPrice =
    rawDiscounted && rawDiscounted > 0 && rawDiscounted < originalPrice
      ? rawDiscounted
      : originalPrice;
  const discount =
    displayPrice < originalPrice && originalPrice > 0
      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
      : 0;

  const availableStock =
    selectedVariantData !== null
      ? (selectedVariantData.product_inventory?.[0]?.quantity_available ?? 0)
      : (product?.product_inventory?.[0]?.quantity_available ?? 0);

  const cartQty = (() => {
    if (!product) return 0;
    return (
      cart.find(
        (i) =>
          i.productId === product.id &&
          i.variantId === (selectedVariantData?.id ?? null) &&
          i.storeSlug === store_slug,
      )?.quantity ?? 0
    );
  })();

  const remaining = Math.max(0, availableStock - cartQty);
  const isOutOfStock = remaining <= 0;
  const stockStatus =
    availableStock <= 0
      ? "out"
      : remaining === 0
        ? "maxed"
        : availableStock <= 10
          ? "low"
          : "in";
  const hasLowStockVariant = product?.product_variants?.some(
    (v) =>
      (v.product_inventory?.[0]?.quantity_available ?? 0) > 0 &&
      (v.product_inventory?.[0]?.quantity_available ?? 0) <= 10,
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        if (!product_slug) return;
        const data = await getClientProductBySlug(product_slug);
        if (!data) {
          setProduct(null);
          return;
        }
        const fixed = {
          ...data,
          categories: Array.isArray(data.categories)
            ? (data.categories[0] ?? null)
            : data.categories,
          product_variants: (data.product_variants ?? []).map((v: any) => ({
            ...v,
            primary_image:
              v.product_images?.find((i: any) => i.is_primary) ?? null,
          })),
        };
        setProduct(fixed as ApiProduct);
        if (fixed.product_variants?.length > 0) {
          const first = fixed.product_variants.find(
            (v: any) => (v.product_inventory?.[0]?.quantity_available ?? 0) > 0,
          );
          setSelectedVariant(first?.id ?? fixed.product_variants[0].id);
        }
      } catch (e) {
        console.error(e);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    if (product_slug) fetchProduct();
  }, [product_slug]);

  useEffect(() => {
    if (showMaxErr) {
      const t = setTimeout(() => setShowMaxErr(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showMaxErr]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!product || isOutOfStock || quantity > remaining) return;
    setIsAdding(true);
    try {
      addToCart({
        productId: product.id,
        storeSlug: store_slug,
        quantity,
        variantId: selectedVariantData?.id ?? null,
      } as AddToCartType);
      toastSuccess(`${product.name} added to cart`);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2200);
      setQuantity(1);
    } catch {
      toastError("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const handleIncrement = () => {
    if (quantity < remaining) setQuantity((q) => q + 1);
    else {
      setShowMaxErr(true);
      toastError("Maximum quantity reached");
    }
  };
  const handleDecrement = () => quantity > 1 && setQuantity((q) => q - 1);
  const handleInputBlur = () => {
    let v = parseInt(inputValue, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > remaining) {
      v = remaining;
      setShowMaxErr(true);
    }
    setQuantity(v);
    setInputValue("");
    setIsEditing(false);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return <ProductPageSkeleton />;
  if (!product)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Product not found.
        </p>
        <a
          href={`/${store_slug}`}
          className="text-xs font-semibold text-gray-900 dark:text-gray-100 underline underline-offset-4"
        >
          Back to shop
        </a>
      </div>
    );

  const images = product.product_images.map((i) => i.image_url);
  const hasVariants = (product.product_variants?.length ?? 0) > 0;
  const totalPrice = displayPrice * quantity;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <a
            href={`/${store_slug}`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </a>
          <Breadcrumb
            store={store_slug}
            category={product.categories?.name ?? "Products"}
            name={product.name}
          />
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 lg:gap-12 lg:items-start">
          {/* LEFT — image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="lg:sticky lg:top-18"
          >
            <ProductImage
              images={images}
              alt={product.name}
              basePrice={selectedVariantData?.base_price ?? product.base_price}
              discountedPrice={
                selectedVariantData?.discounted_price ??
                product.discounted_price
              }
            />
          </motion.div>

          {/* RIGHT — info card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.4)] p-6 md:p-8 transition-colors duration-200"
          >
            {/* Category + stars */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                {product.categories?.name ?? "Product"}
              </span>
              <Stars />
            </div>

            {/* Name */}
            <h1 className="text-[26px] sm:text-[28px] font-bold text-gray-900 dark:text-gray-50 leading-[1.2] tracking-[-0.02em] mb-3">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mb-4">
              <ProductPrice
                price={displayPrice}
                originalPrice={originalPrice}
              />
            </div>

            {/* Short desc */}
            {product.short_description && (
              <p className="text-[13.5px] text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                {product.short_description}
              </p>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 mb-5" />

            {/* Variants */}
            {hasVariants && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-300">
                    Size
                  </span>
                  <button className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.product_variants.map((v) => {
                    const inStock =
                      (v.product_inventory?.[0]?.quantity_available ?? 0) > 0;
                    const isLow =
                      inStock &&
                      (v.product_inventory?.[0]?.quantity_available ?? 0) <= 10;
                    const isSelected = selectedVariant === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          if (!inStock) {
                            toastError("This variant is out of stock");
                            return;
                          }
                          setSelectedVariant(v.id);
                          setQuantity(1);
                          setInputValue("");
                          setIsEditing(false);
                        }}
                        disabled={!inStock}
                        className={[
                          "relative px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                          isSelected
                            ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm scale-[1.03]"
                            : inStock
                              ? "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-gray-300"
                              : "bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 border border-gray-100 dark:border-gray-800 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {!inStock && (
                          <span
                            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                            aria-hidden
                          >
                            <span
                              className="absolute inset-0"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(135deg,transparent,transparent 5px,rgba(0,0,0,0.06) 5px,rgba(0,0,0,0.06) 6px)",
                              }}
                            />
                          </span>
                        )}
                        <span className="relative">{v.variant_name}</span>
                        {isLow && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white dark:border-gray-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {hasLowStockVariant && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Low stock on some sizes
                  </p>
                )}
              </div>
            )}

            {/* Qty + total */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-300">
                  Qty
                </span>
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 h-10">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div
                    className="w-10 h-10 flex items-center justify-center cursor-text"
                    onClick={() => {
                      if (!isOutOfStock) {
                        setIsEditing(true);
                        setInputValue(quantity.toString());
                        setTimeout(() => inputRef.current?.select(), 10);
                      }
                    }}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) =>
                          setInputValue(e.target.value.replace(/\D/g, ""))
                        }
                        onBlur={handleInputBlur}
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.currentTarget.blur()
                        }
                        className="w-full h-full text-center bg-transparent text-[13px] font-bold focus:outline-none text-gray-900 dark:text-gray-100"
                        maxLength={3}
                      />
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={quantity}
                          initial={{ y: -6, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 6, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="text-[13px] font-bold text-gray-900 dark:text-gray-100"
                        >
                          {quantity}
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </div>
                  <button
                    onClick={handleIncrement}
                    disabled={isOutOfStock || quantity >= remaining}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                  Total
                </p>
                <motion.p
                  key={totalPrice}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-[20px] font-extrabold text-gray-900 dark:text-gray-50 tracking-tight"
                >
                  {curr}
                  {totalPrice.toFixed(2)}
                </motion.p>
              </div>
            </div>

            {/* Max qty error */}
            <AnimatePresence>
              {showMaxErr && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[12px] text-rose-500 dark:text-rose-400 font-medium mb-2 overflow-hidden"
                >
                  Maximum available quantity reached
                </motion.p>
              )}
            </AnimatePresence>

            {/* Stock status */}
            <div className="mb-4">
              {stockStatus === "out" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Out of Stock
                </span>
              )}
              {stockStatus === "maxed" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Max quantity in cart
                </span>
              )}
              {stockStatus === "low" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Limited Stock
                </span>
              )}
              {stockStatus === "in" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  In Stock
                </span>
              )}
            </div>

            {/* CTA */}
            <AddToCartButton
              onClick={handleAddToCart}
              isLoading={isAdding}
              showSuccess={addedSuccess}
              disabled={isOutOfStock}
              isMaxInCart={stockStatus === "maxed"}
              currentCartQuantity={cartQty}
            />

            {/* Trust badges */}
            {/* <div className="mt-6 grid grid-cols-3 gap-2 py-5 border-t border-b border-gray-100 dark:border-gray-800">
              <TrustBadge
                icon={<Truck className="w-4 h-4" />}
                title="Free Delivery"
                sub="Orders over ৳1,000"
              />
              <TrustBadge
                icon={<RefreshCw className="w-4 h-4" />}
                title="Easy Returns"
                sub="Within 7 days"
              />
              <TrustBadge
                icon={<ShieldCheck className="w-4 h-4" />}
                title="Secure Payment"
                sub="100% protected"
              />
            </div> */}

            {/* SKU */}
            <p className="mt-3 text-[11px] text-gray-300 dark:text-gray-700 text-right font-medium">
              SKU: {selectedVariantData?.sku ?? product.sku}
            </p>

            {/* Accordions */}
            <div className="mt-4">
              <DescAccordion title="Description" open>
                <div className="space-y-2.5">
                  {product.description ? (
                    renderDescription(product.description)
                  ) : (
                    <p className="text-gray-400 dark:text-gray-600">
                      No description available.
                    </p>
                  )}
                </div>
              </DescAccordion>

              <DescAccordion title="Product Details">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {(
                    [
                      ["Category", product.categories?.name ?? "Uncategorized"],
                      ["SKU", selectedVariantData?.sku ?? product.sku],
                      ...(selectedVariantData
                        ? [
                            ["Variant", selectedVariantData.variant_name],
                            ...(selectedVariantData.attributes
                              ? Object.entries(
                                  selectedVariantData.attributes,
                                ).map(([k, v]) => [
                                  k.charAt(0).toUpperCase() +
                                    k.slice(1).replace(/_/g, " "),
                                  String(v),
                                ])
                              : []),
                          ]
                        : []),
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-gray-400 dark:text-gray-500 font-medium">
                        {label}
                      </dt>
                      <dd className="text-gray-700 dark:text-gray-300 font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </DescAccordion>

              {discount > 0 && (
                <DescAccordion title="Pricing">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                    <dt className="text-gray-400 dark:text-gray-500 font-medium">
                      Base Price
                    </dt>
                    <dd className="text-gray-700 dark:text-gray-300 font-semibold">
                      {curr}
                      {originalPrice.toFixed(2)}
                    </dd>
                    <dt className="text-gray-400 dark:text-gray-500 font-medium">
                      Sale Price
                    </dt>
                    <dd className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {curr}
                      {displayPrice.toFixed(2)}
                    </dd>
                    <dt className="text-gray-400 dark:text-gray-500 font-medium">
                      You Save
                    </dt>
                    <dd className="text-rose-500 dark:text-rose-400 font-bold">
                      {curr}
                      {(originalPrice - displayPrice).toFixed(2)} ({discount}%)
                    </dd>
                  </dl>
                </DescAccordion>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
