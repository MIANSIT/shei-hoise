/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import UnifiedCheckoutLayout from "../../components/products/checkout/UnifiedCheckoutLayout";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { OrderStatus, PaymentStatus, DeliveryOption } from "@/lib/types/enums";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { AnimatePresence } from "framer-motion";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { CartProductWithDetails } from "@/lib/types/cart";
import { StoreLoadingSkeleton } from "../../components/skeletons/StoreLoadingSkeleton";
import { supabase } from "@/lib/supabase";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";

// Memoized API call function
const getConfirmOrderToken = async (token: string) => {
  const res = await fetch(`/api/get-confirm-order?t=${token}`, {
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Invalid or expired order link");
  }

  return json.data;
};

// Helper function to map string to DeliveryOption enum
const getDeliveryOption = (shippingMethod: string): DeliveryOption => {
  const lowerMethod = shippingMethod.toLowerCase();
  
  if (lowerMethod.includes("pathao")) return DeliveryOption.PATHAO;
  if (lowerMethod.includes("courier")) return DeliveryOption.COURIER;
  if (lowerMethod.includes("inside")) return DeliveryOption.INSIDE_DHAKA;
  if (lowerMethod.includes("outside")) return DeliveryOption.OUTSIDE_DHAKA;
  
  return DeliveryOption.OTHER;
};

// Helper function to transform product data to match CartProductWithDetails type
const transformProductForCart = (product: any) => {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug || `product-${product.id}`,
    base_price: product.base_price,
    discounted_price: product.discounted_price,
    product_images: (product.product_images || []).map((img: any) => ({
      id: img.id || `img-${Date.now()}-${Math.random()}`,
      image_url: img.image_url,
      is_primary: img.is_primary || false,
    })),
  };
};

// Helper function to transform variant data with EXACT type matching
const transformVariantForCart = (variant: any) => {
  if (!variant) return null;
  
  const basePrice = variant.base_price !== undefined ? variant.base_price : null;
  const discountedPrice = variant.discounted_price !== undefined ? variant.discounted_price : null;
  const discountAmount = calculateDiscountAmount(variant);
  
  return {
    id: variant.id,
    variant_name: variant.variant_name || null,
    base_price: basePrice,
    discounted_price: discountedPrice,
    discount_amount: discountAmount,
    color: variant.color || null,
    size: variant.size || undefined,
    material: variant.material || undefined,
    is_active: variant.is_active !== undefined ? variant.is_active : true,
    product_images: (variant.product_images || []).map((img: any) => ({
      id: img.id || `img-${Date.now()}-${Math.random()}`,
      image_url: img.image_url,
      is_primary: img.is_primary || false,
    })),
    product_inventory: (variant.product_inventory || []).map((inv: any) => ({
      quantity_available: inv.quantity_available || 0,
      quantity_reserved: inv.quantity_reserved || 0,
    })),
  };
};

// Helper function to calculate discount amount
const calculateDiscountAmount = (variant: any): number | null => {
  if (!variant || variant.base_price === undefined || variant.discounted_price === undefined) {
    return null;
  }
  
  const basePrice = variant.base_price || 0;
  const discountedPrice = variant.discounted_price || 0;
  
  if (basePrice > 0 && discountedPrice > 0 && basePrice > discountedPrice) {
    return basePrice - discountedPrice;
  }
  
  return null;
};

