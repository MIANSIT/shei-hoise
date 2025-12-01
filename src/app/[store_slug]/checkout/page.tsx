/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/checkout/page.tsx
"use client";

import { useState, useEffect } from "react";
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
import { getCustomerByEmail } from "@/lib/queries/customers/getCustomerByEmail";
import { createCheckoutCustomer } from "@/lib/queries/customers/createCheckoutCustomer";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { AnimatePresence } from "framer-motion";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";

export default function CheckoutPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<StoreOrder | null>(null);

  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;

  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();
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
  const { user: currentUser, loading: userLoading } = useCurrentUser();

  const isUserLoggedIn = Boolean(session && currentUser);
  const isSubmitting = isProcessing || orderLoading;
  const isLoadingOverall =
    cartLoading || authLoading || userLoading || storeLoading;

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

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  // Create temporary order data for invoice
  const createTempOrderData = (
    values: any,
    customerId: string | undefined,
    result: any
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
      address: values.shippingAddress, // ✅ NEW address field
      address_line_1: values.shippingAddress, // ✅ KEEP for backward compatibility
      city: values.city,
      country: values.country,
    };

    const billingAddress = {
      customer_name: values.name,
      phone: values.phone,
      address: values.shippingAddress, // ✅ NEW address field
      address_line_1: values.shippingAddress, // ✅ KEEP for backward compatibility
      city: values.city,
      country: values.country,
    };

    return {
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId || "temp-customer",
      store_id: invoiceStoreData?.id || "temp-store-id",
      status: "pending",
      subtotal: calculations.subtotal,
      tax_amount: 0,
      shipping_fee: shippingFee,
      total_amount: calculations.totalPrice + shippingFee,
      currency: "BDT",
      payment_status: "pending",
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
        email: values.email,
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
  };

  const updateCustomerProfile = async (
    profileId: string,
    values: CustomerCheckoutFormValues
  ) => {
    return supabase
      .from("customer_profiles")
      .update({
        address: values.shippingAddress,
        city: values.city,
        postal_code: values.postCode,
        country: values.country,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
  };

  const createCustomerProfile = async (
    storeCustomerId: string,
    values: CustomerCheckoutFormValues
  ) => {
    const profileData = {
      store_customer_id: storeCustomerId,
      address: values.shippingAddress,
      city: values.city,
      postal_code: values.postCode,
      country: values.country,
    };

    return supabase
      .from("customer_profiles")
      .insert([profileData])
      .select("id")
      .single();
  };

  const upgradeGuestToAuth = async (values: CustomerCheckoutFormValues) => {
    return supabase.auth.signUp({
      email: values.email.toLowerCase(),
      password: values.password!,
      options: {
        data: {
          first_name: values.name.split(" ")[0] || values.name,
          last_name: values.name.split(" ").slice(1).join(" ") || "",
          phone: values.phone,
        },
      },
    });
  };

  const handleCheckoutSubmit = async (values: CustomerCheckoutFormValues) => {
    console.log("🔄 Checkout submit:", {
      ...values,
      password: values.password ? "***" : "not-provided",
      isUserLoggedIn,
      cartItemsCount: cartItems.length,
      selectedShipping,
      shippingFee,
    });

    if (cartItems.length === 0) return notify.error("Your cart is empty");
    if (!selectedShipping)
      return notify.error("Please select a shipping method");

    setIsProcessing(true);

    try {
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee,
      };

      let storeCustomerId: string | undefined;

      // ------------------------
      //  🔐 LOGGED IN USERFLOW
      // ------------------------
      if (isUserLoggedIn && currentUser) {
        const { data: storeCustomer, error } = await supabase
          .from("store_customers")
          .select("id, profile_id")
          .eq("auth_user_id", currentUser.id)
          .maybeSingle();

        if (error) console.error("❌ store_customer lookup failed", error);

        if (storeCustomer) {
          storeCustomerId = storeCustomer.id;

          if (storeCustomer.profile_id) {
            await updateCustomerProfile(storeCustomer.profile_id, values);
            console.log("📝 Updated profile for logged-in user");
          }
        }
      }

      // ------------------------
      // 🧑‍🧾 GUEST / NON-LOGGED USER
      // ------------------------
      if (!isUserLoggedIn) {
        const existing = await getCustomerByEmail(values.email, store_slug);

        if (existing) {
          storeCustomerId = existing.id;

          // 🔄 Update or create profile
          if (existing.profile_id) {
            await updateCustomerProfile(existing.profile_id, values);
          } else {
            const { data: newProfile } = await createCustomerProfile(
              existing.id,
              values
            );
            if (newProfile?.id) {
              await supabase
                .from("store_customers")
                .update({ profile_id: newProfile.id })
                .eq("id", existing.id);
            }
          }

          // 🔐 Upgrade guest → auth
          if (!existing.auth_user_id && values.password) {
            const { data: authData, error: authError } =
              await upgradeGuestToAuth(values);

            if (!authError && authData.user) {
              await supabase
                .from("store_customers")
                .update({
                  auth_user_id: authData.user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            }
          }
        } else {
          // 🆕 Create brand new customer
          const customerResult = await createCheckoutCustomer({
            ...values,
            store_slug,
          });

          if (!customerResult.success) {
            return notify.error(
              customerResult.error || "Failed to create customer"
            );
          }

          storeCustomerId = customerResult.customerId;
        }
      }

      // ------------------------
      // 📦 PROCESS ORDER
      // ------------------------
      const result = await processOrder(
        formDataWithShipping,
        storeCustomerId,
        "cod",
        selectedShipping,
        shippingFee,
        cartItems,
        calculations
      );

      if (!result.success) {
        return notify.error(result.error || "Failed to place order");
      }

      // Show invoice
      setInvoiceData(createTempOrderData(values, storeCustomerId, result));
      setShowInvoice(true);

      notify.success(
        values.password
          ? "Congratulations! Your account has been created and your order placed."
          : "Order placed successfully!"
      );

      setTimeout(() => clearStoreCart(store_slug), 3000);
    } catch (error: any) {
      console.error("❌ Checkout error:", error);
      notify.error(error.message || "Unexpected error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Store loading check
  if (isLoadingOverall) {
    return <StoreLoadingSkeleton />;
  }

  // Store not found
  if (storeError || !invoiceStoreData) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4'>Store Not Found</h1>
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
        isProcessing={isSubmitting}
        mode='checkout'
      />

      <AnimatePresence>
        {showInvoice && invoiceData && (
          <AnimatedInvoice
            isOpen={showInvoice}
            onClose={() => {
              setShowInvoice(false);
              router.push(`/${store_slug}/order-status`);
            }}
            orderData={invoiceData}
            showCloseButton={true}
            autoShow={true}
          />
        )}
      </AnimatePresence>
    </>
  );
}
