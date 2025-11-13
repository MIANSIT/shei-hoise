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
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
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
  
  const { cartItems, calculations, loading: cartLoading, error: cartError } = useUnifiedCartData({
    storeSlug: store_slug,
    useZustand: true,
  });

  // Use the custom hook for store data
  const { storeData: invoiceStoreData, loading: storeLoading, error: storeError } = useInvoiceData(store_slug);

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
  
  // ✅ Combined loading state
  const isLoadingOverall = cartLoading || authLoading || userLoading || storeLoading;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && cartItems.length === 0 && !isLoadingOverall && !showInvoice) {
      const redirectTimer = setTimeout(() => {
        router.push(`/${store_slug}/order-status`);
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isMounted, cartItems.length, store_slug, router, isLoadingOverall, showInvoice]);

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  // Create temporary order data for invoice
  const createTempOrderData = (values: any, customerId: string | undefined, result: any): StoreOrder => {
    // Fix the order items to match the OrderItem type
    const orderItems: OrderItem[] = cartItems.map(item => ({
      id: `temp-item-${Date.now()}-${item.productId}`,
      product_id: item.productId,
      variant_id: item.variantId || null,
      quantity: item.quantity,
      unit_price: item.displayPrice,
      total_price: item.displayPrice * item.quantity,
      product_name: item.productName,
      variant_details: item.variant || null,
      products: item.product ? {
        id: item.product.id,
        name: item.product.name,
        product_images: item.product.product_images || []
      } : undefined,
      product_variants: item.variant ? {
        id: item.variant.id,
        product_images: item.variant.product_images || []
      } : undefined
    }));

    // Use the actual order data from processOrder result
    const orderId = result.orderId || `order-${Date.now()}`;
    const orderNumber = result.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

    // Create proper address objects
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
      customer_id: customerId || 'temp-customer',
      store_id: invoiceStoreData?.id || 'temp-store-id',
      status: 'pending',
      subtotal: calculations.subtotal,
      tax_amount: 0,
      shipping_fee: shippingFee,
      total_amount: calculations.totalPrice + shippingFee,
      currency: 'BDT',
      payment_status: 'pending',
      payment_method: "cod",
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_items: orderItems,
      customers: {
        id: customerId || 'temp-customer',
        first_name: values.name.split(' ')[0] || values.name,
        email: values.email,
        phone: values.phone,
      },
      stores: invoiceStoreData ? {
        id: invoiceStoreData.id,
        store_name: invoiceStoreData.store_name,
        store_slug: invoiceStoreData.store_slug,
        business_address: invoiceStoreData.business_address,
        contact_phone: invoiceStoreData.contact_phone,
        contact_email: invoiceStoreData.contact_email
      } : {
        id: 'temp-store',
        store_name: store_slug,
        store_slug: store_slug,
        business_address: 'Business address not available',
        contact_phone: 'Phone not available',
        contact_email: 'Email not available'
      },
      delivery_option: selectedShipping as any
    };
  };

  // ✅ Simplified and fixed checkout flow
  const handleCheckoutSubmit = async (values: any) => {
    console.log("🔄 Checkout form submitted with values:", {
      ...values,
      password: values.password ? "***" : "not-provided",
      isUserLoggedIn,
      cartItemsCount: cartItems.length,
      selectedShipping,
      shippingFee
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
    setIsCreatingAccount(false);

    try {
      // Add shipping information to form data
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee: shippingFee,
      };

      let customerId: string | undefined = currentUser?.id;

      // ✅ Scenario 1 - User is already logged in
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
          console.log("✅ Order processed successfully, showing invoice");
          
          // Create temporary invoice data with the order result
          const tempOrderData = createTempOrderData(values, customerId, result);
          setInvoiceData(tempOrderData);
          setShowInvoice(true);
          
          notify.success("Congratulations! Your order has been placed successfully.");
          
          // Clear cart and form data after a delay
          setTimeout(() => {
            clearStoreCart(store_slug);
            clearFormData();
          }, 3000);
        } else {
          notify.error(result.error || "Failed to place order. Please try again.");
        }
        return;
      }

      // ✅ Scenario 2 - User is NOT logged in
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
          console.log("✅ Order processed successfully, showing invoice");
          // Create temporary invoice data for existing customer
          const tempOrderData = createTempOrderData(values, customerId, result);
          setInvoiceData(tempOrderData);
          setShowInvoice(true);
          
          notify.success("Congratulations! Your order has been placed successfully.");
          
          // Clear cart and form data after a delay
          setTimeout(() => {
            clearStoreCart(store_slug);
            clearFormData();
          }, 3000);
        } else {
          notify.error(result.error || "Failed to place order. Please try again.");
        }
        return;
      }

      // ✅ Scenario 3 - Create new account and place order
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
          console.log("✅ Order processed successfully, showing invoice");
          // Create temporary invoice data for new customer
          const tempOrderData = createTempOrderData(values, customerId, orderResult);
          setInvoiceData(tempOrderData);
          setShowInvoice(true);
          
          notify.success("Congratulations! Your account has been created and order placed successfully.");
          
          // Clear cart and form data after a delay
          setTimeout(() => {
            clearStoreCart(store_slug);
            clearFormData();
          }, 3000);
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