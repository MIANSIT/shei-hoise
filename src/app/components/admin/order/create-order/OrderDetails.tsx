"use client";
import ProductRow from "./ProductRow";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";

export interface Product {
  id: string;
  quantity: number;
}

interface OrderDetailsProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  allProducts: ProductWithVariants[];
}

export default function OrderDetails({
  products,
  setProducts,
  allProducts,
}: OrderDetailsProps) {
  const handleProductChange = (rowIndex: number, selectedId: string) => {
    setProducts((prev) =>
      prev.map((p, index) =>
        index === rowIndex ? { ...p, id: selectedId } : p
      )
    );
  };

  const handleQuantityChange = (rowIndex: number, value: number) => {
    setProducts((prev) =>
      prev.map((p, index) =>
        index === rowIndex ? { ...p, quantity: value } : p
      )
    );
  };

  const handleRemove = (rowIndex: number) => {
    setProducts((prev) => prev.filter((_, index) => index !== rowIndex));
  };

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, { id: "", quantity: 1 }]);
  };

  const allProductsForRow = allProducts.map((p) => ({
    id: p.id,
    title: p.name,
    currentPrice: p.discounted_price ?? p.base_price ?? 0,
    stock: 999,
    images: p.images || [],
  }));

  return (
    <div>
      <CardTitle className="mb-4">Order Details</CardTitle>

      <div className="space-y-4">
        {products.map((product, index) => (
          <ProductRow
            key={index}
            rowIndex={index}
            product={product}
            allProducts={allProductsForRow}
            onProductChange={handleProductChange}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <div className="pt-4">
        <Button
          variant="outline"
          onClick={handleAddProduct}
          disabled={allProducts.length === 0}
        >
          + Add Product
        </Button>
      </div>
    </div>
  );
}
