"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import Image from "next/image";

interface ProductItem {
  id: number;
  title: string;
  currentPrice: string;
  stock: number;
  images: string[];
}

interface ProductRowProps {
  rowIndex: number;
  product: { id: number; quantity: number };
  allProducts: ProductItem[];
  onProductChange: (rowIndex: number, selectedId: number) => void;
  onQuantityChange: (rowIndex: number, value: number) => void;
  onRemove: (rowIndex: number) => void;
}

export default function ProductRow({
  rowIndex,
  product,
  allProducts,
  onProductChange,
  onQuantityChange,
  onRemove,
}: ProductRowProps) {
  const selectedProduct = allProducts.find((p) => p.id === product.id);
  const total = selectedProduct
    ? Number(selectedProduct.currentPrice) * product.quantity
    : 0;

  return (
    <div className="border border-white/20 rounded-md p-4  space-y-3">
      <Select
        onValueChange={(val) => onProductChange(rowIndex, Number(val))}
        value={product.id !== 0 ? product.id.toString() : ""}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          {allProducts.map((p) => (
            <SelectItem key={p.id} value={p.id.toString()}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-4">
        <div className="w-20">
          <Input
            type="number"
            min={1}
            value={product.quantity}
            onChange={(e) =>
              onQuantityChange(rowIndex, Number(e.target.value))
            }
            className="w-full "
          />
        </div>

        <div className="flex-1 text-sm  space-y-1">
          <div>
            <span className="font-medium">Unit Price:</span>{" "}
            {selectedProduct ? `৳${selectedProduct.currentPrice}` : "-"}
          </div>
          <div>
            <span className="font-medium">Stock:</span>{" "}
            {selectedProduct ? selectedProduct.stock : "-"}
          </div>
        </div>

        {selectedProduct && (
          <div className="w-14 h-14 flex-shrink-0 relative">
            <Image
              src={selectedProduct.images?.[0] || "/placeholder.png"}
              alt={selectedProduct.title}
              fill
              className="object-cover rounded"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 text-sm">
        <div className="font-medium">Total: ৳{total}</div>
        <button
          onClick={() => onRemove(rowIndex)}
          className="text-red-400 hover:text-red-500"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
