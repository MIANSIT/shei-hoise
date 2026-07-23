/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import useCartStore from "@/lib/store/cartStore";
import { getClientProductBySlug } from "@/lib/queries/products/getClientProductBySlug";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import ProductImage from "@/app/components/products/singleProduct/ProductImage";
import ProductPrice from "@/app/components/products/singleProduct/ProductPrice";
import AddToCartButton from "@/app/components/products/singleProduct/AddToCartButton";
import BuyNowButton from "@/app/components/products/singleProduct/BuyNowButton";
import { motion, AnimatePresence } from "framer-motion";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { fbq, FbEvent } from "@/lib/utils/fbPixel";
import { ProductPageSkeleton } from "../../../components/skeletons/ProductPageSkeleton";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { StoreSettings } from "@/lib/types/store/store";
import {
  Minus,
  Plus,
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
  product_type?: "simple" | "bundle";
  component_value?: number;
  bundle_items?: Array<{
    id: string;
    quantity_needed: number;
    option_group_id: string | null;
    option_group_label: string | null;
    component?: {
      id: string;
      name: string;
      primary_image?: { image_url: string } | null;
      available_stock?: number;
    };
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

// ─── Trust Badge ──────────────────────────────────────────────────────────────
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
  let list: string[] = [];

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
      fl(`ul-${idx}`);
      els.push(<div key={`sp-${idx}`} className="h-1" />);
      return;
    }
    if (t.startsWith("•")) {
      list.push(t.slice(1).trim());
      return;
    }
    // Only treat as heading if ALL-CAPS and contains at least one Latin uppercase letter
    if (t === t.toUpperCase() && /[A-Z]/.test(t) && t.length > 2) {
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
    fl(`ul-${idx}`);
    els.push(<p key={`p-${idx}`}>{t}</p>);
  });
  fl("ul-end");
  return els;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const params = useParams();
  const store_slug = params.store_slug as string;
  const product_slug = params.slug as string;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showMaxErr, setShowMaxErr] = useState(false);
  const [selectedBundleOptions, setSelectedBundleOptions] = useState<
    Record<string, string>
  >({});
  const inputRef = useRef<HTMLInputElement>(null);

  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();
  const { cart, addToCart } = useCartStore();
  const { success: toastSuccess, error: toastError } = useSheiNotification();
  const router = useRouter();
  const t = useTranslation();
  const n = useLocalNum();
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
  // Bundle choice groups: rows sharing an option_group_id are alternatives
  // for one slot, the customer must pick exactly one before checkout.
  const bundleFixedItems =
    product?.bundle_items?.filter((item) => !item.option_group_id) ?? [];
  const bundleGroups = (() => {
    if (!product?.bundle_items) return [];
    const map = new Map<string, NonNullable<typeof product.bundle_items>>();
    for (const item of product.bundle_items) {
      if (!item.option_group_id) continue;
      const arr = map.get(item.option_group_id) ?? [];
      arr.push(item);
      map.set(item.option_group_id, arr);
    }
    return [...map.entries()].map(([groupId, options]) => ({
      groupId,
      label: options[0].option_group_label || "Choose one",
      options,
    }));
  })();
  const bundleSelectionIncomplete =
    product?.product_type === "bundle" &&
    bundleGroups.some((g) => !selectedBundleOptions[g.groupId]);

  const hasLowStockVariant = product?.product_variants?.some(
    (v) =>
      (v.product_inventory?.[0]?.quantity_available ?? 0) > 0 &&
      (v.product_inventory?.[0]?.quantity_available ?? 0) <= 10,
  );

  // ── Trust badge visibility ─────────────────────────────────────────────────
  const showFreeDelivery =
    !!storeSettings?.free_shipping_threshold &&
    storeSettings.free_shipping_threshold > 0;

  const showEasyReturns =
    !!storeSettings?.return_policy_days && storeSettings.return_policy_days > 0;

  const showNoReturn =
    storeSettings !== null &&
    (storeSettings.return_policy_days === 0 ||
      storeSettings.return_policy_days === null);

  const trustBadgeCount =
    1 + (showFreeDelivery ? 1 : 0) + (showEasyReturns || showNoReturn ? 1 : 0);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        if (!product_slug) return;

        const [productData, storeId] = await Promise.all([
          getClientProductBySlug(product_slug),
          getStoreIdBySlug(store_slug),
        ]);

        let localSettings = null;
        if (storeId) {
          localSettings = await getStoreSettings(storeId);
          setStoreSettings(localSettings);
        }

        if (!productData) {
          setProduct(null);
          return;
        }

        const fixed = {
          ...productData,
          categories: Array.isArray(productData.categories)
            ? (productData.categories[0] ?? null)
            : productData.categories,
          product_variants: (productData.product_variants ?? []).map(
            (v: any) => ({
              ...v,
              primary_image:
                v.product_images?.find((i: any) => i.is_primary) ?? null,
            }),
          ),
        };
        setProduct(fixed as ApiProduct);
        setSelectedBundleOptions({});
        let initialVariantId: string | null = null;
        if (fixed.product_variants?.length > 0) {
          const first = fixed.product_variants.find(
            (v: any) => (v.product_inventory?.[0]?.quantity_available ?? 0) > 0,
          );
          initialVariantId = first?.id ?? fixed.product_variants[0].id;
          setSelectedVariant(initialVariantId);
        }

        fbq(FbEvent.VIEW_CONTENT, {
          // Use the variant ID (matching the catalog feed's g:id) when this
          // product has variants, so Facebook can match this event to the
          // correct catalog item for dynamic retargeting ads.
          content_ids: [initialVariantId ?? fixed.id],
          content_name: fixed.name,
          content_type: "product",
          value: fixed.discounted_price ?? fixed.base_price,
          currency: localSettings?.currency ?? "BDT",
        }, store_slug);
      } catch (e) {
        console.error(e);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    if (product_slug) fetchData();
  }, [product_slug, store_slug]);

  useEffect(() => {
    if (showMaxErr) {
      const t = setTimeout(() => setShowMaxErr(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showMaxErr]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!product || isOutOfStock || quantity > remaining) return;
    if (bundleSelectionIncomplete) {
      toastError("Please choose your options for this bundle");
      return;
    }
    setIsAdding(true);
    try {
      addToCart({
        productId: product.id,
        storeSlug: store_slug,
        quantity,
        variantId: selectedVariantData?.id ?? null,
        bundleSelections:
          product.product_type === "bundle" && bundleGroups.length > 0
            ? selectedBundleOptions
            : null,
      } as AddToCartType);
      fbq(FbEvent.ADD_TO_CART, {
        // Variant ID when selected, matching the catalog feed's g:id.
        content_ids: [selectedVariantData?.id ?? product.id],
        content_name: product.name,
        content_type: "product",
        value: displayPrice * quantity,
        currency: storeSettings?.currency ?? "BDT",
        num_items: quantity,
      }, store_slug);
      toastSuccess(`${product.name} ${t.cart.addedSuccess}`);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2200);
      setQuantity(1);
    } catch {
      toastError(t.cart.addFailed);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || isOutOfStock || quantity > remaining) return;
    if (bundleSelectionIncomplete) {
      toastError("Please choose your options for this bundle");
      return;
    }
    setIsBuyingNow(true);
    try {
      addToCart({
        productId: product.id,
        storeSlug: store_slug,
        quantity,
        variantId: selectedVariantData?.id ?? null,
        bundleSelections:
          product.product_type === "bundle" && bundleGroups.length > 0
            ? selectedBundleOptions
            : null,
      } as AddToCartType);
      fbq(FbEvent.ADD_TO_CART, {
        // Variant ID when selected, matching the catalog feed's g:id.
        content_ids: [selectedVariantData?.id ?? product.id],
        content_name: product.name,
        content_type: "product",
        value: displayPrice * quantity,
        currency: storeSettings?.currency ?? "BDT",
        num_items: quantity,
      }, store_slug);
      router.push(`/${store_slug}/checkout`);
    } catch {
      toastError(t.cart.checkoutFailed);
      setIsBuyingNow(false);
    }
  };

  const handleIncrement = () => {
    if (quantity < remaining) setQuantity((q) => q + 1);
    else {
      setShowMaxErr(true);
      toastError(t.product.maxQtyReached);
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
          {t.product.productNotFound}
        </p>
        <a
          href={`/${store_slug}/shop`}
          className="text-xs font-semibold text-gray-900 dark:text-gray-100 underline underline-offset-4"
        >
          {t.product.backToShop}
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
            href={`/${store_slug}/shop`}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.nav.backToShop}
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
              {/* <Stars /> */}
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
              {product.product_type === "bundle" &&
                (product.component_value ?? 0) > displayPrice && (
                  <p className="mt-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Worth {curr}
                    {n(product.component_value!.toFixed(2))} bought separately — save {curr}
                    {n((product.component_value! - displayPrice).toFixed(2))}
                  </p>
                )}
            </div>

            {/* Short desc */}
            {product.short_description && (
              <p className="text-[13.5px] text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                {product.short_description}
              </p>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 mb-5" />

            {/* Bundle contents — fixed items */}
            {product.product_type === "bundle" && bundleFixedItems.length > 0 && (
              <div className="mb-5">
                <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-300">
                  This bundle includes
                </span>
                <ul className="space-y-2">
                  {bundleFixedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
                    >
                      {item.component?.primary_image?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.component.primary_image.image_url}
                          alt={item.component?.name ?? ""}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                      )}
                      <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
                        {item.quantity_needed}× {item.component?.name ?? "Product"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bundle contents — choice groups: customer picks one alternative per slot */}
            {product.product_type === "bundle" &&
              bundleGroups.map((group) => (
                <div key={group.groupId} className="mb-5">
                  <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-300">
                    {group.label}
                  </span>
                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const outOfStock = (option.component?.available_stock ?? 0) <= 0;
                      const isSelected =
                        selectedBundleOptions[group.groupId] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={outOfStock}
                          onClick={() =>
                            setSelectedBundleOptions((prev) => ({
                              ...prev,
                              [group.groupId]: option.id,
                            }))
                          }
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? "border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800/50"
                              : "border-gray-100 dark:border-gray-800"
                          } ${outOfStock ? "opacity-50 cursor-not-allowed" : "hover:border-gray-300 dark:hover:border-gray-600"}`}
                        >
                          {option.component?.primary_image?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={option.component.primary_image.image_url}
                              alt={option.component?.name ?? ""}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                          )}
                          <span className="flex-1 text-[13px] font-medium text-gray-700 dark:text-gray-200">
                            {option.quantity_needed}× {option.component?.name ?? "Product"}
                          </span>
                          {outOfStock && (
                            <span className="text-[11px] font-semibold text-gray-400">
                              Out of stock
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* Variants */}
            {hasVariants && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-300">
                    {t.product.size}
                  </span>
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
                            toastError(t.product.outOfStock);
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
                    {t.product.lowStockSizes}
                  </p>
                )}
              </div>
            )}

            {/* Qty + total */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-300">
                  {t.product.qty}
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
                          {n(quantity)}
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
                  {t.product.total}
                </p>
                <motion.p
                  key={totalPrice}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-[20px] font-extrabold text-gray-900 dark:text-gray-50 tracking-tight"
                >
                  {curr}
                  {n(totalPrice.toFixed(2))}
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
                  {t.product.maxQtyReached}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Stock status */}
            <div className="mb-4">
              {stockStatus === "out" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {t.product.outOfStock}
                </span>
              )}
              {stockStatus === "maxed" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {t.product.maxInCart}
                </span>
              )}
              {stockStatus === "low" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {t.product.limitedStock}
                </span>
              )}
              {stockStatus === "in" && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {t.product.inStock}
                </span>
              )}
            </div>

            {/* CTA */}
            {bundleSelectionIncomplete && (
              <p className="mb-2 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                Choose your options above to continue
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <AddToCartButton
                onClick={handleAddToCart}
                isLoading={isAdding}
                showSuccess={addedSuccess}
                disabled={isOutOfStock || bundleSelectionIncomplete}
                isMaxInCart={stockStatus === "maxed"}
                currentCartQuantity={cartQty}
                className="sm:flex-1"
              />
              <BuyNowButton
                onClick={handleBuyNow}
                isLoading={isBuyingNow}
                disabled={isOutOfStock || bundleSelectionIncomplete}
                className="sm:flex-1"
              />
            </div>

            {/* Trust badges */}
            <div
              className={`mt-6 py-5 border-t border-b border-gray-100 dark:border-gray-800 grid gap-2 ${
                trustBadgeCount === 1
                  ? "grid-cols-1"
                  : trustBadgeCount === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
              }`}
            >
              {showFreeDelivery && (
                <TrustBadge
                  icon={<Truck className="w-4 h-4" />}
                  title={t.product.freeDelivery}
                  sub={`${t.product.ordersOver} ${curr}${n(storeSettings!.free_shipping_threshold!)}`}
                />
              )}
              {showEasyReturns && (
                <TrustBadge
                  icon={<RefreshCw className="w-4 h-4" />}
                  title={t.product.easyReturns}
                  sub={`${t.product.within} ${n(storeSettings!.return_policy_days!)} ${storeSettings!.return_policy_days! > 1 ? t.product.days : t.product.day}`}
                />
              )}
              {showNoReturn && (
                <TrustBadge
                  icon={<RefreshCw className="w-4 h-4" />}
                  title={t.product.noReturns}
                  sub={t.product.allSalesFinal}
                />
              )}
              <TrustBadge
                icon={<ShieldCheck className="w-4 h-4" />}
                title={t.product.securePayment}
                sub={t.product.hundredProtected}
              />
            </div>

            {/* SKU */}
            <p className="mt-3 text-[11px] text-gray-300 dark:text-gray-700 text-right font-medium">
              SKU: {selectedVariantData?.sku ?? product.sku}
            </p>

            {/* Accordions */}
            <div className="mt-4">
              <DescAccordion title={t.product.description} open>
                <div className="space-y-2.5">
                  {product.description ? (
                    renderDescription(product.description)
                  ) : (
                    <p className="text-gray-400 dark:text-gray-600">
                      {t.product.noDescription}
                    </p>
                  )}
                </div>
              </DescAccordion>

              <DescAccordion title={t.product.productDetails}>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {(
                    [
                      [t.product.category, product.categories?.name ?? "Uncategorized"],
                      ["SKU", selectedVariantData?.sku ?? product.sku],
                      ...(selectedVariantData
                        ? [
                            [t.product.variant, selectedVariantData.variant_name],
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
                <DescAccordion title={t.product.pricing}>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                    <dt className="text-gray-400 dark:text-gray-500 font-medium">
                      {t.product.basePrice}
                    </dt>
                    <dd className="text-gray-700 dark:text-gray-300 font-semibold">
                      {curr}
                      {n(originalPrice.toFixed(2))}
                    </dd>
                    <dt className="text-gray-400 dark:text-gray-500 font-medium">
                      {t.product.salePrice}
                    </dt>
                    <dd className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {curr}
                      {n(displayPrice.toFixed(2))}
                    </dd>
                    <dt className="text-gray-400 dark:text-gray-500 font-medium">
                      {t.product.youSave}
                    </dt>
                    <dd className="text-rose-500 dark:text-rose-400 font-bold">
                      {curr}
                      {n((originalPrice - displayPrice).toFixed(2))} ({n(discount)}%)
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
