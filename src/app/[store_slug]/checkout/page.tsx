/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/checkout/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
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

export default function CheckoutPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;
  
  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();
  const { clearStoreCart } = useCartStore();
  
  const { cartItems, calculations, loading: cartLoading, error: cartError } = useUnifiedCartData({
    storeSlug: store_slug,
    useZustand: true,
  });

  // Order process hook
  const {
    processOrder,
    loading: orderLoading,
    error: orderError,
  } = useOrderProcess(store_slug);

  // Get auth state
  const { session, loading: authLoading } = useSupabaseAuth();
  const { user: currentUser, loading: userLoading } = useCurrentUser();

  const isUserLoggedIn = Boolean(session && currentUser);
  const isSubmitting = isProcessing || isCreatingAccount || orderLoading;
  
  // ✅ FIX: Combined loading state
  const isLoadingOverall = isLoading || cartLoading || authLoading || userLoading;

  useEffect(() => {
    setIsMounted(true);

    const checkStoreExists = async () => {
      try {
        setIsLoading(true);
        const storeId = await getStoreIdBySlug(store_slug);
        setStoreExists(!!storeId);
      } catch (error) {
        console.error("Error checking store:", error);
        setStoreExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoreExists();
  }, [store_slug]);

  useEffect(() => {
    if (isMounted && cartItems.length === 0 && !isLoadingOverall) {
      const redirectTimer = setTimeout(() => {
        router.push(`/order-status`);
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isMounted, cartItems.length, store_slug, router, isLoadingOverall]);

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  // ✅ FIX: Simplified and fixed checkout flow
  const handleCheckoutSubmit = async (values: any) => {
    console.log("🔄 Checkout form submitted with values:", {
      ...values,
      password: values.password ? "***" : "not-provided",
      isUserLoggedIn,
      cartItemsCount: cartItems.length,
      selectedShipping,
      shippingFee
    });

    // ✅ FIX: Early validation
    if (cartItems.length === 0) {
      notify.error("Your cart is empty");
      return;
    }

    if (!selectedShipping) {
      notify.error("Please select a shipping method");
      return;
    }

    setIsProcessing(true);
    setIsCreatingAccount(false);

    try {
      // Add shipping information to form data
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee: shippingFee,
      };

      let customerId: string | undefined = currentUser?.id;

      // ✅ FIX: Scenario 1 - User is already logged in (SIMPLIFIED)
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
          notify.success("Congratulations! Your order has been placed successfully.");
          clearStoreCart(store_slug);
          clearFormData();
          setTimeout(() => router.push("/order-status"), 2000);
        } else {
          notify.error(result.error || "Failed to place order. Please try again.");
        }
        return;
      }

      // ✅ FIX: Scenario 2 - User is NOT logged in
      console.log("🔄 User is not logged in, attempting account creation and order placement");

      // First, check if user already exists
      const existingCustomer = await getCustomerByEmail(values.email);
      
      if (existingCustomer) {
        console.log("📧 Customer exists, attempting login");
        // Try to login with provided credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) {
          console.error("❌ Login failed:", signInError);
          notify.error("The password you entered is incorrect. Please try again.");
          return;
        }

        console.log("✅ Login successful, processing order");
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
          notify.success("Congratulations! Your order has been placed successfully.");
          clearStoreCart(store_slug);
          clearFormData();
          setTimeout(() => router.push("/order-status"), 2000);
        } else {
          notify.error(result.error || "Failed to place order. Please try again.");
        }
        return;
      }

      // ✅ FIX: Scenario 3 - Create new account and place order
      console.log("👤 Creating new customer account");
      setIsCreatingAccount(true);

      try {
        const customerData = {
          ...values,
          store_slug,
        };

        const customerResult = await createCheckoutCustomer(customerData);
        console.log("✅ Customer created successfully");

        // Auto-login the new customer
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) {
          console.error("❌ Auto-login failed:", signInError);
          throw new Error(`Account created but login failed: ${signInError.message}`);
        }

        console.log("✅ New customer auto-logged in");
        customerId = signInData.user?.id;

        if (!customerId) {
          throw new Error("Failed to get customer ID after login");
        }

        // Process order with new customer
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
          notify.success("Congratulations! Your account has been created and order placed successfully.");
          clearStoreCart(store_slug);
          clearFormData();
          setTimeout(() => router.push("/order-status"), 2000);
        } else {
          notify.error(orderResult.error || "Failed to place order after account creation.");
        }

      } catch (accountError: any) {
        console.error("❌ Account creation error:", accountError);
        notify.error(accountError.message || "Failed to create account. Please try again.");
      }

    } catch (error: any) {
      console.error("❌ Checkout process error:", error);
      notify.error(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsCreatingAccount(false);
    }
  };

  // Store loading check
  if (isLoadingOverall || storeExists === null) {
    return <StoreLoadingSkeleton />;
  }

  // Store not found
  if (storeExists === false) {
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
  if (cartItems.length === 0 && !isLoadingOverall) {
    return <OrderCompleteSkeleton />;
  }

  return (
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
  );
}