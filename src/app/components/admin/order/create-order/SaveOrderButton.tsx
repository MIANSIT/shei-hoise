"use client";
import { Button } from "@/components/ui/button";
import { Product } from "./CreateOrder";

// Reuse the customer info type
export interface CustomerInfoData {
  name: string;
  address: string;
  contact: string;
  deliveryMethod: string;
}

interface SaveOrderButtonProps {
  orderId: string;
  products: Product[];
  customerInfo: CustomerInfoData;
  discount: number;
  deliveryCost: number; // ✅ Added here
  status: string;
}

export default function SaveOrderButton({
  orderId,
  products,
  customerInfo,
  discount,
  deliveryCost, // ✅ Added here
  status,
}: SaveOrderButtonProps) {
  const handleSave = async () => {
    const orderData = {
      orderId,
      products,
      customerInfo,
      discount,
      deliveryCost, // ✅ Added here
      status,
    };
    console.log("Order to save:", orderData);

    // Future backend API call
    // const response = await fetch("/api/orders", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(orderData),
    // });
    // const data = await response.json();
    // console.log("Order saved with ID:", data.orderId);
  };

  return <Button onClick={handleSave}>Save Order</Button>;
}
