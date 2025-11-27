/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/confirm-order/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import UnifiedCheckoutLayout from "../../components/products/checkout/UnifiedCheckoutLayout";
import { useUnifiedCartData } from "@/lib/hook/useUnifiedCartData";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { getCustomerByEmail } from "@/lib/queries/customers/getCustomerByEmail";
import { createCheckoutCustomer } from "@/lib/queries/customers/createCheckoutCustomer";

export default function ConfirmOrderPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const compressedData = searchParams.get("o");
  const store_slug = params.store_slug as string;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  
  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();
  
  // Validate store_slug before using it
  const validatedStoreSlug = store_slug && store_slug !== "undefined" ? store_slug : "";

  const { cartItems, calculations, loading, error: cartError } = useUnifiedCartData({
    storeSlug: validatedStoreSlug,
    compressedData,
    useZustand: false,
  });

  // Order process hook - pass validated store slug
  const {
    processOrder,
    loading: orderLoading,
    error: orderError,
  } = useOrderProcess(validatedStoreSlug);

  // User auth hooks
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const { session, loading: authLoading } = useSupabaseAuth();

  const isUserLoggedIn = Boolean(currentUser && session);
  const isLoadingAuth = authLoading || userLoading;
  const isSubmitting = isProcessing || isCreatingAccount || orderLoading;

  // Add validation effect
  useEffect(() => {
    if (!validatedStoreSlug) {
      console.error("❌ Invalid store slug:", store_slug);
      notify.error("Invalid store URL. Please check the store link.");
      router.push("/");
    }
  }, [validatedStoreSlug, store_slug, notify, router]);

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  const handleCheckoutSubmit = async (values: any) => {
    console.log("🔄 Confirm order form submitted");

    // Validate store slug again
    if (!validatedStoreSlug) {
      notify.error("Invalid store. Please try again.");
      return;
    }

    if (cartItems.length === 0) {
      notify.error("No order items found");
      return;
    }

    if (!selectedShipping) {
      notify.error("Please select a shipping method");
      return;
    }

    setIsProcessing(true);

    try {
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee: shippingFee,
      };

      let customerId: string | undefined = currentUser?.id;

      // ✅ FIX: Scenario 1 - User is already logged in
      if (isUserLoggedIn && currentUser) {
        console.log("✅ User is logged in, processing order directly");
        
        const result = await processOrder(
          formDataWithShipping,
          customerId,
          "cod",
          selectedShipping,
          shippingFee,
          cartItems,
          calculations
        );

        if (result.success) {
          notify.success("Order placed successfully!");
          clearFormData();
          setTimeout(() => router.push(`/${validatedStoreSlug}/order-status`), 2000);
        } else {
          notify.error(result.error || "Failed to place order");
        }
        return;
      }

      // ✅ FIX: Scenario 2 - User is NOT logged in
      console.log("🔄 User is not logged in, handling account and order");

      // Check if customer exists in store_customers
      const existingCustomer = await getCustomerByEmail(values.email);
      
      if (existingCustomer) {
        console.log("📧 Customer exists in store_customers:", existingCustomer.id);
        customerId = existingCustomer.id;

        const result = await processOrder(
          formDataWithShipping,
          customerId,
          "cod",
          selectedShipping,
          shippingFee,
          cartItems,
          calculations
        );

        if (result.success) {
          notify.success("Order placed successfully!");
          clearFormData();
          setTimeout(() => router.push(`/${validatedStoreSlug}/order-status`), 2000);
        } else {
          notify.error(result.error || "Failed to place order");
        }
        return;
      }

      // ✅ FIX: Scenario 3 - Create new customer WITHOUT auto-login
      console.log("👤 Creating new customer account without auto-login");
      setIsCreatingAccount(true);

      const customerData = {
        ...values,
        store_slug: validatedStoreSlug,
      };

      const customerResult = await createCheckoutCustomer(customerData);
      
      if (customerResult.success) {
        console.log("✅ Customer created successfully:", customerResult.customerId);
        customerId = customerResult.customerId;

        // Process order with the new customer ID
        const orderResult = await processOrder(
          formDataWithShipping,
          customerId,
          "cod",
          selectedShipping,
          shippingFee,
          cartItems,
          calculations
        );

        if (orderResult.success) {
          notify.success("Account created and order placed successfully!");
          clearFormData();
          setTimeout(() => router.push(`/${validatedStoreSlug}/order-status`), 2000);
        } else {
          notify.error(orderResult.error || "Failed to place order");
        }
      } else {
        throw new Error(customerResult.error || "Failed to create customer account");
      }

    } catch (error: any) {
      console.error("❌ Confirm order error:", error);
      notify.error(error.message || "Failed to process order. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsCreatingAccount(false);
    }
  };

  // Don't render if store slug is invalid
  if (!validatedStoreSlug) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Store</h1>
          <p className="text-gray-600 mt-2">The store URL is invalid. Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedCheckoutLayout
      storeSlug={validatedStoreSlug}
      cartItems={cartItems}
      calculations={calculations}
      loading={loading}
      error={cartError}
      onCheckout={handleCheckoutSubmit}
      onShippingChange={handleShippingChange}
      selectedShipping={selectedShipping}
      shippingFee={shippingFee}
      isProcessing={isSubmitting}
      mode="confirm"
    />
  );
}