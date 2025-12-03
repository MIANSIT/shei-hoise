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
  const [taxAmount, setTaxAmount] = useState<number>(0); // ✅ ADDED: Tax amount state
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

  const handleShippingChange = (shippingMethod: string, fee: number, tax?: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
    if (tax !== undefined) {
      setTaxAmount(tax); // ✅ Update tax amount when shipping changes
    }
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

    // ✅ Calculate total with tax
    const totalWithTax = calculations.totalPrice + shippingFee + taxAmount;

    return {
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId || "temp-customer",
      store_id: invoiceStoreData?.id || "temp-store-id",
      status: "pending",
      subtotal: calculations.subtotal,
      tax_amount: taxAmount, // ✅ Include tax amount
      shipping_fee: shippingFee,
      total_amount: totalWithTax, // ✅ Use total with tax
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

const handleCheckoutSubmit = async (values: CustomerCheckoutFormValues) => {
  console.log("🔄 Checkout submit:", {
    ...values,
    password: values.password ? "***" : "not-provided",
    isUserLoggedIn,
    cartItemsCount: cartItems.length,
    selectedShipping,
    shippingFee,
    taxAmount, // ✅ Include tax amount in logs
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
      taxAmount, // ✅ Include tax amount in form data
    };

    let storeCustomerId: string = "";
    let authUserId: string | null = null;

    // ------------------------
    //  🔐 LOGGED IN USERFLOW
    // ------------------------
    if (isUserLoggedIn && currentUser) {
      authUserId = currentUser.id;
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
      } else {
        // Logged in user doesn't have a store customer record
        console.log("👤 Creating store customer for logged-in user...");
        storeCustomerId = await createCustomerWithRetry(values, store_slug, authUserId);
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
          await createCustomerProfile(existing.id, values);
          console.log("✅ Created profile for existing customer");
        }

        // 🔐 UPGRADE GUEST → AUTH
        if (!existing.auth_user_id && values.password) {
          try {
            console.log("🔐 Creating/linking auth account...");
            const authResult = await handleAuthForExistingCustomer(values, existing.id);
            authUserId = authResult.authUserId;
            
            if (authResult.success) {
              console.log("✅ Auth setup completed");
            } else {
              notify.warning("Order placed! Account setup will complete shortly.");
            }
          } catch (authError: any) {
            console.error("Auth error:", authError);
            notify.warning("Account setup had issues. You can log in later.");
          }
        }
      } else {
        // 🆕 Create brand new customer
        console.log("👤 Creating new customer...");
        
        if (values.password) {
          // Create auth account first, then customer
          const authResult = await createAuthAndCustomer(values, store_slug);
          storeCustomerId = authResult.customerId;
          authUserId = authResult.authUserId;
          
          if (authResult.success) {
            console.log("✅ New customer with auth account created");
          } else {
            notify.warning("Order placed! Account setup will complete shortly.");
          }
        } else {
          // Create guest customer (no password)
          storeCustomerId = await createGuestCustomer(values, store_slug);
        }
      }
    }

    // ------------------------
    // 📦 PROCESS ORDER (MUST SUCCEED)
    // ------------------------
    if (!storeCustomerId) {
      console.error("❌ CRITICAL: No customer ID");
      return notify.error("Failed to create customer record. Please try again.");
    }

    // ✅ Pass taxAmount to processOrder
    const result = await processOrder(
      formDataWithShipping,
      storeCustomerId,
      "cod",
      selectedShipping,
      shippingFee,
      cartItems,
      calculations,
      taxAmount // ✅ ADD THIS: Pass tax amount to order process
    );

    if (!result.success) {
      return notify.error(result.error || "Failed to place order");
    }

    // Show invoice
    setInvoiceData(createTempOrderData(values, storeCustomerId, result));
    setShowInvoice(true);

    // Show success message
    if (isUserLoggedIn) {
      notify.success("Order placed successfully!");
    } else if (values.password) {
      if (authUserId) {
        notify.success("Order placed successfully! Account created. Check your email.");
      } else {
        notify.success("Order placed successfully! Account setup in progress.");
      }
    } else {
      notify.success("Order placed successfully!");
    }

    // Clear cart after delay
    setTimeout(() => clearStoreCart(store_slug), 3000);
  } catch (error: any) {
    console.error("❌ Checkout error:", error);
    notify.error(error.message || "Unexpected error. Please try again.");
  } finally {
    setIsProcessing(false);
  }
};

