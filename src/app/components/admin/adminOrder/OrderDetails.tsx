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
  const handleProductChange = (rowId: number, selectedId: number) => {
    setProducts((prev) =>
      prev.map((p, index) => (index === rowId ? { ...p, id: selectedId } : p))
    );
  };

  const handleQuantityChange = (rowId: number, value: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === rowId ? { ...p, quantity: value } : p))
    );
  };

  const handleRemove = (rowId: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== rowId));
  };

  const handleAddProduct = () => {
    setProducts((prev) => [
      ...prev,
      { id: 0, quantity: 1 }, // id 0 means "no product selected"
    ]);
  };

  // Prepare all products for the select dropdown
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
            key={index} // use index if id might be duplicate
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
          disabled={dummyProducts.length === 0} // disable if no dummy products
        >
          + Add Product
        </Button>
      </div>
    </div>
  );
}
