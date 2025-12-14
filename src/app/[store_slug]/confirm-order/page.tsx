/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/confirm-order/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import useCartStore from "@/lib/store/cartStore";
import UnifiedCheckoutLayout from "../../components/products/checkout/UnifiedCheckoutLayout";
import { useUnifiedCartData } from "@/lib/hook/useUnifiedCartData";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { supabase } from "@/lib/supabase";
import { getCustomerByEmail } from "@/lib/queries/customers/getCustomerByEmail";
import { AnimatePresence } from "framer-motion";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { AuthResponse, User } from "@supabase/supabase-js";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer";

export default function ConfirmOrderPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const compressedData = searchParams.get("o");
  const store_slug = params.store_slug as string;
  
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<StoreOrder | null>(null);

  const notify = useSheiNotification();
  const {
    clearFormData,
    setJustCreatedAccount,
    setCreatedAccountEmail,
    clearAccountCreationFlags,
  } = useCheckoutStore();
  
  const { clearStoreCart } = useCartStore();

  // Validate store_slug before using it
  const validatedStoreSlug = store_slug && store_slug !== "undefined" ? store_slug : "";

  const {
    cartItems,
    calculations,
    loading: cartLoading,
    error: cartError,
  } = useUnifiedCartData({
    storeSlug: validatedStoreSlug,
    compressedData,
    useZustand: false,
  });

  const {
    storeData: invoiceStoreData,
    loading: storeLoading,
    error: storeError,
  } = useInvoiceData({
    storeSlug: validatedStoreSlug,
  });

  const {
    processOrder,
    loading: orderLoading,
    error: orderError,
  } = useOrderProcess(validatedStoreSlug);

  const { session, loading: authLoading } = useSupabaseAuth();
  const { 
    customer: currentCustomer, 
    loading: customerLoading,
    isAuthenticated,
    authEmail,
    authUserId
  } = useCurrentCustomer(validatedStoreSlug);

  const isUserLoggedIn = Boolean(session && currentCustomer?.auth_user_id);
  const isSubmitting = isProcessing || orderLoading;
  const isLoadingOverall =
    cartLoading || authLoading || customerLoading || storeLoading;

  // ✅ Fetch tax amount from store settings
  useEffect(() => {
    const fetchTaxAmount = async () => {
      try {
        const storeId = await getStoreIdBySlug(validatedStoreSlug);
        if (storeId) {
          const storeSettings = await getStoreSettings(storeId);
          if (storeSettings && storeSettings.tax_rate) {
            setTaxAmount(storeSettings.tax_rate);
            console.log("✅ Tax amount fetched from store:", storeSettings.tax_rate);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching tax amount:", error);
      }
    };

    if (validatedStoreSlug) {
      fetchTaxAmount();
    }
  }, [validatedStoreSlug]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!validatedStoreSlug) {
      console.error("❌ Invalid store slug:", store_slug);
      notify.error("Invalid store URL. Please check the store link.");
      router.push("/");
    }
  }, [validatedStoreSlug, store_slug, notify, router]);

  useEffect(() => {
    if (
      isMounted &&
      cartItems.length === 0 &&
      !isLoadingOverall &&
      !showInvoice
    ) {
      const redirectTimer = setTimeout(() => {
        router.push(`/${validatedStoreSlug}/order-status`);
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [
    isMounted,
    cartItems.length,
    validatedStoreSlug,
    router,
    isLoadingOverall,
    showInvoice,
  ]);

  // ✅ Simplified: Only handle shipping change, tax is fixed
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

    // ✅ Calculate total with tax (fixed amount)
    const totalWithTax = calculations.totalPrice + shippingFee + taxAmount;

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
      currency: "BDT",
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
            store_name: validatedStoreSlug,
            store_slug: validatedStoreSlug,
            business_address: "Business address not available",
            contact_phone: "Phone not available",
            contact_email: "Email not available",
          },
      delivery_option: selectedShipping as any,
    };
  };

  const handleCheckoutSubmit = async (values: CustomerCheckoutFormValues) => {
    console.log("🔄 Confirm order submit:", {
      ...values,
      password: values.password ? "***" : "not-provided",
      isUserLoggedIn,
      cartItemsCount: cartItems.length,
      selectedShipping,
      shippingFee,
      taxAmount,
      currentCustomerId: currentCustomer?.id,
    });

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

    // Clear any previous account creation flags
    clearAccountCreationFlags();

    try {
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee,
        taxAmount,
      };

      let storeCustomerId: string = "";
      let authUserId: string | null = null;
      let accountCreatedDuringCheckout = false;
      let loginSuccess = false;

      // 🔐 LOGGED IN USER FLOW (using currentCustomer from useCurrentCustomer)
      if (isUserLoggedIn && currentCustomer) {
        authUserId = currentCustomer.auth_user_id || null;
        storeCustomerId = currentCustomer.id;

        // Update customer profile if needed
        if (currentCustomer.profile?.id) {
          await updateCustomerProfile(currentCustomer.profile.id, values);
        } else {
          await createCustomerProfile(storeCustomerId, values);
        }
      }

      // 🧑‍🧾 GUEST / NON-LOGGED USER
      if (!isUserLoggedIn) {
        const existing = await getCustomerByEmail(values.email, validatedStoreSlug);

        if (existing) {
          storeCustomerId = existing.id;

          if (existing.profile_id) {
            await updateCustomerProfile(existing.profile_id, values);
          } else {
            await createCustomerProfile(existing.id, values);
          }

          if (!existing.auth_user_id && values.password) {
            try {
              const authResult = await handleAuthForExistingCustomer(
                values,
                existing.id
              );
              authUserId = authResult.authUserId;
              loginSuccess = authResult.loginSuccess;
              accountCreatedDuringCheckout = true;

              // ✅ Set Zustand flags for immediate order access
              if (authUserId) {
                setJustCreatedAccount(true);
                setCreatedAccountEmail(values.email);
                console.log("✅ Account linked to existing customer");
              }

              if (!authResult.success) {
                notify.warning(
                  "Order placed! Account setup will complete shortly."
                );
              }
            } catch (authError: any) {
              console.error("Auth error:", authError);
              notify.warning("Account setup had issues. You can log in later.");
            }
          }
        } else {
          if (values.password) {
            const authResult = await createAuthAndCustomer(values, validatedStoreSlug);
            storeCustomerId = authResult.customerId;
            authUserId = authResult.authUserId;
            loginSuccess = authResult.loginSuccess;
            accountCreatedDuringCheckout = true;

            // ✅ Set Zustand flags for immediate order access
            if (authUserId) {
              setJustCreatedAccount(true);
              setCreatedAccountEmail(values.email);
              console.log("✅ New account created");
            }

            if (!authResult.success) {
              notify.warning(
                "Order placed! Account setup will complete shortly."
              );
            }
          } else {
            storeCustomerId = await createGuestCustomer(values, validatedStoreSlug);
          }
        }
      }

      // 📦 PROCESS ORDER
      if (!storeCustomerId) {
        console.error("❌ CRITICAL: No customer ID");
        return notify.error(
          "Failed to create customer record. Please try again."
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
        taxAmount
      );

      if (!result.success) {
        return notify.error(result.error || "Failed to place order");
      }

      // Show invoice
      setInvoiceData(createTempOrderData(values, storeCustomerId, result));
      setShowInvoice(true);

      // Success messages
      if (isUserLoggedIn) {
        notify.success("Order placed successfully!");
      } else if (values.password) {
        if (authUserId && loginSuccess) {
          notify.success(
            "Order placed successfully! Account created and logged in."
          );
        } else if (authUserId && !loginSuccess) {
          notify.success(
            "Order placed successfully! Account created. Please check your email to verify."
          );
        } else {
          notify.success(
            "Order placed successfully! Account setup in progress."
          );
        }
      } else {
        notify.success("Order placed successfully!");
      }

      // Clear cart (only if using compressed data)
      if (compressedData) {
        setTimeout(() => clearStoreCart(validatedStoreSlug), 3000);
      }
      
      clearFormData();
    } catch (error: any) {
      console.error("❌ Confirm order error:", error);
      notify.error(error.message || "Failed to process order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ============ HELPER FUNCTIONS ============
  async function updateCustomerProfile(
    profileId: string,
    values: CustomerCheckoutFormValues
  ) {
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
  }

  async function createCustomerProfile(
    storeCustomerId: string,
    values: CustomerCheckoutFormValues
  ) {
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
  }

  async function getStoreId(storeSlug: string): Promise<string | null> {
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
  }

  async function createCustomerWithRetry(
    values: CustomerCheckoutFormValues,
    storeSlug: string,
    authUserId: string | null
  ): Promise<string> {
    const storeId = await getStoreId(storeSlug);
    if (!storeId) throw new Error("Store not found");

    let retries = 3;

    while (retries > 0) {
      try {
        const { data: customer, error } = await supabase
          .from("store_customers")
          .insert({
            name: values.name,
            email: values.email.toLowerCase(),
            phone: values.phone,
            auth_user_id: authUserId,
          })
          .select("id")
          .single();

        if (!error) return customer.id;

        if (error.code === "23503") {
          console.log(`⚠️ Foreign key error, retrying (${retries} left)...`);
          retries--;

          if (retries === 0) {
            const { data: guestCustomer } = await supabase
              .from("store_customers")
              .insert({
                name: values.name,
                email: values.email.toLowerCase(),
                phone: values.phone,
                auth_user_id: null,
              })
              .select("id")
              .single();

            if (guestCustomer) {
              if (authUserId) {
                setTimeout(
                  () => linkAuthToCustomer(guestCustomer.id, authUserId),
                  5000
                );
              }
              return guestCustomer.id;
            }
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } else {
          throw new Error(error.message);
        }
      } catch (error: any) {
        if (retries === 0) throw error;
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error("Failed to create customer after retries");
  }
  
  async function handleLogin(
    email: string,
    password: string
  ): Promise<User | null> {
    const { data, error }: AuthResponse =
      await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

    if (error) {
      console.error("Login failed:", error.message);
      return null;
    }
    console.log("Login successful! Session data:", data);
    return data.user;
  }
  
  async function createAuthAndCustomer(
    values: CustomerCheckoutFormValues,
    storeSlug: string
  ): Promise<{
    customerId: string;
    authUserId: string | null;
    loginSuccess: boolean;
    success: boolean;
  }> {
    const storeId = await getStoreId(storeSlug);
    if (!storeId) throw new Error("Store not found");

    let authUserId: string | null = null;
    let loginSuccess = false;

    try {
      // First try to sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email.toLowerCase(),
        password: values.password!,
        options: {
          data: {
            first_name: values.name.split(" ")[0] || values.name,
            last_name: values.name.split(" ").slice(1).join(" ") || "",
            phone: values.phone,
            role: "customer",
          },
        },
      });

      if (authError) {
        console.warn("⚠️ Auth sign-up failed:", authError.message);

        // If user already exists, try signing in
        if (authError.message.includes("already registered")) {
          console.log("🔄 User exists, attempting sign-in...");
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: values.email.toLowerCase(),
              password: values.password!,
            });

          if (signInError) {
            console.warn("⚠️ Sign-in also failed:", signInError.message);
            // Create guest customer instead
            const customerId = await createGuestCustomer(values, storeSlug);
            return {
              customerId,
              authUserId: null,
              loginSuccess: false,
              success: false,
            };
          }

          if (signInData.user) {
            authUserId = signInData.user.id;
            loginSuccess = true;
            console.log("✅ Auto-login successful for existing user");
          }
        } else {
          // Other error, create guest customer
          const customerId = await createGuestCustomer(values, storeSlug);
          return {
            customerId,
            authUserId: null,
            loginSuccess: false,
            success: false,
          };
        }
      } else if (authData?.user) {
        authUserId = authData.user.id;
        await handleLogin(values.email.toLowerCase(), values.password!)
      }
    } catch (authError) {
      console.error("❌ Auth creation error:", authError);
    }

    // Create customer with auth_user_id
    const customerId = await createCustomerWithRetry(
      values,
      storeSlug,
      authUserId
    );
    await createProfileAndLinks(customerId, storeId, values);

    return {
      customerId,
      authUserId,
      loginSuccess,
      success: !!authUserId,
    };
  }

  async function createGuestCustomer(
    values: CustomerCheckoutFormValues,
    storeSlug: string
  ): Promise<string> {
    const storeId = await getStoreId(storeSlug);
    if (!storeId) throw new Error("Store not found");

    const { data: customer, error } = await supabase
      .from("store_customers")
      .insert({
        name: values.name,
        email: values.email.toLowerCase(),
        phone: values.phone,
        auth_user_id: null,
      })
      .select("id")
      .single();

    if (error)
      throw new Error(`Failed to create guest customer: ${error.message}`);

    await createProfileAndLinks(customer.id, storeId, values);
    return customer.id;
  }

  async function handleAuthForExistingCustomer(
    values: CustomerCheckoutFormValues,
    customerId: string
  ): Promise<{
    authUserId: string | null;
    loginSuccess: boolean;
    success: boolean;
  }> {
    let authUserId: string | null = null;
    let loginSuccess = false;

    try {
      // First try to sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
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

      if (authError) {
        // If user already exists, try signing in
        if (authError.message.includes("already registered")) {
          console.log("🔄 Existing user, attempting sign-in...");
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: values.email.toLowerCase(),
              password: values.password!,
            });

          if (signInError) {
            console.warn("⚠️ Sign-in failed:", signInError.message);
            return { authUserId: null, loginSuccess: false, success: false };
          }

          if (signInData.user) {
            authUserId = signInData.user.id;
            loginSuccess = true;
            console.log("✅ Auto-login successful for existing user");
          }
        } else {
          console.warn("⚠️ Auth creation failed:", authError.message);
          return { authUserId: null, loginSuccess: false, success: false };
        }
      } else if (authData?.user) {
        authUserId = authData.user.id;

        // Try to auto-login after sign-up
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: values.email.toLowerCase(),
              password: values.password!,
            }
          );

          if (signInError) {
            console.warn(
              "⚠️ Auto-login after sign-up failed:",
              signInError.message
            );
            loginSuccess = false;
          } else {
            loginSuccess = true;
            console.log("✅ Auto-login after sign-up successful");
          }
        } catch (loginError) {
          console.error("❌ Auto-login error:", loginError);
          loginSuccess = false;
        }
      }

      // Link auth to customer if we have authUserId
      if (authUserId) {
        await linkAuthToCustomer(customerId, authUserId);
        return { authUserId, loginSuccess, success: true };
      }
    } catch (error) {
      console.error("❌ Auth setup error:", error);
    }

    return { authUserId: null, loginSuccess: false, success: false };
  }

  async function linkAuthToCustomer(customerId: string, authUserId: string) {
    let retries = 5;

    while (retries > 0) {
      try {
        const { error } = await supabase
          .from("store_customers")
          .update({
            auth_user_id: authUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerId);

        if (!error) {
          return true;
        }

        retries--;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return false;
  }

  async function createProfileAndLinks(
    customerId: string,
    storeId: string,
    values: CustomerCheckoutFormValues
  ) {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .insert({
        store_customer_id: customerId,
        address: values.shippingAddress,
        city: values.city,
        postal_code: values.postCode,
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
        { onConflict: "customer_id,store_id" }
      );
  }

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

  // Loading states
  if (isLoadingOverall) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Complete</h1>
          <p>Your order has been placed successfully!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnifiedCheckoutLayout
        storeSlug={validatedStoreSlug}
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
        mode="confirm"
      />

      <AnimatePresence>
        {showInvoice && invoiceData && (
          <AnimatedInvoice
            isOpen={showInvoice}
            onClose={() => {
              setShowInvoice(false);
              // Clear account creation flags when leaving invoice
              setTimeout(() => {
                clearAccountCreationFlags();
              }, 1000);
              router.push(`/${validatedStoreSlug}/order-status`);
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