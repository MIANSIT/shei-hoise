/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/checkout/page.tsx - SIMPLIFIED PHONE-ONLY CHECKOUT
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { AnimatePresence } from "framer-motion";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

export default function CheckoutPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<StoreOrder | null>(null);
  const [taxLoaded, setTaxLoaded] = useState(false);
  const { currency, loading: currencyLoading } = useUserCurrencyIcon();
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;

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

  const {
    processOrder,
    loading: orderLoading,
    error: orderError,
  } = useOrderProcess(store_slug);

  const { session, loading: authLoading } = useSupabaseAuth();

  // Memoize user login state
  const isUserLoggedIn = useMemo(() => {
    return Boolean(session?.user);
  }, [session]);

  const isSubmitting = isProcessing || orderLoading;
  const isLoadingOverall = useMemo(() => {
    return cartLoading || authLoading || storeLoading || taxLoaded === false;
  }, [cartLoading, authLoading, storeLoading, taxLoaded]);

  // Fetch tax amount once
  useEffect(() => {
    const fetchTaxAmount = async () => {
      try {
        const storeId = await getStoreIdBySlug(store_slug);
        if (storeId) {
          const storeSettings = await getStoreSettings(storeId);
          setTaxAmount(storeSettings?.tax_rate ?? 0);
        } else {
          setTaxAmount(0);
        }
      } catch (error) {
        console.error("❌ Error fetching tax amount:", error);
        setTaxAmount(0);
      } finally {
        setTaxLoaded(true);
      }
    };

    if (store_slug && !taxLoaded) {
      fetchTaxAmount();
    }
  }, [store_slug, taxLoaded]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (
      isMounted &&
      cartItems.length === 0 &&
      !isLoadingOverall &&
      !showInvoice
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

      const totalWithTax = calculations.totalPrice + shippingFee + taxAmount;

      // Email is always empty for guest checkout
      const customerEmail = "";

      return {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId || "temp-customer",
        store_id: invoiceStoreData?.id || "temp-store-id",
        status: OrderStatus.PENDING,
        subtotal: calculations.subtotal,
        tax_amount: taxAmount,
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
      calculations,
      shippingFee,
      taxAmount,
      invoiceStoreData,
      store_slug,
      selectedShipping,
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

  // Create customer profile and store links
  const createProfileAndLinks = useCallback(
    async (
      customerId: string,
      storeId: string,
      values: CustomerCheckoutFormValues,
    ) => {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .insert({
          store_customer_id: customerId,
          address: values.shippingAddress,
          city: values.city,
          postal_code: values.postCode || "",
          country: values.country,
        })
        .select("id")
        .single();

      if (profile) {
        await supabase
          .from("store_customers")
          .update({ profile_id: profile.id })
          .eq("id", customerId);
      }

      await supabase
        .from("store_customer_links")
        .upsert(
          { customer_id: customerId, store_id: storeId },
          { onConflict: "customer_id,store_id" },
        );
    },
    [],
  );

  // Create guest customer (no email, no auth)
  const createGuestCustomer = useCallback(
    async (
      values: CustomerCheckoutFormValues,
      storeSlug: string,
    ): Promise<string> => {
      const storeId = await getStoreId(storeSlug);
      if (!storeId) throw new Error("Store not found");

      // Email is always empty for guest customers
      const { data: customer, error } = await supabase
        .from("store_customers")
        .insert({
          name: values.name,
          email: "", // Empty email for guest
          phone: values.phone,
          auth_user_id: null,
        })
        .select("id")
        .single();

      if (error)
        throw new Error(`Failed to create guest customer: ${error.message}`);

      await createProfileAndLinks(customer.id, storeId, values);
      return customer.id;
    },
    [getStoreId, createProfileAndLinks],
  );

  // Update customer profile
  const updateCustomerProfile = useCallback(
    async (profileId: string, values: CustomerCheckoutFormValues) => {
      return supabase
        .from("customer_profiles")
        .update({
          address: values.shippingAddress,
          city: values.city,
          postal_code: values.postCode || "",
          country: values.country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
    },
    [],
  );

  // Create customer profile
  const createCustomerProfile = useCallback(
    async (storeCustomerId: string, values: CustomerCheckoutFormValues) => {
      const profileData = {
        store_customer_id: storeCustomerId,
        address: values.shippingAddress,
        city: values.city,
        postal_code: values.postCode || "",
        country: values.country,
      };

      return supabase
        .from("customer_profiles")
        .insert([profileData])
        .select("id")
        .single();
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
      if (cartItems.length === 0) return notify.error("Your cart is empty");
      if (!selectedShipping)
        return notify.error("Please select a shipping method");

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

        // 🔐 LOGGED IN USER FLOW (still supports logged-in users)
        if (isUserLoggedIn && session?.user) {
          // For logged-in users, try to find by phone
          const existing = await findCustomerByPhone(values.phone, store_slug);

          if (existing) {
            storeCustomerId = existing.id;

            if (existing.profile_id) {
              await updateCustomerProfile(existing.profile_id, values);
            } else {
              await createCustomerProfile(existing.id, values);
            }
          } else {
            // Create new customer for logged-in user
            const storeId = await getStoreId(store_slug);
            if (!storeId) throw new Error("Store not found");

            const { data: newCustomer, error } = await supabase
              .from("store_customers")
              .insert({
                name: values.name,
                email: session.user.email || "", // Use session email if available
                phone: values.phone,
                auth_user_id: session.user.id,
              })
              .select("id")
              .single();

            if (error)
              throw new Error(`Failed to create customer: ${error.message}`);

            storeCustomerId = newCustomer.id;

            await createProfileAndLinks(storeCustomerId, storeId, values);
          }
        } else {
          // 🧑‍🧾 GUEST / NON-LOGGED USER (SIMPLE PHONE-ONLY CHECKOUT)
          const existing = await findCustomerByPhone(values.phone, store_slug);

          if (existing) {
            storeCustomerId = existing.id;

            if (existing.profile_id) {
              await updateCustomerProfile(existing.profile_id, values);
            } else {
              await createCustomerProfile(existing.id, values);
            }

            // Simple notification - no account creation
            notify.info(
              "Order placed! Use your phone number to track order status.",
            );
          } else {
            // Guest checkout without account
            storeCustomerId = await createGuestCustomer(values, store_slug);
          }
        }

        if (!storeCustomerId) {
          return notify.error(
            "Failed to create customer record. Please try again.",
          );
        }

        const result = await processOrder(
          formDataWithShipping,
          storeCustomerId,
          "cod",
          selectedShipping,
          shippingFee,
          cartItems,
          calculations,
          taxAmount,
        );

        if (!result.success) {
          return notify.error(result.error || "Failed to place order");
        }

        setInvoiceData(createTempOrderData(values, storeCustomerId, result));
        setShowInvoice(true);

        // Success messages
        if (isUserLoggedIn) {
          notify.success("Order placed successfully!");
        } else {
          notify.success("Order placed successfully!");

          // Show tracking information
          setTimeout(() => {
            notify.info(
              `📱 Use phone number ${values.phone} to track your order status`,
              { duration: 5000 },
            );
          }, 1000);
        }

        // Clear cart after successful order
        setTimeout(() => clearStoreCart(store_slug), 3000);
      } catch (error: any) {
        console.error("❌ Checkout error:", error);
        notify.error(error.message || "Unexpected error. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      cartItems,
      selectedShipping,
      shippingFee,
      taxAmount,
      notify,
      clearAccountCreationFlags,
      isUserLoggedIn,
      store_slug,
      session,
      getStoreId,
      updateCustomerProfile,
      createCustomerProfile,
      createProfileAndLinks,
      createGuestCustomer,
      processOrder,
      calculations,
      createTempOrderData,
      clearStoreCart,
      findCustomerByPhone,
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
          <h1 className="text-2xl font-bold mb-4">Store Not Found</h1>
          <p>The store you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  // Order complete
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
        isProcessing={isSubmitting}
        mode="checkout"
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