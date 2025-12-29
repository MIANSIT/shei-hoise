/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import UnifiedCheckoutLayout from "../../components/products/checkout/UnifiedCheckoutLayout";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useOrderProcess } from "@/lib/hook/useOrderProcess";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { useSupabaseAuth } from "@/lib/hook/userCheckAuth";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { AnimatePresence } from "framer-motion";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { useUnifiedCartData } from "@/lib/hook/useUnifiedCartData";

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

  const { processOrder, loading: orderLoading } = useOrderProcess(storeSlug);

  const { storeData } = useInvoiceData({ storeSlug });
  const { session } = useSupabaseAuth();
  const { customer } = useCurrentCustomer(storeSlug);

  async function getConfirmOrderToken(token: string) {
    const res = await fetch(`/api/get-confirm-order?t=${token}`, {
      cache: "no-store",
    });

    const json = await res.json();
    console.log("🔑 Confirm Order Token Data:", json);
    if (!res.ok) {
      throw new Error(json.error || "Invalid or expired order link");
    }

    return json.data;
  }

  /* ---------------- FETCH REDIS TOKEN ---------------- */
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const data = await getConfirmOrderToken(token);
        console.log("✅ Fetched token data:", data);
        setTokenData(data);
      } catch (err: any) {
        notify.error(err.message);
        router.push(`/${storeSlug}`);
      } finally {
        setLoadingToken(false);
      }
    })();
  }, [token, storeSlug]);

  /* ---------------- SHIPPING ---------------- */
  const handleShippingChange = (method: string, fee: number) => {
    setSelectedShipping(method);
    setShippingFee(fee);
  };

  // /* ---------------- CREATE TEMP INVOICE ---------------- */
  // const buildInvoiceData = (
  //   values: CustomerCheckoutFormValues,
  //   customerId: string,
  //   result: any
  // ): StoreOrder => {
  //   const orderItems: OrderItem[] = tokenData.products.map((item: any) => ({
  //     id: crypto.randomUUID(),
  //     product_id: item.productId,
  //     variant_id: item.variantId,
  //     quantity: item.quantity,
  //     unit_price: item.displayPrice,
  //     total_price: item.displayPrice * item.quantity,
  //     product_name: item.productName,
  //   }));

  //   return {
  //     id: result.orderId,
  //     order_number: result.orderNumber,
  //     customer_id: customerId,
  //     store_id: storeData!.id,
  //     status: OrderStatus.PENDING,
  //     subtotal: tokenData.calculations.subtotal,
  //     tax_amount: taxAmount,
  //     shipping_fee: shippingFee,
  //     total_amount: tokenData.calculations.totalPrice + shippingFee + taxAmount,
  //     currency: tokenData.currency,
  //     payment_status: PaymentStatus.PENDING,
  //     payment_method: "cod",
  //     shipping_address: {
  //       customer_name: values.name,
  //       phone: values.phone,
  //       address: values.shippingAddress,
  //       city: values.city,
  //       country: values.country,
  //     },
  //     billing_address: {
  //       customer_name: values.name,
  //       phone: values.phone,
  //       address: values.shippingAddress,
  //       city: values.city,
  //       country: values.country,
  //     },
  //     created_at: new Date().toISOString(),
  //     updated_at: new Date().toISOString(),
  //     order_items: orderItems,
  //   };
  // };

  /* ---------------- SUBMIT ---------------- */
  const handleCheckoutSubmit = async (values: CustomerCheckoutFormValues) => {
    if (!selectedShipping) {
      return notify.error("Select shipping method");
    }

    setIsProcessing(true);

    try {
      const customerId = customer?.id!;
      const formDataWithShipping = {
        ...values,
        shippingMethod: selectedShipping,
        shippingFee,
        taxAmount,
      };
      const result = await processOrder(
        formDataWithShipping,
        customerId,
        "cod",
        selectedShipping,
        shippingFee,
        tokenData.products,
        tokenData.calculations,
        taxAmount
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // setInvoiceData(buildInvoiceData(values, customerId, result));
      setShowInvoice(true);
      notify.success("Order placed successfully!");
    } catch (err: any) {
      notify.error(err.message || "Order failed");
    } finally {
      setIsProcessing(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loadingToken) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        Loading order...
      </div>
    );
  }

  const {
    cartItems,
    calculations,
    loading: cartLoading,
    error: cartError,
  } = useUnifiedCartData({
    storeSlug: tokenData?.store_slug,
    tokenData: tokenData,
    useZustand: false,
  });

  return (
    <>
      <UnifiedCheckoutLayout
        storeSlug={storeSlug}
        cartItems={cartItems}
        calculations={calculations}
        loading={orderLoading}
        error={null}
        onCheckout={handleCheckoutSubmit}
        onShippingChange={handleShippingChange}
        selectedShipping={selectedShipping}
        shippingFee={shippingFee}
        taxAmount={taxAmount}
        isProcessing={isProcessing}
        mode='confirm'
      />

      <AnimatePresence>
        {showInvoice && invoiceData && (
          <AnimatedInvoice
            isOpen
            onClose={() => router.push(`/${storeSlug}/order-status`)}
            orderData={invoiceData}
          />
        )}
      </AnimatePresence>
    </>
  );
}
