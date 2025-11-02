"use client";
import { useSearchParams } from "next/navigation";
import { parseConfirmOrder } from "@/lib/utils/parseConfirmOrder";

export default function ConfirmOrderPage() {
  const searchParams = useSearchParams();
  const products = searchParams.getAll("product");

  console.log(products);

  const parsedProducts = parseConfirmOrder(products);
  console.log(parsedProducts);

  return (
    <div>
      <h2>Confirm Order</h2>
      {parsedProducts.map((p, i) => (
        <>
          Product {i + 1}:<div key={i}>Product Id: {p.productId}</div>
          {p.variantId && <div key={i}>VariantId: {p.variantId}</div>}
          <div key={i}>Quantity: {p.quantity}</div>
          <br />
        </>
      ))}
    </div>
  );
}
