"use client";

import ProductRow from "./ProductRow";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { dummyProducts } from "@/lib/store/dummyProducts";

export interface Product {
  id: number;
  quantity: number;
}

interface OrderDetailsProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function OrderDetails({
  products,
  setProducts,
}: OrderDetailsProps) {
  const handleProductChange = (rowIndex: number, selectedId: number) => {
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
    setProducts((prev) => [...prev, { id: 0, quantity: 1 }]);
  };

  const allProductsForRow = dummyProducts.map((p) => ({
    id: p.id,
    title: p.title,
    currentPrice: p.currentPrice,
    stock: p.stock,
    images: p.images,
  }));

  return (
    <div>
      <CardTitle className="mb-4">Order Details</CardTitle>

      <div className="space-y-4">
        {products.map((product, index) => (
          <ProductRow
            key={index}
            rowIndex={index} // ✅ pass row index
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
          className="border-white/30 text-white hover:bg-white/10"
          onClick={handleAddProduct}
          disabled={dummyProducts.length === 0}
        >
          + Add Product
        </Button>
      </div>
    </div>
  );
}