// ============ HELPER FUNCTIONS ============

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
      // Try with auth_user_id first
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
      
      // If foreign key error, wait and retry without auth_user_id
      if (error.code === "23503") {
        console.log(`⚠️ Foreign key error, retrying (${retries} left)...`);
        retries--;
        
        if (retries === 0) {
          // Last attempt: create without auth_user_id
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
            // Schedule linking for later
            if (authUserId) {
              setTimeout(() => linkAuthToCustomer(guestCustomer.id, authUserId), 5000);
            }
            return guestCustomer.id;
          }
        } else {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        throw new Error(error.message);
      }
    } catch (error: any) {
      if (retries === 0) throw error;
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error("Failed to create customer after retries");
}

async function createAuthAndCustomer(
  values: CustomerCheckoutFormValues,
  storeSlug: string
): Promise<{ customerId: string; authUserId: string | null; success: boolean }> {
  const storeId = await getStoreId(storeSlug);
  if (!storeId) throw new Error("Store not found");

  let authUserId: string | null = null;
  
  // Step 1: Create auth account
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
      console.warn("⚠️ Auth creation failed:", authError.message);
      // Create customer without auth
      const customerId = await createGuestCustomer(values, storeSlug);
      return { customerId, authUserId: null, success: false };
    }

    if (authData.user) {
      authUserId = authData.user.id;
      console.log("✅ Auth user created:", authUserId);
    }
  } catch (authError) {
    console.error("❌ Auth creation error:", authError);
  }

  // Step 2: Create customer with retry mechanism
  const customerId = await createCustomerWithRetry(values, storeSlug, authUserId);
  
  // Step 3: Create profile and link
  await createProfileAndLinks(customerId, storeId, values);
  
  return { customerId, authUserId, success: !!authUserId };
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

  if (error) throw new Error(`Failed to create guest customer: ${error.message}`);

  await createProfileAndLinks(customer.id, storeId, values);
  return customer.id;
}

async function handleAuthForExistingCustomer(
  values: CustomerCheckoutFormValues,
  customerId: string
): Promise<{ authUserId: string | null; success: boolean }> {
  let authUserId: string | null = null;
  
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
      console.warn("⚠️ Auth creation failed:", authError.message);
      return { authUserId: null, success: false };
    }

    if (authData.user) {
      authUserId = authData.user.id;
      
      // Try to link immediately with retry
      await linkAuthToCustomer(customerId, authUserId);
      return { authUserId, success: true };
    }
  } catch (error) {
    console.error("❌ Auth setup error:", error);
  }
  
  return { authUserId: null, success: false };
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
        console.log("✅ Auth linked successfully");
        return true;
      }
      
      console.log(`⚠️ Linking failed (${retries} left):`, error.message);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Linking error:", error);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log("❌ Failed to link auth after all retries");
  return false;
}

async function createProfileAndLinks(
  customerId: string,
  storeId: string,
  values: CustomerCheckoutFormValues
) {
  // Create profile
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
    // Update customer with profile_id
    await supabase
      .from("store_customers")
      .update({ profile_id: profile.id })
      .eq("id", customerId);
  }

  // Create store link
  await supabase
    .from("store_customer_links")
    .insert({
      customer_id: customerId,
      store_id: storeId,
    });
}

// Helper functions
async function updateCustomerProfile(profileId: string, values: CustomerCheckoutFormValues) {
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

async function createCustomerProfile(storeCustomerId: string, values: CustomerCheckoutFormValues) {
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
        onShippingChange={handleShippingChange} // ✅ This now accepts tax as third parameter
        selectedShipping={selectedShipping}
        shippingFee={shippingFee}
        taxAmount={taxAmount} // ✅ Pass tax amount to layout
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