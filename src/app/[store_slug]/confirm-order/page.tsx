/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/confirm-order/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import UnifiedCheckoutLayout from "../../components/products/checkout/UnifiedCheckoutLayout";
import { useUnifiedCartData } from "@/lib/hook/useUnifiedCartData";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { supabase } from "@/lib/supabase";
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
  
  const { cartItems, calculations, loading, error: cartError } = useUnifiedCartData({
    storeSlug: store_slug,
    compressedData,
    useZustand: false,
  });

  // Order process hook
  const {
    processOrder,
    loading: orderLoading,
    error: orderError,
  } = useOrderProcess(store_slug);

  // User auth hooks
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const { session, loading: authLoading } = useSupabaseAuth();

  const isUserLoggedIn = Boolean(currentUser && session);
  const isLoadingAuth = authLoading || userLoading;
  const isSubmitting = isProcessing || isCreatingAccount || orderLoading;

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  // ✅ FIX: Simplified confirm order flow
  const handleCheckoutSubmit = async (values: any) => {
    console.log("🔄 Confirm order form submitted");

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
          setTimeout(() => router.push(`/${store_slug}/order-status`), 2000);
        } else {
          notify.error(result.error || "Failed to place order");
        }
        return;
      }

      // ✅ FIX: Scenario 2 - User is NOT logged in
      console.log("🔄 User is not logged in, handling account and order");

      // Check if user exists
      const existingCustomer = await getCustomerByEmail(values.email);
      
      if (existingCustomer) {
        console.log("📧 Customer exists, attempting login");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) {
          notify.error("The password you entered is incorrect. Please try again.");
          return;
        }

        console.log("✅ Login successful");
        customerId = signInData.user.id;

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
          setTimeout(() => router.push(`/${store_slug}/order-status`), 2000);
        } else {
          notify.error(result.error || "Failed to place order");
        }
        return;
      }

      // ✅ FIX: Scenario 3 - Create new account
      console.log("👤 Creating new customer account");
      setIsCreatingAccount(true);

      const customerData = {
        ...values,
        store_slug,
      };

      const customerResult = await createCheckoutCustomer(customerData);
      console.log("✅ Customer created successfully");

      // Auto-login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        throw new Error(`Account created but login failed: ${signInError.message}`);
      }

      console.log("✅ New customer auto-logged in");
      customerId = signInData.user?.id;

      if (!customerId) {
        throw new Error("Failed to get customer ID after login");
      }

      // Process order
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
        setTimeout(() => router.push(`/${store_slug}/order-status`), 2000);
      } else {
        notify.error(orderResult.error || "Failed to place order");
      }

    } catch (error: any) {
      console.error("❌ Confirm order error:", error);
      notify.error(error.message || "Failed to process order. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsCreatingAccount(false);
    }
  };

  return (
    <UnifiedCheckoutLayout
      storeSlug={store_slug}
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