"use client";

import { useState, useEffect } from "react";
import CustomerInfo from "./CustomerInfo";
import OrderDetails from "./OrderDetails";
import OrderSummary from "./OrderSummary";
import SaveOrderButton from "./SaveOrderButton";
import { Card } from "@/components/ui/card";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import {
  getProductImages,
  ProductImage,
} from "@/lib/queries/products/getProductImages";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

export interface Product {
  id: string;
  quantity: number;
}

export default function CreateOrder() {
  const { user, loading: userLoading } = useCurrentUser();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithVariants[]>([]);

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    address: "",
    contact: "",
    deliveryMethod: "",
    city: "",
  });

  const [discount, setDiscount] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [status, setStatus] = useState("pending");
  const [orderId, setOrderId] = useState("");

  // Generate order ID
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const sessionCounter = 1;
    setOrderId(
      `SHEI${year}${month}${day}${sessionCounter.toString().padStart(3, "0")}`
    );
  }, []);

  // Delivery cost based on city
  useEffect(() => {
    if (customerInfo.city === "inside-dhaka") setDeliveryCost(80);
    else if (customerInfo.city === "outside-dhaka") setDeliveryCost(150);
    else setDeliveryCost(0);
  }, [customerInfo.city]);
  const storeId = user?.store_id;
  // Fetch products & images once user is loaded
  useEffect(() => {
    if (!storeId) return;

    const fetchProductsAndImages = async () => {
      try {
        const productsFromDB = await getProductsWithVariants(storeId);

        const productIds = productsFromDB.map((p) => p.id);
        const images: ProductImage[] = await getProductImages(productIds);

        const productsWithImages = productsFromDB.map((p) => ({
          ...p,
          images: images
            .filter((img) => img.product_id === p.id && img.is_primary)
            .map((img) => img.image_url),
        }));

        setAllProducts(productsWithImages);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Failed to fetch products or images:", err.message);
        } else {
          console.error("Failed to fetch products or images:", err);
        }
      }
    };

    fetchProductsAndImages();
  }, [user, userLoading]);

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-6">Create Order</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          orderId={orderId}
        />

        <div className="space-y-6">
          <OrderDetails
            products={products}
            setProducts={setProducts}
            allProducts={allProducts}
          />

          <OrderSummary
            products={products
              .map((p) => {
                const prod = allProducts.find((dp) => dp.id === p.id);
                return prod
                  ? {
                      id: prod.id,
                      title: prod.name,
                      currentPrice:
                        prod.discounted_price ?? prod.base_price ?? 0,
                      quantity: p.quantity,
                    }
                  : null;
              })
              .filter((p): p is NonNullable<typeof p> => p !== null)}
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
