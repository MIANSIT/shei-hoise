/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/checkout/page.tsx - SIMPLIFIED PHONE-ONLY CHECKOUT
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoreLoadingSkeleton } from "../../components/skeletons/StoreLoadingSkeleton";
import { OrderCompleteSkeleton } from "../../components/skeletons/OrderCompleteSkeleton";
import UnifiedCheckoutLayout from "../../components/products/checkout/UnifiedCheckoutLayout";
import { useUnifiedCartData } from "@/lib/hook/useUnifiedCartData";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import useCartStore from "@/lib/store/cartStore";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { supabase } from "@/lib/supabase";
import { getCustomerByPhone } from "@/lib/queries/customers/getCustomerByPhone";
import { getCustomerByAuthUserId } from "@/lib/queries/customers/getCustomerByEmail";
import { createCustomer } from "@/lib/queries/customers/createCustomer";
import { updateCheckoutCustomerProfile, createCheckoutCustomerProfile } from "@/lib/queries/customers/checkoutCustomerProfile";
import { AnimatePresence } from "framer-motion";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { fbq, FbEvent } from "@/lib/utils/fbPixel";
import { useTranslation } from "@/lib/hook/useTranslation";
import { validateCoupon } from "@/lib/queries/coupons/validateCoupon";
import type { CouponValidationResult } from "@/lib/types/coupon";

