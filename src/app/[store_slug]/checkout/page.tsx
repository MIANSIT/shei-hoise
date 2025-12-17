/* eslint-disable @typescript-eslint/no-explicit-any */
// app/[store_slug]/checkout/page.tsx - COMPLETELY FIXED VERSION
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
 const {
    currency,
    // icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;

  const notify = useSheiNotification();
  const {
    clearFormData,
    setJustCreatedAccount,
    setCreatedAccountEmail,
    clearAccountCreationFlags,
  } = useCheckoutStore();
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

  // ✅ OPTIMIZED: Memoize user login state
  const isUserLoggedIn = useMemo(() => {
    return Boolean(session?.user);
  }, [session]);

  const isSubmitting = isProcessing || orderLoading;
  const isLoadingOverall = useMemo(() => {
    return cartLoading || authLoading || storeLoading || !taxLoaded;
  }, [cartLoading, authLoading, storeLoading, taxLoaded]);

  // ✅ OPTIMIZED: Fetch tax amount once
  useEffect(() => {
    const fetchTaxAmount = async () => {
      try {
        const storeId = await getStoreIdBySlug(store_slug);
        if (storeId) {
          const storeSettings = await getStoreSettings(storeId);
          if (storeSettings && storeSettings.tax_rate) {
            setTaxAmount(storeSettings.tax_rate);
            setTaxLoaded(true);
          }
        } else {
          setTaxLoaded(true);
        }
      } catch (error) {
        console.error("❌ Error fetching tax amount:", error);
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

  
  // const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  const displayCurrency = currencyLoading ? "" : currency ?? "";
  const displayCurrencyIconSafe = displayCurrency || "BDT"; // fallback

  // ✅ OPTIMIZED: Memoize shipping change handler
  const handleShippingChange = useCallback((shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  }, []);

  // ✅ OPTIMIZED: Memoize createTempOrderData
  const createTempOrderData = useCallback((
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
  }, [cartItems, calculations, shippingFee, taxAmount, invoiceStoreData, store_slug, selectedShipping]);

  // ✅ FIXED: ALL HELPER FUNCTIONS IN CORRECT ORDER (NO CIRCULAR DEPENDENCIES)

  // 1. First, declare getStoreId (used by many other functions)
  const getStoreId = useCallback(async (storeSlug: string): Promise<string | null> => {
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
  }, []);

  // 2. Declare createProfileAndLinks BEFORE functions that use it
  const createProfileAndLinks = useCallback(async (
    customerId: string,
    storeId: string,
    values: CustomerCheckoutFormValues
  ) => {
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
  }, []);

  // 3. Now declare createGuestCustomer (uses createProfileAndLinks)
  const createGuestCustomer = useCallback(async (
    values: CustomerCheckoutFormValues,
    storeSlug: string
  ): Promise<string> => {
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
  }, [getStoreId, createProfileAndLinks]);

  // 4. Other helper functions that don't have circular dependencies
  const handleLogin = useCallback(async (
    email: string,
    password: string
  ): Promise<User | null> => {
    const { data, error }: AuthResponse =
      await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

    if (error) {
      console.error("Login failed:", error.message);
      return null;
    }
    return data.user;
  }, []);

  const updateCustomerProfile = useCallback(async (
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
  }, []);

  const createCustomerProfile = useCallback(async (
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
  }, []);

  const createCustomerWithRetry = useCallback(async (
    values: CustomerCheckoutFormValues,
    storeSlug: string,
    authUserId: string | null
  ): Promise<string> => {
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
  }, [getStoreId]);

  // 5. Now declare createAuthAndCustomer (uses createGuestCustomer)
  const createAuthAndCustomer = useCallback(async (
    values: CustomerCheckoutFormValues,
    storeSlug: string
  ): Promise<{
    customerId: string;
    authUserId: string | null;
    loginSuccess: boolean;
    success: boolean;
  }> => {
    const storeId = await getStoreId(storeSlug);
    if (!storeId) throw new Error("Store not found");

    let authUserId: string | null = null;
    let loginSuccess = false;

    try {
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
        if (authError.message.includes("already registered")) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: values.email.toLowerCase(),
              password: values.password!,
            });

          if (signInError) {
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
          }
        } else {
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
        const user = await handleLogin(
          values.email.toLowerCase(),
          values.password!
        );
        loginSuccess = !!user;
      }
    } catch (authError) {
      console.error("❌ Auth creation error:", authError);
    }

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
  }, [getStoreId, handleLogin, createCustomerWithRetry, createProfileAndLinks, createGuestCustomer]);

  const handleAuthForExistingCustomer = useCallback(async (
    values: CustomerCheckoutFormValues,
    customerId: string
  ): Promise<{
    authUserId: string | null;
    loginSuccess: boolean;
    success: boolean;
  }> => {
    let authUserId: string | null = null;
    let loginSuccess = false;

    try {
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
        if (authError.message.includes("already registered")) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: values.email.toLowerCase(),
              password: values.password!,
            });

          if (signInError) {
            return { authUserId: null, loginSuccess: false, success: false };
          }

          if (signInData.user) {
            authUserId = signInData.user.id;
            loginSuccess = true;
          }
        } else {
          return { authUserId: null, loginSuccess: false, success: false };
        }
      } else if (authData?.user) {
        authUserId = authData.user.id;

        try {
          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: values.email.toLowerCase(),
              password: values.password!,
            }
          );

          if (signInError) {
            loginSuccess = false;
          } else {
            loginSuccess = true;
          }
        } catch (loginError) {
          loginSuccess = false;
        }
      }

      if (authUserId) {
        await linkAuthToCustomer(customerId, authUserId);
        return { authUserId, loginSuccess, success: true };
      }
    } catch (error) {
      console.error("❌ Auth setup error:", error);
    }

    return { authUserId: null, loginSuccess: false, success: false };
  }, []);

  const linkAuthToCustomer = useCallback(async (customerId: string, authUserId: string) => {
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
  }, []);

  // ✅ OPTIMIZED: Main checkout handler
  const handleCheckoutSubmit = useCallback(async (values: CustomerCheckoutFormValues) => {
    if (cartItems.length === 0) return notify.error("Your cart is empty");
    if (!selectedShipping)
      return notify.error("Please select a shipping method");

    setIsProcessing(true);
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

      // 🔐 LOGGED IN USER FLOW
      if (isUserLoggedIn && session?.user) {
        // For logged-in users, find or create customer with their email
        const existing = await getCustomerByEmail(session.user.email!, store_slug);
        
        if (existing) {
          console.log("✅ Found existing customer for logged-in user:", existing.id);
          storeCustomerId = existing.id;
          authUserId = existing.auth_user_id || session.user.id;
          
          if (existing.profile_id) {
            await updateCustomerProfile(existing.profile_id, values);
          } else {
            await createCustomerProfile(existing.id, values);
          }
        } else {
          // Create new customer for logged-in user
          console.log("📝 Creating new customer for logged-in user...");
          const storeId = await getStoreId(store_slug);
          if (!storeId) throw new Error("Store not found");
          
          const { data: newCustomer, error } = await supabase
            .from("store_customers")
            .insert({
              name: values.name,
              email: session.user.email!,
              phone: values.phone,
              auth_user_id: session.user.id,
            })
            .select("id")
            .single();
            
          if (error) throw new Error(`Failed to create customer: ${error.message}`);
          
          storeCustomerId = newCustomer.id;
          authUserId = session.user.id;
          
          await createProfileAndLinks(storeCustomerId, storeId, values);
        }
      } else {
        // 🧑‍🧾 GUEST / NON-LOGGED USER
        const existing = await getCustomerByEmail(values.email, store_slug);

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

              if (authUserId) {
                setJustCreatedAccount(true);
                setCreatedAccountEmail(values.email);
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
            const authResult = await createAuthAndCustomer(values, store_slug);
            storeCustomerId = authResult.customerId;
            authUserId = authResult.authUserId;
            loginSuccess = authResult.loginSuccess;
            accountCreatedDuringCheckout = true;

            if (authUserId) {
              setJustCreatedAccount(true);
              setCreatedAccountEmail(values.email);
            }

            if (!authResult.success) {
              notify.warning(
                "Order placed! Account setup will complete shortly."
              );
            }
          } else {
            storeCustomerId = await createGuestCustomer(values, store_slug);
          }
        }
      }

      if (!storeCustomerId) {
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

      setInvoiceData(createTempOrderData(values, storeCustomerId, result));
      setShowInvoice(true);

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

      setTimeout(() => clearStoreCart(store_slug), 3000);
    } catch (error: any) {
      console.error("❌ Checkout error:", error);
      notify.error(error.message || "Unexpected error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
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
    handleAuthForExistingCustomer,
    setJustCreatedAccount,
    setCreatedAccountEmail,
    createAuthAndCustomer,
    createGuestCustomer,
    processOrder,
    calculations,
    createTempOrderData,
    clearStoreCart
  ]);

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