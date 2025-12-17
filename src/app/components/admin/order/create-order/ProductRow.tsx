"use client";
import { Input } from "../../../../../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../../../components/ui/select";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
interface ProductItem {
  id: string;
  title: string;
  currentPrice: number;
  stock: number;
  images?: string[];
}

interface ProductRowProps {
  rowIndex: number;
  product: { id: string; quantity: number };
  allProducts: ProductItem[];
  onProductChange: (rowIndex: number, selectedId: string) => void;
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
  const total = selectedProduct ? selectedProduct.currentPrice * product.quantity : 0;
 const {
    // currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  // const displayCurrency = currencyLoading ? "" : currency ?? "";
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback
  return (
    <div className="border border-white/20 rounded-md p-4 space-y-3">
      <Select
        onValueChange={(val) => onProductChange(rowIndex, val)}
        value={product.id || ""}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          {allProducts.map((p) => (
            <SelectItem key={p.id} value={p.id}>
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
            onChange={(e) => onQuantityChange(rowIndex, Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex-1 text-sm space-y-1">
          <div>
            <span className="font-medium">Unit Price:</span>{" "}
            {selectedProduct ? ` ${displayCurrencyIconSafe}${selectedProduct.currentPrice}` : "-"}
          </div>
          <div>
            <span className="font-medium">Stock:</span>{" "}
            {selectedProduct ? selectedProduct.stock : "-"}
          </div>
        </div>

        {selectedProduct?.images?.[0] && (
          <div className="w-14 h-14 shrink-0 relative">
            <Image
              src={selectedProduct.images[0]}
              alt={selectedProduct.title}
              fill
              className="object-cover rounded"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 text-sm">
        <div className="font-medium">Total:  {displayCurrencyIconSafe}{total}</div>
        <button onClick={() => onRemove(rowIndex)} className="text-red-400 hover:text-red-500">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
