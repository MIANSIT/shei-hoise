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
      address_line_1: values.shippingAddress,
      city: values.city,
      country: values.country,
    };

    const billingAddress = {
      customer_name: values.name,
      phone: values.phone,
      address_line_1: values.shippingAddress,
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

  // ✅ UPDATED: Simplified checkout flow for guest users
  // In your checkout page - Update the handleCheckoutSubmit function
  const handleCheckoutSubmit = async (values: any) => {
    console.log("🔄 Checkout form submitted with values:", {
      ...values,
      password: values.password ? "***" : "not-provided",
      isUserLoggedIn,
      cartItemsCount: cartItems.length,
      selectedShipping,
      shippingFee,
    });

    // ✅ Early validation
    if (cartItems.length === 0) {
      notify.error("Your cart is empty");
      return;
    }

    if (!selectedShipping) {
      notify.error("Please select a shipping method");
      return;
    }

    setIsProcessing(true);

    try {
      // Add shipping information to form data
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee: shippingFee,
      };

      let storeCustomerId: string | undefined; // ✅ Now store customer ID, not auth user ID

      // ✅ Scenario 1 - User is already logged in
      if (isUserLoggedIn && currentUser) {
        console.log(
          "✅ User is logged in, finding their store customer record"
        );

        // Find the store_customer record for this auth user
        const { data: storeCustomer, error: storeCustomerError } =
          await supabase
            .from("store_customers")
            .select("id")
            .eq("auth_user_id", currentUser.id)
            .maybeSingle();

        if (storeCustomerError) {
          console.error("❌ Error finding store customer:", storeCustomerError);
        } else if (storeCustomer) {
          storeCustomerId = storeCustomer.id;
          console.log("✅ Found store customer record:", storeCustomerId);
        } else {
          console.log("⚠️ No store customer record found for auth user");
        }
      }

      // ✅ Scenario 2 - User is NOT logged in (GUEST or EXISTING CUSTOMER)
      if (!isUserLoggedIn) {
        console.log(
          "🔄 User is not logged in, handling guest/existing customer order"
        );

        // First, check if customer already exists in store_customers
        const existingCustomer = await getCustomerByEmail(values.email);

        if (existingCustomer) {
          console.log("📧 Existing customer found:", {
            id: existingCustomer.id,
            auth_user_id: existingCustomer.auth_user_id,
            profile_id: existingCustomer.profile_id,
          });

          storeCustomerId = existingCustomer.id; // ✅ Use store_customer.id directly

          // ✅ Update the existing user profile with new address information
          if (existingCustomer.profile_id) {
            console.log("📝 Updating existing user profile with new address");
            const { error: profileUpdateError } = await supabase
              .from("user_profiles")
              .update({
                address_line_1: values.shippingAddress,
                city: values.city,
                postal_code: values.postCode,
                country: values.country,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingCustomer.profile_id);

            if (profileUpdateError) {
              console.error("❌ Profile update failed:", profileUpdateError);
            } else {
              console.log("✅ User profile updated with new address");
            }
          }

          // ✅ If customer exists but no auth account AND password is provided, upgrade to auth account
          if (
            !existingCustomer.auth_user_id &&
            values.password &&
            values.password.length > 0
          ) {
            console.log("🔐 Creating auth account for existing customer");
            const { data: authData, error: authError } =
              await supabase.auth.signUp({
                email: values.email.toLowerCase(),
                password: values.password,
                options: {
                  data: {
                    first_name: values.name.split(" ")[0] || values.name,
                    last_name: values.name.split(" ").slice(1).join(" ") || "",
                    phone: values.phone,
                  },
                },
              });

            if (authError) {
              console.error("❌ Auth account creation failed:", authError);
              // Continue as guest - don't fail the order
            } else if (authData.user) {
              console.log(
                "✅ Auth account created for existing customer:",
                authData.user.id
              );

              // ✅ Update store_customer with auth_user_id
              await supabase
                .from("store_customers")
                .update({
                  auth_user_id: authData.user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingCustomer.id);

              console.log("✅ Store customer updated with auth_user_id");
            }
          }
        } else {
          // ✅ Scenario 3 - Create NEW customer (guest or with password)
          console.log("👤 Creating new customer");
          const customerResult = await createCheckoutCustomer({
            ...values,
            store_slug,
          });

          if (customerResult.success) {
            console.log("✅ Customer created successfully:", {
              customerId: customerResult.customerId, // This is store_customer.id
              authUserId: customerResult.authUserId,
              profileId: customerResult.profileId,
            });

            storeCustomerId = customerResult.customerId; // ✅ Use store_customer.id
          } else {
            console.error("❌ Customer creation failed:", customerResult.error);
            notify.error(
              customerResult.error ||
                "Failed to create customer. Please try again."
            );
            return;
          }
        }
      }

      // ✅ Process the order (storeCustomerId is from store_customers table)
      console.log("📦 Processing order with store customer ID:", {
        storeCustomerId,
        type: storeCustomerId ? "has_customer" : "guest",
      });

      const result = await processOrder(
        formDataWithShipping,
        storeCustomerId, // ✅ This will be store_customers.id or undefined for pure guests
        "cod",
        selectedShipping,
        shippingFee,
        cartItems,
        calculations
      );

      if (result.success) {
        console.log("✅ Order processed successfully, showing invoice");
        const tempOrderData = createTempOrderData(
          values,
          storeCustomerId,
          result
        );
        setInvoiceData(tempOrderData);
        setShowInvoice(true);

        if (values.password && values.password.length > 0) {
          notify.success(
            "Congratulations! Your account has been created and order placed successfully."
          );
        } else {
          notify.success(
            "Congratulations! Your order has been placed successfully."
          );
        }

        setTimeout(() => {
          clearStoreCart(store_slug);
          // clearFormData();
        }, 3000);
      } else {
        notify.error(
          result.error || "Failed to place order. Please try again."
        );
      }
    } catch (error: any) {
      console.error("❌ Checkout process error:", error);
      notify.error(
        error.message || "An unexpected error occurred. Please try again."
      );
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
        isProcessing={isSubmitting}
        mode="checkout"
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
