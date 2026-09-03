"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Input,
  Button,
  Segmented,
  InputNumber,
  Empty,
  Space,
  Switch,
  Typography,
  Tag,
  notification,
} from "antd";
import { SearchOutlined, CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import dataService from "@/lib/queries/dataService";
import {
  getProductsWithVariants,
  ProductWithVariants,
  ProductVariant,
} from "@/lib/queries/products/getProductsWithVariants";
import {
  ProductStatus,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
} from "@/lib/types/enums";
import { CreateOrderData, OrderProduct } from "@/lib/types/order";
import { sanitizeFilename } from "@/lib/utils/printWindow";
import { generateReceiptPdf } from "@/lib/utils/generateReceiptPdf";
import { unlockBeepAudio } from "@/lib/utils/beep";
import { getStorePublicUrl, renderProductQrDataUrl } from "@/lib/utils/productQr";
import { getOrCreateCustomerByPhone } from "@/lib/queries/customers/getOrCreateCustomerByPhone";
import { recordCustomerPayment } from "@/lib/queries/customers/recordCustomerPayment";
import VariantPickerModal from "./VariantPickerModal";
import ReceiptPreviewModal from "./ReceiptPreviewModal";
import ScanToAddModal from "./ScanToAddModal";

const { Text, Title } = Typography;

const PAYMENT_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.MOBILE_BANKING]: "Mobile Banking",
};

function getEffectivePrice(product: ProductWithVariants): number {
  return product.discounted_price && product.discounted_price > 0
    ? product.discounted_price
    : product.base_price || 0;
}
function getAvailableQuantity(product: ProductWithVariants): number {
  const stock = product.product_inventory[0];
  if (!stock) return 0;
  return Math.max(0, stock.quantity_available - stock.quantity_reserved);
}
function getVariantEffectivePrice(variant: ProductVariant): number {
  return variant.discounted_price && variant.discounted_price > 0
    ? variant.discounted_price
    : variant.base_price || 0;
}
function getVariantAvailableQuantity(variant: ProductVariant): number {
  const stock = variant.product_inventory[0];
  if (!stock) return 0;
  return Math.max(0, stock.quantity_available - stock.quantity_reserved);
}
// Mirrors ProductTable.tsx's getProductImage — same fallback order (product
// primary image → product's first image → a variant's primary/first image).
function getProductImage(product: ProductWithVariants): string {
  const img =
    product.product_images?.find((i) => i.is_primary) ||
    product.product_images?.[0] ||
    product.product_variants?.flatMap((v) => v.product_images || []).find((i) => i.is_primary) ||
    product.product_variants?.flatMap((v) => v.product_images || [])[0];
  return (
    img?.image_url ||
    "https://lizjlqgrurjegmjeujki.supabase.co/storage/v1/object/public/dummyImage/logo_beta.png"
  );
}

