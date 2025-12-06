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
import { supabase } from "@/lib/supabase";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";

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
  const [taxAmount, setTaxAmount] = useState<number>(0); // ✅ Fixed tax amount from store
  
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

  // ✅ Fetch tax amount from store settings (fixed amount)
  useEffect(() => {
    const fetchTaxAmount = async () => {
      try {
        const storeId = await getStoreIdBySlug(validatedStoreSlug);
        if (storeId) {
          const storeSettings = await getStoreSettings(storeId);
          if (storeSettings && storeSettings.tax_rate) {
            setTaxAmount(storeSettings.tax_rate); // Set fixed tax amount
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

  // Add validation effect
  useEffect(() => {
    if (!validatedStoreSlug) {
      console.error("❌ Invalid store slug:", store_slug);
      notify.error("Invalid store URL. Please check the store link.");
      router.push("/");
    }
  }, [validatedStoreSlug, store_slug, notify, router]);

  // ✅ Simplified: Only handle shipping change, tax is fixed
  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  const handleCheckoutSubmit = async (values: CustomerCheckoutFormValues) => {
    console.log("🔄 Confirm order form submitted with tax:", taxAmount);

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
        taxAmount: taxAmount, // ✅ Include fixed tax amount
      };

      let storeCustomerId: string | undefined;

      // ✅ User is already logged in
      if (isUserLoggedIn && currentUser) {
        console.log("✅ User is logged in, finding store customer record");
        
        const { data: storeCustomer, error: storeCustomerError } = await supabase
          .from("store_customers")
          .select("id, profile_id")
          .eq("auth_user_id", currentUser.id)
          .maybeSingle();

        if (storeCustomer) {
          storeCustomerId = storeCustomer.id;

          if (storeCustomer.profile_id) {
            await updateCustomerProfile(storeCustomer.profile_id, values);
          }
        }
      }

      // ✅ User is NOT logged in
      if (!isUserLoggedIn) {
        const existingCustomer = await getCustomerByEmail(values.email, validatedStoreSlug);
        
        if (existingCustomer) {
          storeCustomerId = existingCustomer.id;

          if (existingCustomer.profile_id) {
            await updateCustomerProfile(existingCustomer.profile_id, values);
          } else {
            await createCustomerProfile(existingCustomer.id, values);
          }

          if (!existingCustomer.auth_user_id && values.password) {
            setIsCreatingAccount(true);
            try {
              const { data: authData } = await supabase.auth.signUp({
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

              if (authData?.user) {
                await supabase
                  .from("store_customers")
                  .update({
                    auth_user_id: authData.user.id,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existingCustomer.id);
              }
            } catch (authError: any) {
              console.error("❌ Auth setup error:", authError);
            } finally {
              setIsCreatingAccount(false);
            }
          }
        } else {
          setIsCreatingAccount(true);
          try {
            const customerData = {
              ...values,
              store_slug: validatedStoreSlug,
            };

            const customerResult = await createCheckoutCustomer(customerData);
            
            if (customerResult.success) {
              storeCustomerId = customerResult.customerId;
            } else {
              throw new Error(customerResult.error || "Failed to create customer");
            }
          } catch (error: any) {
            console.error("❌ Customer creation failed:", error);
            notify.error(error.message || "Failed to create customer account");
            setIsProcessing(false);
            setIsCreatingAccount(false);
            return;
          } finally {
            setIsCreatingAccount(false);
          }
        }
      }

      // ✅ Process the order with fixed tax amount
      console.log("📦 Processing order with fixed tax:", taxAmount);

      const result = await processOrder(
        formDataWithShipping,
        storeCustomerId,
        "cod",
        selectedShipping,
        shippingFee,
        cartItems,
        calculations,
        taxAmount // ✅ Pass fixed tax amount
      );

      if (result.success) {
        notify.success("Order placed successfully!");
        clearFormData();
        setTimeout(() => router.push(`/${validatedStoreSlug}/order-status`), 2000);
      } else {
        notify.error(result.error || "Failed to place order");
      }

    } catch (error: any) {
      console.error("❌ Confirm order error:", error);
      notify.error(error.message || "Failed to process order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions
  const updateCustomerProfile = async (profileId: string, values: CustomerCheckoutFormValues) => {
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

  const createCustomerProfile = async (storeCustomerId: string, values: CustomerCheckoutFormValues) => {
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
      onShippingChange={handleShippingChange} // ✅ Simplified, no tax parameter
      selectedShipping={selectedShipping}
      shippingFee={shippingFee}
      taxAmount={taxAmount} // ✅ Pass fixed tax amount
      isProcessing={isSubmitting}
      mode="confirm"
    />
  );
}