export default function CheckoutPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<StoreOrder | null>(null);
  const [taxLoaded, setTaxLoaded] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState("BDT");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const { currency, loading: currencyLoading } = useUserCurrencyIcon();
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;
  const t = useTranslation();

  const notify = useSheiNotification();
  const { clearFormData, clearAccountCreationFlags } = useCheckoutStore();
  const { clearStoreCart } = useCartStore();

  const {
    cartItems,
    calculations,
    loading: cartLoading,
    error: cartError,
  } = useUnifiedCartData({
    storeSlug: store_slug,
    useZustand: true,
  });

  const {
    storeData: invoiceStoreData,
    loading: storeLoading,
    error: storeError,
  } = useInvoiceData({
    storeSlug: store_slug,
  });

  const { processOrder, loading: orderLoading } = useOrderProcess(store_slug);

  const { session, loading: authLoading } = useSupabaseAuth();

  // Memoize user login state
  const isUserLoggedIn = useMemo(() => {
    return Boolean(session?.user);
  }, [session]);

  const isSubmitting = isProcessing || orderLoading;
  const isLoadingOverall = useMemo(() => {
    return cartLoading || authLoading || storeLoading || taxLoaded === false;
  }, [cartLoading, authLoading, storeLoading, taxLoaded]);

  // Use ref to track notification state
  const minOrderCheckComplete = useRef(false);

  // Fetch store settings (tax and min order amount)
  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const storeId = await getStoreIdBySlug(store_slug);
        if (storeId) {
          const storeSettings = await getStoreSettings(storeId);
          if (storeSettings) {
            // Set tax amount if > 0, otherwise set to 0
            const taxRate = storeSettings.tax_rate ?? 0;
            setTaxAmount(taxRate > 0 ? taxRate : 0);

            // Set min order amount
            const minAmount = storeSettings.min_order_amount ?? 0;
            setMinOrderAmount(minAmount);

            setStoreCurrency(storeSettings.currency ?? "BDT");
          } else {
            setTaxAmount(0);
            setMinOrderAmount(0);
          }
        } else {
          setTaxAmount(0);
          setMinOrderAmount(0);
        }
      } catch (error) {
        console.error("❌ Error fetching store settings:", error);
        setTaxAmount(0);
        setMinOrderAmount(0);
      } finally {
        setTaxLoaded(true);
      }
    };

    if (store_slug && !taxLoaded) {
      fetchStoreSettings();
    }
  }, [store_slug, taxLoaded]);

  // Fire InitiateCheckout once when cart data is ready
  const hasTrackedCheckout = useRef(false);
  useEffect(() => {
    if (isMounted && !isLoadingOverall && cartItems.length > 0 && !hasTrackedCheckout.current) {
      hasTrackedCheckout.current = true;
      fbq(FbEvent.INITIATE_CHECKOUT, {
        // Variant ID when present, matching the catalog feed's g:id.
        content_ids: cartItems.map((i) => i.variantId ?? i.productId),
        content_type: "product",
        num_items: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        value: calculations.subtotal,
        currency: storeCurrency,
      }, store_slug);
    }
  }, [isMounted, isLoadingOverall, cartItems, calculations.subtotal, storeCurrency, store_slug]);

  // Check minimum order amount - WITHOUT NOTIFICATION
  useEffect(() => {
    if (isMounted && minOrderAmount > 0 && calculations.subtotal < minOrderAmount && !isLoadingOverall) {
      // Only set the flag to true, no notification
      minOrderCheckComplete.current = true;
    } else if (isMounted && calculations.subtotal >= minOrderAmount && !isLoadingOverall) {
      minOrderCheckComplete.current = true;
    }
  }, [isMounted, minOrderAmount, calculations.subtotal, isLoadingOverall]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (
      isMounted &&
      cartItems.length === 0 &&
      !isLoadingOverall &&
      !showInvoice &&
      hasAttemptedCheckout.current
    ) {
      const redirectTimer = setTimeout(() => {
        router.push(`/${store_slug}/order-status`);
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [
    isMounted,
    cartItems.length,
    store_slug,
    router,
    isLoadingOverall,
    showInvoice,
  ]);

  // Only process orders after checkout form submission, not on initial page load
  const hasAttemptedCheckout = useRef(false);

  const displayCurrency = currencyLoading ? "" : (currency ?? "");
  const displayCurrencyIconSafe = displayCurrency || "BDT";

  // Shipping change handler
  const handleShippingChange = useCallback(
    (shippingMethod: string, fee: number) => {
      setSelectedShipping(shippingMethod);
      setShippingFee(fee);
    },
    [],
  );

  // Coupon apply/remove — this is only a live preview; the discount is
  // always (re)computed server-side again in createCustomerOrder right
  // before the order commits, so a stale/raced preview here can never
  // overcharge or undercharge the actual order.
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponValidating(true);
    try {
      const storeId = await getStoreIdBySlug(store_slug);
      if (!storeId) throw new Error("Store not found");
      const result = await validateCoupon(couponCode, storeId, calculations.subtotal);
      setAppliedCoupon(result);
      if (!result.valid) {
        notify.error(result.error || "Invalid coupon code");
      }
    } catch (error: any) {
      setAppliedCoupon({ valid: false, discountAmount: 0, error: error.message });
      notify.error(error.message || "Could not apply coupon");
    } finally {
      setCouponValidating(false);
    }
  }, [couponCode, calculations.subtotal, store_slug, notify]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponCode("");
    setAppliedCoupon(null);
  }, []);

  // Create temp order data for invoice
  const createTempOrderData = useCallback(
    (
      values: CustomerCheckoutFormValues,
      customerId: string | undefined,
      result: any,
    ): StoreOrder => {
      const orderItems: OrderItem[] = cartItems.map((item) => ({
        id: `temp-item-${Date.now()}-${item.productId}`,
        product_id: item.productId,
        variant_id: item.variantId || null,
        quantity: item.quantity,
        unit_price: item.displayPrice,
        total_price: item.displayPrice * item.quantity,
        product_name: item.productName,
        variant_details: item.variant || null,
        products: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              product_images: item.product.product_images || [],
            }
          : undefined,
        product_variants: item.variant
          ? {
              id: item.variant.id,
              product_images: item.variant.product_images || [],
            }
          : undefined,
      }));

      const orderId = result.orderId || `order-${Date.now()}`;
      const orderNumber =
        result.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

      const shippingAddress = {
        customer_name: values.name,
        phone: values.phone,
        address: values.shippingAddress,
        address_line_1: values.shippingAddress,
        city: values.city,
        country: values.country,
      };

      const billingAddress = {
        customer_name: values.name,
        phone: values.phone,
        address: values.shippingAddress,
        address_line_1: values.shippingAddress,
        city: values.city,
        country: values.country,
      };

      const discountAmount = appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;
      const totalWithTax =
        calculations.totalPrice - discountAmount + shippingFee + taxAmount;

      // Email is always empty for guest checkout
      const customerEmail = "";

      return {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId || "temp-customer",
        store_id: invoiceStoreData?.id || "temp-store-id",
        status: OrderStatus.PENDING,
        subtotal: calculations.subtotal,
        tax_amount: taxAmount > 0 ? taxAmount : 0,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon?.valid ? couponCode.toUpperCase() : null,
        shipping_fee: shippingFee,
        total_amount: totalWithTax,
        currency: displayCurrencyIconSafe,
        payment_status: PaymentStatus.PENDING,
        payment_method: "cod",
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        order_items: orderItems,
        customers: {
          id: customerId || "temp-customer",
          first_name: values.name.split(" ")[0] || values.name,
          email: customerEmail,
          phone: values.phone,
        },
        stores: invoiceStoreData
          ? {
              id: invoiceStoreData.id,
              store_name: invoiceStoreData.store_name,
              store_slug: invoiceStoreData.store_slug,
              business_address: invoiceStoreData.business_address,
              contact_phone: invoiceStoreData.contact_phone,
              contact_email: invoiceStoreData.contact_email,
            }
          : {
              id: "temp-store",
              store_name: store_slug,
              store_slug: store_slug,
              business_address: "Business address not available",
              contact_phone: "Phone not available",
              contact_email: "Email not available",
            },
        delivery_option: selectedShipping as any,
      };
    },
    [
      cartItems,
      calculations.totalPrice,
      calculations.subtotal,
      shippingFee,
      taxAmount,
      invoiceStoreData,
      displayCurrencyIconSafe,
      store_slug,
      selectedShipping,
      appliedCoupon,
      couponCode,
    ],
  );

  // Helper function to get store ID
  const getStoreId = useCallback(
    async (storeSlug: string): Promise<string | null> => {
      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .eq("store_slug", storeSlug)
        .single();

      if (error) {
        console.error("Error getting store ID:", error);
        return null;
      }
      return data.id;
    },
    [],
  );

  // Find customer by phone only
  const findCustomerByPhone = useCallback(
    async (phone: string, storeSlug: string) => {
      return await getCustomerByPhone(phone, storeSlug);
    },
    [],
  );

  // ✅ SIMPLIFIED: Main checkout handler - PHONE-ONLY, NO ACCOUNT CREATION
  const handleCheckoutSubmit = useCallback(
    async (values: CustomerCheckoutFormValues) => {
      if (cartItems.length === 0) return notify.error(t.checkout.cartEmptyError);
      if (!selectedShipping)
        return notify.error(t.checkout.selectShippingError);

      // Check minimum order amount WITHOUT NOTIFICATION - just validation
      if (minOrderAmount > 0 && calculations.subtotal < minOrderAmount) {
        const shortfall = minOrderAmount - calculations.subtotal;
        return notify.error(
          `${t.checkout.minOrderWarningPrefix} ${currency || "৳"}${minOrderAmount.toFixed(2)}. ${t.checkout.addMoreToProceed} ${currency || "৳"}${shortfall.toFixed(2)} ${t.checkout.moreToProceedError}`
        );
      }

      setIsProcessing(true);
      clearAccountCreationFlags();

      try {
        const formDataWithShipping = {
          ...values,
          email: "", // Always empty for simple checkout
          password: "", // Always empty for simple checkout
          shippingMethod: selectedShipping,
          shippingFee,
          taxAmount,
        };

        let storeCustomerId: string = "";
        const storeId = await getStoreId(store_slug);
        if (!storeId) throw new Error("Store not found");

        // 🔐 LOGGED IN USER FLOW (still supports logged-in users)
        if (isUserLoggedIn && session?.user) {
          // For logged-in users, the auth_user_id link is the authoritative
          // "this is me" check — their store_customers row may already exist
          // (e.g. created at signup with no phone set), so check that first
          // before falling back to phone match / creating a new row.
          const existing =
            (await getCustomerByAuthUserId(session.user.id, store_slug)) ||
            (await findCustomerByPhone(values.phone, store_slug));

          if (existing) {
            storeCustomerId = existing.id;

            if (existing.profile_id) {
              await updateCheckoutCustomerProfile(existing.profile_id, values);
            } else {
              await createCheckoutCustomerProfile(existing.id, storeId, values);
            }
          } else {
            // Create new customer for logged-in user
            const newCustomer = await createCustomer({
              store_id: storeId,
              first_name: values.name,
              email: session.user.email ?? undefined,
              phone: values.phone,
              auth_user_id: session.user.id,
              address_line_1: values.shippingAddress,
              city: values.city,
              postal_code: values.postCode,
              country: values.country,
            });

            storeCustomerId = newCustomer.id;
          }
        } else {
          // 🧑‍🧾 GUEST / NON-LOGGED USER (SIMPLE PHONE-ONLY CHECKOUT)
          const existing = await findCustomerByPhone(values.phone, store_slug);

          if (existing) {
            storeCustomerId = existing.id;

            if (existing.profile_id) {
              await updateCheckoutCustomerProfile(existing.profile_id, values);
            } else {
              await createCheckoutCustomerProfile(existing.id, storeId, values);
            }

            // DO NOT show notification about account creation
            // User will see order success message instead
          } else {
            // Guest checkout without account
            const newCustomer = await createCustomer({
              store_id: storeId,
              first_name: values.name,
              phone: values.phone,
              address_line_1: values.shippingAddress,
              city: values.city,
              postal_code: values.postCode,
              country: values.country,
            });

            storeCustomerId = newCustomer.id;
          }
        }

        if (!storeCustomerId) {
          return notify.error(t.checkout.failedCreateCustomer);
        }

        fbq(FbEvent.ADD_PAYMENT_INFO, {
          content_ids: cartItems.map((i) => i.variantId ?? i.productId),
          content_type: "product",
          value: calculations.totalPrice + shippingFee + taxAmount,
          currency: storeCurrency,
        }, store_slug, { phone: values.phone });

        const result = await processOrder(
          formDataWithShipping,
          storeCustomerId,
          "cod",
          selectedShipping,
          shippingFee,
          cartItems,
          calculations,
          taxAmount,
          appliedCoupon?.valid ? couponCode : undefined,
          appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
        );

        if (!result.success) {
          return notify.error(result.error || t.checkout.failedPlaceOrder);
        }

        // High-risk phone numbers have their Purchase event held (not fired
        // here) until the order is confirmed delivered — see updateOrder.ts.
        if (result.fbPurchaseEventStatus !== "held") {
          fbq(FbEvent.PURCHASE, {
            // Variant ID when present, matching the catalog feed's g:id.
            content_ids: cartItems.map((i) => i.variantId ?? i.productId),
            // Per-item breakdown so the pixel-analytics "Top Products" table
            // can attribute revenue per product — a single order can contain
            // several different products, so the flat content_name/value
            // fields don't say which product the money belongs to.
            contents: cartItems.map((i) => ({
              id: i.variantId ?? i.productId,
              name: i.productName,
              quantity: i.quantity,
              item_price: i.displayPrice,
            })),
            content_type: "product",
            num_items: cartItems.reduce((sum, i) => sum + i.quantity, 0),
            value: calculations.totalPrice + shippingFee + taxAmount,
            currency: storeCurrency,
            order_id: result.orderNumber,
          }, store_slug, { phone: values.phone });
        }

        setInvoiceData(createTempOrderData(values, storeCustomerId, result));
        setShowInvoice(true);
        hasAttemptedCheckout.current = true;

        // Success message - show only once
        if (isUserLoggedIn) {
          notify.success(t.checkout.orderPlacedSuccess);
        } else {
          notify.success(t.checkout.orderPlacedSuccess);

          // Show tracking information - only once
          setTimeout(() => {
            notify.info(
              `${t.checkout.trackOrderHintPrefix} ${values.phone} ${t.checkout.trackOrderHintSuffix}`,
              { duration: 5000 },
            );
          }, 1000);
        }

        // Clear cart after successful order
        setTimeout(() => clearStoreCart(store_slug), 3000);
      } catch (error: any) {
        console.error("❌ Checkout error:", error);
        notify.error(error.message || t.checkout.unexpectedError);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      cartItems,
      selectedShipping,
      shippingFee,
      taxAmount,
      minOrderAmount,
      currency,
      storeCurrency,
      notify,
      clearAccountCreationFlags,
      isUserLoggedIn,
      store_slug,
      session,
      getStoreId,
      processOrder,
      calculations,
      createTempOrderData,
      clearStoreCart,
      findCustomerByPhone,
      t,
      appliedCoupon,
      couponCode,
    ],
  );

  // Store loading check
  if (isLoadingOverall) {
    return <StoreLoadingSkeleton />;
  }

  // Store not found
  if (storeError || !invoiceStoreData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t.checkout.storeNotFound}</h1>
          <p>{t.checkout.storeNotFoundDesc}</p>
        </div>
      </div>
    );
  }

  // Cart is empty and checkout was never attempted (e.g. the user hit
  // "Clear Cart" on this page) — show a real empty state with a way back
  // to shopping, not the post-order skeleton below. That skeleton has no
  // exit of its own; it only ever resolves via the redirect effect above,
  // which is gated behind hasAttemptedCheckout — without this check first,
  // a manually-cleared cart got stuck on it forever.
  if (cartItems.length === 0 && !isLoadingOverall && !showInvoice && !hasAttemptedCheckout.current) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">{t.cart.cartEmpty}</p>
          <p className="text-sm text-muted-foreground mt-2">{t.cart.addProductsPrompt}</p>
          <button
            onClick={() => router.push(`/${store_slug}/shop`)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-stone-900 dark:bg-white text-white dark:text-gray-900 hover:bg-stone-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200"
          >
            {t.cart.continueShoppingAt} {store_slug}
          </button>
        </div>
      </div>
    );
  }

  // Order complete — cart was cleared right after a successful checkout;
  // this briefly bridges to the redirect effect above before it fires.
  if (cartItems.length === 0 && !isLoadingOverall && !showInvoice) {
    return <OrderCompleteSkeleton />;
  }

  return (
    <>
      <UnifiedCheckoutLayout
        storeSlug={store_slug}
        cartItems={cartItems}
        calculations={calculations}
        loading={isLoadingOverall}
        error={cartError}
        onCheckout={handleCheckoutSubmit}
        onShippingChange={handleShippingChange}
        selectedShipping={selectedShipping}
        shippingFee={shippingFee}
        taxAmount={taxAmount}
        minOrderAmount={minOrderAmount}
        isProcessing={isSubmitting}
        mode="checkout"
        couponCode={couponCode}
        onCouponCodeChange={setCouponCode}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        appliedCoupon={appliedCoupon}
        couponValidating={couponValidating}
      />

      <AnimatePresence>
        {showInvoice && invoiceData && (
          <AnimatedInvoice
            isOpen={showInvoice}
            onClose={() => {
              setShowInvoice(false);
              setTimeout(() => {
                clearAccountCreationFlags();
                clearFormData();
              }, 1000);
              router.push(`/${store_slug}/order-status`);
            }}
            orderData={invoiceData}
            showCloseButton={true}
          />
        )}
      </AnimatePresence>
    </>
  );
}