export default function ConfirmOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const notify = useSheiNotification();

  const storeSlug = params.store_slug as string;
  const token = searchParams.get("t");

  const [tokenData, setTokenData] = useState<any>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [taxAmount] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<StoreOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cartItems, setCartItems] = useState<CartProductWithDetails[]>([]);
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    totalPrice: 0,
    totalItems: 0,
    totalDiscount: 0,
    items: [] as CartProductWithDetails[],
  });
  const [currency, setCurrency] = useState("");

  const { processOrder, loading: orderLoading } = useOrderProcess(storeSlug);
  const { storeData, loading: storeLoading } = useInvoiceData({ storeSlug });
  const { session } = useSupabaseAuth();
  const { customer } = useCurrentCustomer(storeSlug);

  // Use refs to prevent re-fetching
  const hasFetchedTokenRef = useRef(false);
  const hasFetchedProductsRef = useRef(false);

  // Fetch token data ONLY ONCE when token changes
  useEffect(() => {
    if (!token || hasFetchedTokenRef.current) return;

    const fetchTokenData = async () => {
      try {
        setLoadingToken(true);
        const data = await getConfirmOrderToken(token);
        setTokenData(data);
        hasFetchedTokenRef.current = true;
      } catch (err: any) {
        console.error("❌ Error fetching token data:", err);
        notify.error(err.message);
        router.push(`/${storeSlug}`);
      } finally {
        setLoadingToken(false);
      }
    };

    fetchTokenData();
  }, [token, storeSlug, router, notify]);

  // Fetch product details ONLY ONCE when tokenData is available
  useEffect(() => {
    if (!tokenData || hasFetchedProductsRef.current) return;

    const fetchProductDetails = async () => {
      try {
        const { data: storeSettings, error: settingsError } = await supabase
          .from("store_settings")
          .select("currency")
          .eq("store_id", tokenData.store_id)
          .single();

        if (settingsError) {
          console.error("❌ Error fetching store settings:", settingsError);
        }

        setCurrency(storeSettings?.currency || "BDT");

        // Fetch products with variants - SIMPLIFIED APPROACH
        const productIds = tokenData.products.map((p: any) => p.product_id);
        if (productIds.length === 0) {
          throw new Error("No product IDs found in token data");
        }

        // Fetch products with ALL FIELDS - simplified query
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", tokenData.store_id)
          .in("id", productIds);

        if (productsError) {
          console.error("❌ Error fetching products:", productsError);
          throw new Error(`Failed to fetch products: ${productsError.message}`);
        }
        if (!products || products.length === 0) {
          throw new Error("No products found for the given IDs");
        }

        // Fetch product images separately
        const { data: productImages, error: imagesError } = await supabase
          .from("product_images")
          .select("*")
          .in("product_id", productIds);

        if (imagesError) {
          console.error("❌ Error fetching product images:", imagesError);
        }

        // Fetch product inventory separately
        const { data: productInventory, error: inventoryError } = await supabase
          .from("product_inventory")
          .select("*")
          .in("product_id", productIds);

        if (inventoryError) {
          console.error("❌ Error fetching product inventory:", inventoryError);
        }

        // Get all variant IDs from token data
        const variantIds = tokenData.products
          .filter((p: any) => p.variant_id)
          .map((p: any) => p.variant_id);
        let variants: any[] = [];
        let variantImages: any[] = [];
        let variantInventory: any[] = [];

        if (variantIds.length > 0) {
          // Fetch variants
          const { data: variantsData, error: variantsError } = await supabase
            .from("product_variants")
            .select("*")
            .in("id", variantIds);

          if (variantsError) {
            console.error("❌ Error fetching variants - details:", {
              error: variantsError,
              message: variantsError.message,
              code: variantsError.code,
              details: variantsError.details,
              hint: variantsError.hint
            });
          } else {
            variants = variantsData || [];
          }

          // Fetch variant images
          const { data: vImages, error: vImagesError } = await supabase
            .from("product_images")
            .select("*")
            .in("variant_id", variantIds);

          if (vImagesError) {
            console.error("❌ Error fetching variant images:", vImagesError);
          } else {
            variantImages = vImages || [];
          }

          // Fetch variant inventory
          const { data: vInventory, error: vInventoryError } = await supabase
            .from("product_inventory")
            .select("*")
            .in("variant_id", variantIds);

          if (vInventoryError) {
            console.error("❌ Error fetching variant inventory:", vInventoryError);
          } else {
            variantInventory = vInventory || [];
          }
        }

        // Process cart items
        const enrichedItems: CartProductWithDetails[] = [];
        let subtotal = 0;
        let totalDiscount = 0;
        let totalItems = 0;

        for (const tokenItem of tokenData.products) {
          const product = products.find((p: any) => p.id === tokenItem.product_id);
          if (!product) {
            console.warn(`⚠️ Product not found: ${tokenItem.product_id}`);
            continue;
          }

          // Get product images
          const prodImages = (productImages || []).filter(
            (img: any) => img.product_id === product.id && (!img.variant_id || img.variant_id === null)
          );

          // Get product inventory
          const prodInventory = (productInventory || []).filter(
            (inv: any) => inv.product_id === product.id && (!inv.variant_id || inv.variant_id === null)
          );

          let variant: any = null;
          if (tokenItem.variant_id) {
            variant = variants.find(
              (v: any) => v.id === tokenItem.variant_id
            );

            if (variant) {
              // Get variant images
              variant.product_images = (variantImages || []).filter(
                (img: any) => img.variant_id === variant.id
              );

              // Get variant inventory
              variant.product_inventory = (variantInventory || []).filter(
                (inv: any) => inv.variant_id === variant.id
              );
            } else {
              console.warn(`⚠️ Variant not found: ${tokenItem.variant_id} for product ${product.id}`);
            }
          }

          // Calculate prices - handle null/undefined safely
          const variantPrice = variant?.discounted_price || variant?.base_price;
          const productPrice = product.discounted_price || product.base_price;
          const displayPrice = (variantPrice !== undefined ? variantPrice : productPrice !== undefined ? productPrice : 0) || 0;
          const originalPrice = (variant?.base_price !== undefined ? variant.base_price : product.base_price !== undefined ? product.base_price : 0) || 0;

          // Calculate discount percentage
          const discountPercentage = originalPrice > displayPrice
            ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
            : 0;

          // Get stock - handle null/undefined safely
          const variantStock = variant?.product_inventory?.[0]?.quantity_available;
          const productStock = prodInventory?.[0]?.quantity_available;
          const stock = (variantStock !== undefined ? variantStock : productStock !== undefined ? productStock : 0) || 0;

          // Get image URL
          const variantImage = variant?.product_images?.find((img: any) => img.is_primary)?.image_url || 
                              variant?.product_images?.[0]?.image_url;
          const productImage = prodImages?.find((img: any) => img.is_primary)?.image_url || 
                              prodImages?.[0]?.image_url;
          const imageUrl = variantImage || productImage || "/placeholder.png";

          // Product name
          const productName = variant
            ? `${product.name}${variant.variant_name ? ` - ${variant.variant_name}` : ''}`
            : product.name;

          // Calculate item totals
          const itemSubtotal = displayPrice * tokenItem.quantity;
          const itemDiscount = Math.max(0, (originalPrice - displayPrice)) * tokenItem.quantity;

          subtotal += itemSubtotal;
          totalDiscount += itemDiscount;
          totalItems += tokenItem.quantity;

          // Prepare product object with images
          const productWithImages = {
            ...product,
            product_images: prodImages.map((img: any) => ({
              id: img.id,
              image_url: img.image_url,
              is_primary: img.is_primary || false,
            })),
          };

          // Prepare variant object with all required properties
          const variantWithData = variant ? {
            ...variant,
            product_images: variant.product_images || [],
            product_inventory: variant.product_inventory || [],
          } : null;

          enrichedItems.push({
            productId: product.id,
            variantId: variant?.id || null,
            quantity: tokenItem.quantity,
            storeSlug: tokenData.store_slug,
            product: transformProductForCart(productWithImages),
            variant: transformVariantForCart(variantWithData),
            displayPrice,
            originalPrice,
            discountPercentage,
            stock,
            isOutOfStock: stock <= 0,
            imageUrl,
            productName,
          });
        }
        if (enrichedItems.length === 0) {
          throw new Error("Failed to load any products from the order link");
        }

        setCartItems(enrichedItems);
        setCalculations({
          items: enrichedItems,
          subtotal,
          totalPrice: subtotal,
          totalItems,
          totalDiscount,
        });
        
        hasFetchedProductsRef.current = true;
      } catch (error) {
        console.error("❌ Error fetching product details:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        notify.error("Failed to load order details. Please try again.");
      }
    };

    fetchProductDetails();
  }, [tokenData, storeSlug, notify]);

  // NEW: Handle quantity change for confirm-order page
  const handleQuantityChange = useCallback((
    productId: string,
    variantId: string | null,
    newQuantity: number
  ) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.productId === productId && item.variantId === variantId) {
          // Update the quantity
          const updatedItem = {
            ...item,
            quantity: Math.max(1, Math.min(newQuantity, 999)) // Clamp between 1 and 999
          };
          
          return updatedItem;
        }
        return item;
      });
      
      // Recalculate totals
      const newCalculations = calculateTotals(updatedItems);
      setCalculations(newCalculations);
      
      return updatedItems;
    });
  }, []);

  // NEW: Handle remove item for confirm-order page
  const handleRemoveItem = useCallback((productId: string, variantId: string | null) => {
    setCartItems(prevItems => {
      const filteredItems = prevItems.filter(item => 
        !(item.productId === productId && item.variantId === variantId)
      );
      
      // Recalculate totals
      const newCalculations = calculateTotals(filteredItems);
      setCalculations(newCalculations);
      
      return filteredItems;
    });
    
    notify.info("Item removed from order");
  }, [notify]);

  // NEW: Helper function to calculate totals
  const calculateTotals = (items: CartProductWithDetails[]) => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalItems = 0;

    items.forEach(item => {
      const itemSubtotal = item.displayPrice * item.quantity;
      const itemDiscount = Math.max(0, (item.originalPrice - item.displayPrice)) * item.quantity;
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalItems += item.quantity;
    });

    return {
      items,
      subtotal,
      totalPrice: subtotal,
      totalItems,
      totalDiscount,
    };
  };

  /* ---------------- SHIPPING ---------------- */
  const handleShippingChange = useCallback((method: string, fee: number) => {
    setSelectedShipping(method);
    setShippingFee(fee);
  }, []);

  /* ---------------- CREATE TEMP INVOICE ---------------- */
  const buildInvoiceData = useCallback(
    (
      values: CustomerCheckoutFormValues,
      customerId: string,
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
        variant_details: item.variant
          ? {
              variant_name: item.variant.variant_name,
              base_price: item.variant.base_price,
              discounted_price: item.variant.discounted_price,
            }
          : null,
        products: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              product_images: item.product.product_images || [],
            }
          : undefined,
        product_variants: item.variant
          ? {
              id: item.variant.id,
              variant_name: item.variant.variant_name,
              product_images: item.variant.product_images || [],
            }
          : undefined,
      }));

      const orderId = result.orderId || `order-${Date.now()}`;
      const orderNumber =
        result.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

      return {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId || null, // ✅ Allow null for guest orders
        store_id: storeData!.id,
        status: OrderStatus.PENDING,
        subtotal: calculations.subtotal,
        tax_amount: taxAmount,
        shipping_fee: shippingFee,
        total_amount: calculations.subtotal + shippingFee + taxAmount,
        currency: currency,
        payment_status: PaymentStatus.PENDING,
        payment_method: "cod",
        shipping_address: {
          customer_name: values.name,
          phone: values.phone,
          address: values.shippingAddress,
          city: values.city,
          country: values.country,
        },
        billing_address: {
          customer_name: values.name,
          phone: values.phone,
          address: values.shippingAddress,
          city: values.city,
          country: values.country,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        order_items: orderItems,
        customers: customerId ? {
          id: customerId,
          first_name: values.name.split(" ")[0] || values.name,
          email: values.email,
          phone: values.phone,
        } : null, // ✅ Allow null for guest orders
        stores: storeData
          ? {
              id: storeData.id,
              store_name: storeData.store_name,
              store_slug: storeData.store_slug,
              business_address: storeData.business_address || "",
              contact_phone: storeData.contact_phone || "",
              contact_email: storeData.contact_email || "",
            }
          : {
              id: "temp-store",
              store_name: storeSlug,
              store_slug: storeSlug,
              business_address: "",
              contact_phone: "",
              contact_email: "",
            },
        delivery_option: getDeliveryOption(selectedShipping),
        cancel_note: undefined,
        discount_amount: undefined,
        additional_charges: undefined,
        notes: null,
      };
    },
    [cartItems, calculations, storeData, storeSlug, taxAmount, shippingFee, selectedShipping, currency]
  );

  /* ---------------- FIND OR CREATE CUSTOMER WITH LINKS ---------------- */
  const findOrCreateCustomerWithLinks = useCallback(async (
    values: CustomerCheckoutFormValues
  ): Promise<string | null> => {
    try {
      const storeId = await getStoreIdBySlug(storeSlug);
      if (!storeId) {
        console.error("❌ Store not found for slug:", storeSlug);
        return null;
      }

      // Check if customer exists by email (global search, not store-specific)
      const { data: existingCustomers, error: findError } = await supabase
        .from("store_customers")
        .select("id, email, auth_user_id")
        .eq("email", values.email.toLowerCase())
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        console.error("❌ Error finding customer:", findError);
      }

      let customerId: string;

      if (existingCustomers) {
        // Customer exists globally
        customerId = existingCustomers.id;
        const { data: existingLink, error: linkError } = await supabase
          .from("store_customer_links")
          .select("id")
          .eq("customer_id", customerId)
          .eq("store_id", storeId)
          .maybeSingle();

        if (linkError) {
          console.error("❌ Error checking customer link:", linkError);
        }

        // Create link if it doesn't exist
        if (!existingLink) {
          const { error: createLinkError } = await supabase
            .from("store_customer_links")
            .insert({
              customer_id: customerId,
              store_id: storeId,
            });

          if (createLinkError) {
            console.error("❌ Error creating customer link:", createLinkError);
          }
        }
      } else {
        // For logged-in users
        let authUserId = null;
        if (session?.user?.email === values.email.toLowerCase()) {
          authUserId = session.user.id;
        }

        const { data: newCustomer, error: createError } = await supabase
          .from("store_customers")
          .insert({
            name: values.name,
            email: values.email.toLowerCase(),
            phone: values.phone,
            auth_user_id: authUserId,
          })
          .select("id")
          .single();

        if (createError) {
          console.error("❌ Error creating customer:", createError);
          return null;
        }

        customerId = newCustomer.id;
        const { error: linkError } = await supabase
          .from("store_customer_links")
          .insert({
            customer_id: customerId,
            store_id: storeId,
          });

        if (linkError) {
          console.error("❌ Error creating customer link:", linkError);
        }
      }
      const { data: existingProfile, error: profileFindError } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("store_customer_id", customerId)
        .maybeSingle();

      if (profileFindError) {
        console.error("❌ Error finding profile:", profileFindError);
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("customer_profiles")
          .update({
            address: values.shippingAddress,
            city: values.city,
            postal_code: values.postCode,
            country: values.country,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProfile.id);

        if (updateError) {
          console.error("❌ Error updating profile:", updateError);
        }
      } else {
        // Create new profile
        const { data: newProfile, error: createProfileError } = await supabase
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

        if (createProfileError) {
          console.error("❌ Error creating profile:", createProfileError);
        } else if (newProfile) {
          // Update customer with profile ID
          await supabase
            .from("store_customers")
            .update({ profile_id: newProfile.id })
            .eq("id", customerId);
        }
      }

      // Handle auth creation for guest users with password
      if (values.password && values.password.trim() !== "" && values.password !== "empty" && !session?.user) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: values.email.toLowerCase(),
            password: values.password,
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
            console.error("❌ Error creating auth account:", authError);
            // Continue anyway - customer exists even if auth fails
          } else if (authData?.user?.id) {
            // Update customer with auth user ID
            await supabase
              .from("store_customers")
              .update({ auth_user_id: authData.user.id })
              .eq("id", customerId);
          }
        } catch (authError) {
          console.error("❌ Auth creation error:", authError);
        }
      }

      return customerId;
    } catch (error) {
      console.error("❌ Error in findOrCreateCustomerWithLinks:", error);
      return null;
    }
  }, [storeSlug, session]);

  /* ---------------- SUBMIT ---------------- */
  const handleCheckoutSubmit = useCallback(
    async (values: CustomerCheckoutFormValues) => {
      if (!selectedShipping) {
        notify.error("Please select a shipping method");
        return;
      }

      setIsProcessing(true);

      try {
        // Get or create customer with links
        let customerId: string | null = null;
        
        // First, try to use the current customer if logged in
        if (session?.user && customer?.id) {
          customerId = customer.id;
        }
        
        // If no customer found, create/get one
        if (!customerId) {
          customerId = await findOrCreateCustomerWithLinks(values);
        }

        if (!customerId) {
          throw new Error("Failed to create or find customer");
        }

        const formDataWithShipping = {
          ...values,
          shippingMethod: selectedShipping,
          shippingFee,
          taxAmount,
        };

        const result = await processOrder(
          formDataWithShipping,
          customerId || undefined, // Pass undefined if no customer ID
          "cod",
          selectedShipping,
          shippingFee,
          cartItems,
          calculations,
          taxAmount
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        const invoice = buildInvoiceData(values, customerId || "guest", result);
        setInvoiceData(invoice);
        setShowInvoice(true);
        notify.success("Order placed successfully!");
      } catch (err: any) {
        console.error("Order placement error:", err);
        notify.error(err.message || "Failed to place order");
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedShipping, session, customer, findOrCreateCustomerWithLinks, shippingFee, taxAmount, processOrder, cartItems, calculations, buildInvoiceData, notify]
  );

  // Memoized loading state
  const isLoadingOverall = useMemo(() => {
    return loadingToken || storeLoading || !tokenData || cartItems.length === 0;
  }, [loadingToken, storeLoading, tokenData, cartItems]);

  /* ---------------- UI ---------------- */
  if (loadingToken) {
    return <StoreLoadingSkeleton />;
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p>The order link has expired or is invalid.</p>
          <button
            onClick={() => router.push(`/${storeSlug}`)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnifiedCheckoutLayout
        storeSlug={storeSlug}
        cartItems={cartItems}
        calculations={calculations}
        loading={isLoadingOverall}
        error={null}
        onCheckout={handleCheckoutSubmit}
        onShippingChange={handleShippingChange}
        selectedShipping={selectedShipping}
        shippingFee={shippingFee}
        taxAmount={taxAmount}
        isProcessing={isProcessing || orderLoading}
        mode="confirm"
        // NEW: Pass the handlers for confirm mode
        onQuantityChange={handleQuantityChange}
        onRemoveItem={handleRemoveItem}
      />

      <AnimatePresence>
        {showInvoice && invoiceData && (
          <AnimatedInvoice
            isOpen={showInvoice}
            onClose={() => {
              setShowInvoice(false);
              router.push(`/${storeSlug}/order-status`);
            }}
            orderData={invoiceData}
            showCloseButton={true}
          />
        )}
      </AnimatePresence>
    </>
  );
}