"use client";
import { useState, useEffect } from "react";
import CustomerInfo from "./CustomerInfo";
import OrderDetails from "./OrderDetails";
import OrderSummary from "./OrderSummary";
import SaveOrderButton from "./SaveOrderButton";
import { Card } from "@/components/ui/card";
import { dummyProducts } from "@/lib/store/dummyProducts";

export interface Product {
  id: number;
  quantity: number;
}

export default function CreateOrder() {
  // --- Products ---
  const [products, setProducts] = useState<Product[]>([]);

  // --- Customer info ---
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    address: "",
    contact: "",
    deliveryMethod: "",
    city: "",
  });

  // --- Discount, delivery cost & status ---
  const [discount, setDiscount] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [status, setStatus] = useState("pending");

  // --- Temporary order ID ---
  const [orderId, setOrderId] = useState("");

  // Generate order ID once
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const sessionCounter = 1; // placeholder
    setOrderId(
      `SHEI${year}${month}${day}${sessionCounter
        .toString()
        .padStart(3, "0")}`
    );
  }, []);

  // Update delivery cost based on city
  useEffect(() => {
    if (customerInfo.city === "inside-dhaka") setDeliveryCost(80);
    else if (customerInfo.city === "outside-dhaka") setDeliveryCost(150);
    else setDeliveryCost(0);
  }, [customerInfo.city]);

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-6">Create Order</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          orderId={orderId}
        />

        <div className="space-y-6">
          {/* Order Details */}
          <OrderDetails products={products} setProducts={setProducts} />

          {/* Order Summary */}
          <OrderSummary
            products={products
              .map((p) => {
                const prod = dummyProducts.find((dp) => dp.id === p.id);
                return prod ? { ...prod, quantity: p.quantity } : null;
              })
              .filter(
                (p): p is NonNullable<typeof p> => p !== null
              )}
            discount={discount}
            setDiscount={setDiscount}
            deliveryCost={deliveryCost}
            setDeliveryCost={setDeliveryCost}
            status={status}
            setStatus={setStatus}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <SaveOrderButton
          orderId={orderId}
          products={products}
          customerInfo={customerInfo}
          discount={discount}
          deliveryCost={deliveryCost}
          status={status}
        />
      </div>
    </Card>
  );
}
