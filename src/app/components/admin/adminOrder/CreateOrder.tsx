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
  });

  // --- Discount & status ---
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState("pending");

  // --- Temporary order ID ---
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    const sessionCounter = 1; // placeholder counter
    setOrderId(
      `SHEI${year}${month}-${sessionCounter.toString().padStart(2, "0")}`
    );
  }, []);

  return (
    <div className="w-full p-6 text-white bg-transparent">
      <h2 className="text-2xl font-semibold mb-6">Create Order</h2>

      <Card className="bg-transparent border border-white/20 text-white p-6">
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
              products={products.map((p) => {
                const prod = dummyProducts.find((dp) => dp.id === p.id);
                return prod
                  ? { ...prod, quantity: p.quantity }
                  : { ...dummyProducts[0], quantity: p.quantity };
              })}
              discount={discount}
              setDiscount={setDiscount}
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
            status={status}
          />
        </div>
      </Card>
    </div>
  );
}