export default function QuickSale() {
  const { user, storeSlug } = useCurrentUser();
  const { store } = useStore(user?.store_id ?? null);
  const { icon: currencyIconRaw, loading: currencyLoading } = useUserCurrencyIcon();
  // icon is typed ReactNode (some currencies render as an icon component),
  // but every place here needs a plain string — safe today since only BDT
  // ("৳", a plain string) is an active currency (see Currency enum).
  const currencyIcon =
    !currencyLoading && typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [cart, setCart] = useState<OrderProduct[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [isDueSale, setIsDueSale] = useState(false);
  const [amountReceivedNow, setAmountReceivedNow] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [variantPickerProduct, setVariantPickerProduct] =
    useState<ProductWithVariants | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const [receiptPdfBlob, setReceiptPdfBlob] = useState<Blob | null>(null);
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

  // Briefly highlights the cart row a scan (or tap) just touched, so the
  // "✓ Added" confirmation has a second, harder-to-miss signal than a
  // status line under the camera view.
  const [flashKey, setFlashKey] = useState<string | null>(null);
  useEffect(() => {
    if (!flashKey) return;
    const t = setTimeout(() => setFlashKey(null), 900);
    return () => clearTimeout(t);
  }, [flashKey]);

  // Loads the full active, non-bundle catalog once (no server-side search)
  // so the tap grid feels instant and "Scan to Add" always has the complete
  // set to match a scanned slug against — unlike the paginated/searched
  // picker in the Create Order flow, this is optimized for speed over a
  // huge catalog.
  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) return;
    setLoadingProducts(true);
    try {
      const res = await getProductsWithVariants({
        storeId: user.store_id,
        status: ProductStatus.ACTIVE,
        excludeBundles: true,
        withCounts: false,
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load products for Quick Sale:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [user?.store_id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Distinct categories present in this store's catalog — derived from the
  // already-loaded products rather than a separate query, since Quick Sale
  // pulls the whole catalog up front anyway.
  const categories = Array.from(
    new Map(
      products.filter((p) => p.category).map((p) => [p.category!.id, p.category!]),
    ).values(),
  );

  const visibleProducts = products.filter((p) => {
    if (categoryId && p.category_id !== categoryId) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const addToCart = (
    product: ProductWithVariants,
    variant?: ProductVariant,
    qty: number = 1,
  ) => {
    const unitPrice = variant ? getVariantEffectivePrice(variant) : getEffectivePrice(product);
    const available = variant
      ? getVariantAvailableQuantity(variant)
      : getAvailableQuantity(product);
    const costPrice = variant ? (variant.tp_price ?? null) : (product.tp_price ?? null);
    const flashItemKey = `${product.id}:${variant?.id ?? ""}`;

    // Mirrors the existing/new-item stock capping below, computed against the
    // current render's cart snapshot — good enough for a cosmetic flash cue,
    // where setCart's functional form (not this) is what guarantees the cart
    // itself stays correct under rapid calls.
    const existingIdx = cart.findIndex(
      (it) => it.product_id === product.id && (it.variant_id || undefined) === variant?.id,
    );
    const willAdd =
      existingIdx !== -1
        ? Math.min(cart[existingIdx].quantity + qty, available) > cart[existingIdx].quantity
        : Math.min(qty, available) >= 1;
    if (willAdd) setFlashKey(flashItemKey);

    setCart((prev) => {
      const idx = prev.findIndex(
        (it) => it.product_id === product.id && (it.variant_id || undefined) === variant?.id,
      );
      if (idx !== -1) {
        const cappedQty = Math.min(prev[idx].quantity + qty, available);
        if (cappedQty <= prev[idx].quantity) {
          notification.warning({ message: "No more stock available for this item." });
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: cappedQty,
          total_price: unitPrice * cappedQty,
        };
        return updated;
      }
      const cappedQty = Math.min(qty, available);
      if (cappedQty < 1) {
        notification.warning({ message: "This item is out of stock." });
        return prev;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant?.id,
          product_name: product.name,
          variant_name: variant?.variant_name || undefined,
          variant_details: variant
            ? {
                variant_name: variant.variant_name,
                color: variant.color,
                base_price: variant.base_price,
                discounted_price: variant.discounted_price,
              }
            : undefined,
          quantity: cappedQty,
          unit_price: unitPrice,
          total_price: unitPrice * cappedQty,
          cost_price: costPrice,
        },
      ];
    });
  };

  const handleTapProduct = (product: ProductWithVariants): "added" | "variant-needed" => {
    const activeVariants = (product.product_variants || []).filter((v) => v.is_active);
    if (activeVariants.length > 0) {
      setVariantPickerProduct(product);
      return "variant-needed";
    }
    addToCart(product);
    return "added";
  };

  const updateCartQty = (index: number, newQty: number) => {
    setCart((prev) => {
      const item = prev[index];
      const product = products.find((p) => p.id === item.product_id);
      const variant = product?.product_variants?.find((v) => v.id === item.variant_id);
      const available = variant
        ? getVariantAvailableQuantity(variant)
        : product
          ? getAvailableQuantity(product)
          : newQty;
      const clamped = Math.max(1, Math.min(newQty, available || newQty));
      const updated = [...prev];
      updated[index] = { ...item, quantity: clamped, total_price: item.unit_price * clamped };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((sum, it) => sum + it.total_price, 0);
  const total = Math.max(0, subtotal - discount);
  const changeDue =
    !isDueSale && paymentMethod === PaymentMethod.CASH && cashReceived != null
      ? Math.max(0, cashReceived - total)
      : null;
  const receivedNow = isDueSale ? Math.min(Math.max(amountReceivedNow || 0, 0), total) : total;
  const dueAmount = isDueSale ? Math.max(0, total - receivedNow) : 0;
  const canCompleteSale =
    cart.length > 0 && (!isDueSale || (walkInName.trim() !== "" && walkInPhone.trim() !== ""));

  const printReceipt = async (order: {
    orderNumber: string;
    items: OrderProduct[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: PaymentMethod;
    cashReceived: number | null;
    changeDue: number | null;
    paidNow: number | null;
    due: number | null;
    date: Date;
  }) => {
    const storeDisplayName = store?.store_name || "My Shop";
    const logoUrl = store?.logo_url;

    // A QR on the receipt pointing at the shop's own storefront (not a
    // product) — lets a walk-in customer find/shop with the store online
    // later.
    let shopQrDataUrl: string | null = null;
    if (storeSlug) {
      try {
        shopQrDataUrl = await renderProductQrDataUrl(getStorePublicUrl(storeSlug), logoUrl);
      } catch (err) {
        console.error("Failed to generate shop QR for receipt:", err);
      }
    }

    // A real PDF, not a browser print() of HTML: the 58mm thermal-roll page
    // size is baked into the file itself, so it survives mobile print
    // pipelines (iOS AirPrint, Android print bridges like RawBT) that
    // otherwise silently substitute a Letter/A4 page for anything printed
    // as HTML — see generateReceiptPdf.ts for the full reasoning.
    const pdfBlob = await generateReceiptPdf({
      storeName: storeDisplayName,
      logoUrl,
      dateLabel: order.date.toLocaleString(),
      orderNumber: order.orderNumber,
      items: order.items.map((it) => ({
        name: it.product_name + (it.variant_name ? ` (${it.variant_name})` : ""),
        qty: it.quantity,
        amount: it.total_price,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      paymentLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
      cashReceived: order.cashReceived,
      changeDue: order.changeDue,
      paidNow: order.paidNow,
      due: order.due,
      currencyIcon,
      shopQrDataUrl,
    });

    const fileTitle = sanitizeFilename(`${storeDisplayName}-${order.orderNumber}`);
    setReceiptPdfBlob(pdfBlob);
    setReceiptFileName(`${fileTitle}.pdf`);
    setReceiptPreviewOpen(true);
  };

  const handleCompleteSale = async () => {
    if (!user?.store_id || !canCompleteSale) return;
    setSubmitting(true);
    try {
      // A due sale needs a real customer record (not just free-text name/
      // phone) so the balance can be found and collected again later — see
      // getOrCreateCustomerByPhone.ts.
      let customerId: string | undefined;
      if (isDueSale) {
        const customerResult = await getOrCreateCustomerByPhone(
          user.store_id,
          walkInName.trim(),
          walkInPhone.trim(),
        );
        if (!customerResult.customerId) {
          notification.error({
            message: "Couldn't save due sale",
            description: customerResult.error || "Could not resolve the customer record.",
          });
          setSubmitting(false);
          return;
        }
        customerId = customerResult.customerId;
      }

      // Same order-number shape as the Create Order flow (see CreateOrder.tsx)
      // so Quick Sale numbers look at home next to every other order.
      const now = new Date();
      const yy = now.getFullYear().toString().slice(2);
      const mm = (now.getMonth() + 1).toString().padStart(2, "0");
      const dd = now.getDate().toString().padStart(2, "0");
      const uid = crypto.randomUUID().replace(/-/g, "").substring(0, 5).toUpperCase();
      const storeTag = (store?.store_name || "STORE").replace(/\s+/g, "").toUpperCase().slice(0, 10);
      const orderNumber = `${storeTag}-${yy}${mm}${dd}-${uid}`;

      const orderData: CreateOrderData = {
        storeId: user.store_id,
        orderNumber,
        customerInfo: {
          name: walkInName.trim() || "Walk-in Customer",
          phone: walkInPhone.trim() || "N/A",
          address: "In-store purchase",
          city: "N/A",
          deliveryOption: DeliveryOption.OTHER,
          email: "",
          postal_code: "",
          customer_id: customerId,
        },
        orderProducts: cart,
        subtotal,
        taxAmount: 0,
        discount,
        additionalCharges: 0,
        deliveryCost: 0,
        totalAmount: total,
        status: OrderStatus.DELIVERED,
        // Goods leave the counter either way — only the payment status
        // reflects whether the full total was actually collected.
        paymentStatus:
          isDueSale && dueAmount > 0.01 ? PaymentStatus.PENDING : PaymentStatus.PAID,
        paymentMethod,
        deliveryOption: DeliveryOption.OTHER,
        // Quick Sale orders are created already DELIVERED, so the Delivery
        // Courier field locks immediately and can never be set afterward —
        // "shop" (the built-in in-store pickup courier every store gets,
        // see the 20260901010000 migration) has to be set here at creation
        // time or the field is stuck permanently blank.
        courier: "shop",
        channel: "pos",
        currency: "BDT",
      };

      const result = await dataService.createOrder(orderData);
      if (result.success) {
        // Record whatever was actually collected up front against the due
        // balance — pinned to this order so it's excluded from the "pool"
        // waterfall other due orders for the same customer might use.
        if (isDueSale && customerId && receivedNow > 0 && result.orderId) {
          const paymentResult = await recordCustomerPayment({
            storeId: user.store_id,
            customerId,
            orderId: result.orderId,
            amount: receivedNow,
            paymentMethod,
            paymentDate: now.toISOString().slice(0, 10),
          });
          if (!paymentResult.success) {
            notification.warning({
              message: "Sale recorded, but the payment log failed",
              description: paymentResult.error,
            });
          }
        }

        notification.success({
          message: "Sale completed",
          description: `Order #${orderNumber} recorded.`,
        });
        await printReceipt({
          orderNumber,
          items: cart,
          subtotal,
          discount,
          total,
          paymentMethod,
          cashReceived,
          changeDue,
          paidNow: isDueSale ? receivedNow : null,
          due: isDueSale ? dueAmount : null,
          date: now,
        });
        setCart([]);
        setDiscount(0);
        setWalkInName("");
        setWalkInPhone("");
        setCashReceived(null);
        setIsDueSale(false);
        setAmountReceivedNow(null);
        fetchProducts();
      } else {
        notification.error({ message: "Sale failed", description: result.error });
      }
    } catch (err) {
      notification.error({
        message: "Sale failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
            Quick Sale
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Ring up a walk-in customer without leaving the counter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Product picker */}
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              placeholder="Search products…"
              allowClear
              size="large"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              size="large"
              icon={<CameraOutlined />}
              onClick={() => {
                // Unlocking here (a direct tap) rather than inside the scan
                // loop later — iOS Safari only lets an AudioContext produce
                // sound if it's created/resumed synchronously inside a real
                // user gesture like this click.
                unlockBeepAudio();
                setScanOpen(true);
              }}
              className="w-full sm:w-auto"
            >
              Scan to Add
            </Button>
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  categoryId === null
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : "bg-card border-border text-muted-foreground hover:border-indigo-400"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    categoryId === cat.id
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "bg-card border-border text-muted-foreground hover:border-indigo-400"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {loadingProducts ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading products…
            </div>
          ) : visibleProducts.length === 0 ? (
            <Empty description="No active products found" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {visibleProducts.map((product) => {
                const available = getAvailableQuantity(product);
                const hasVariants = (product.product_variants || []).some((v) => v.is_active);
                const outOfStock = !hasVariants && available <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleTapProduct(product)}
                    disabled={outOfStock}
                    className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background/60 p-3 min-h-19 text-left transition-all duration-150 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <Image
                        src={getProductImage(product)}
                        alt=""
                        fill
                        sizes="140px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground line-clamp-2">
                      {product.name}
                    </span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {currencyIcon}
                      {getEffectivePrice(product).toFixed(2)}
                    </span>
                    {hasVariants ? (
                      <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                        variants
                      </Tag>
                    ) : outOfStock ? (
                      <Tag color="red" style={{ marginInlineEnd: 0 }}>
                        Out of stock
                      </Tag>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart / checkout */}
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
          <Title level={5} style={{ margin: 0 }}>
            Current Sale
          </Title>

          {cart.length === 0 ? (
            <Empty description="Cart is empty — tap a product to add it." />
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between gap-2 py-2 rounded-lg px-1 -mx-1 transition-colors duration-700 ${
                    flashKey === `${item.product_id}:${item.variant_id ?? ""}`
                      ? "bg-emerald-100 dark:bg-emerald-500/20"
                      : "bg-transparent"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {item.product_name}
                      {item.variant_name && (
                        <span className="text-muted-foreground"> · {item.variant_name}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currencyIcon}
                      {item.unit_price} each
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity <= 1
                            ? removeFromCart(index)
                            : updateCartQty(index, item.quantity - 1)
                        }
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-foreground text-base font-semibold active:scale-95 hover:border-indigo-400"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(index, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-foreground text-base font-semibold active:scale-95 hover:border-indigo-400"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">
                      {currencyIcon}
                      {item.total_price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(index)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-red-500 active:scale-95 hover:bg-red-50 dark:hover:bg-red-500/10"
                      aria-label="Remove item"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <Text type="secondary">Subtotal</Text>
              <Text>
                {currencyIcon}
                {subtotal.toFixed(2)}
              </Text>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Text type="secondary">Discount</Text>
              <InputNumber
                min={0}
                value={discount}
                onChange={(v) => setDiscount(v || 0)}
                style={{ width: 110 }}
              />
            </div>
            <div className="flex items-center justify-between text-base font-bold border-t border-dashed border-border pt-2">
              <span>Total</span>
              <span>
                {currencyIcon}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Text type="secondary" className="text-xs">
              Payment method
            </Text>
            <Segmented
              block
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v as PaymentMethod)}
              options={[
                { label: "Cash", value: PaymentMethod.CASH },
                { label: "Card", value: PaymentMethod.CARD },
                { label: "Mobile Banking", value: PaymentMethod.MOBILE_BANKING },
              ]}
            />
          </div>

          {!isDueSale && paymentMethod === PaymentMethod.CASH && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-sm">
                <Text type="secondary">Cash received</Text>
                <InputNumber
                  min={0}
                  value={cashReceived}
                  onChange={(v) => setCashReceived(v)}
                  placeholder="0.00"
                  style={{ width: 110 }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Text type="secondary">Change due</Text>
                <Text strong>
                  {currencyIcon}
                  {(changeDue ?? 0).toFixed(2)}
                </Text>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div>
              <Text className="text-sm">Customer will pay later (Due)</Text>
              <div className="text-xs text-muted-foreground">
                Records a store-credit balance you can collect anytime.
              </div>
            </div>
            <Switch
              checked={isDueSale}
              onChange={(checked) => {
                setIsDueSale(checked);
                if (!checked) setAmountReceivedNow(null);
              }}
            />
          </div>

          {isDueSale && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-sm">
                <Text type="secondary">Amount received now</Text>
                <InputNumber
                  min={0}
                  max={total}
                  value={amountReceivedNow}
                  onChange={(v) => setAmountReceivedNow(v)}
                  placeholder="0.00 (fully due)"
                  style={{ width: 140 }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Text type="secondary">Due</Text>
                <Text strong type={dueAmount > 0 ? "danger" : undefined}>
                  {currencyIcon}
                  {dueAmount.toFixed(2)}
                </Text>
              </div>
            </div>
          )}

          <Space.Compact block>
            <Input
              placeholder={isDueSale ? "Customer name *" : "Customer name (optional)"}
              status={isDueSale && !walkInName.trim() ? "error" : undefined}
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
            />
            <Input
              placeholder={isDueSale ? "Phone *" : "Phone (optional)"}
              status={isDueSale && !walkInPhone.trim() ? "error" : undefined}
              value={walkInPhone}
              onChange={(e) => setWalkInPhone(e.target.value)}
            />
          </Space.Compact>
          {isDueSale && (!walkInName.trim() || !walkInPhone.trim()) && (
            <Text type="danger" className="text-xs">
              Name and phone are required for a due sale, so this balance can be collected later.
            </Text>
          )}

          <Button
            type="primary"
            size="large"
            block
            disabled={!canCompleteSale}
            loading={submitting}
            onClick={handleCompleteSale}
          >
            Complete Sale · {currencyIcon}
            {total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Mobile-only: keeps the total + Complete Sale reachable without
          scrolling past the product grid — on lg+ the cart panel sits
          alongside the grid already, so this stays hidden there. */}
      {cart.length > 0 && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 flex items-center justify-between gap-3 border-t border-border bg-card/95 backdrop-blur px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
          // Above the dashboard-wide "Back to Top" button (zIndex 9999,
          // see dashboard/layout.tsx) so it can't float on top of Complete
          // Sale — the checkout action takes priority on this screen.
          style={{ zIndex: 10000 }}
        >
          <div>
            <div className="text-[11px] text-muted-foreground">Total</div>
            <div className="text-lg font-bold text-foreground">
              {currencyIcon}
              {total.toFixed(2)}
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            disabled={!canCompleteSale}
            loading={submitting}
            onClick={handleCompleteSale}
            style={{ flex: 1, maxWidth: 220 }}
          >
            Complete Sale
          </Button>
        </div>
      )}

      <VariantPickerModal
        open={!!variantPickerProduct}
        product={variantPickerProduct}
        currencyIcon={currencyIcon}
        onClose={() => setVariantPickerProduct(null)}
        onConfirm={(variant, qty) => {
          if (variantPickerProduct) addToCart(variantPickerProduct, variant, qty);
          setVariantPickerProduct(null);
        }}
      />

      <ScanToAddModal
        open={scanOpen}
        paused={!!variantPickerProduct}
        products={products}
        onClose={() => setScanOpen(false)}
        onProductFound={(product) => handleTapProduct(product)}
      />

      <ReceiptPreviewModal
        open={receiptPreviewOpen}
        pdfBlob={receiptPdfBlob}
        fileName={receiptFileName}
        onClose={() => setReceiptPreviewOpen(false)}
      />
    </div>
  );
}
