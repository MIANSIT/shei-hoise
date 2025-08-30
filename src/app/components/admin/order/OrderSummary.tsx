"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Product type with quantity
export interface Product {
  id: number;
  title: string;
  category: string;
  currentPrice: string;
  quantity: number;
  images?: string[];
}

interface OrderSummaryProps {
  products: Product[];
  discount: number;
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
  status: string;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
}

export default function OrderSummary({
  products,
  discount,
  setDiscount,
  status,
  setStatus,
}: OrderSummaryProps) {
  const subtotal = products.reduce(
    (sum, p) => sum + Number(p.currentPrice) * p.quantity,
    0
  );
  const dueAmount = subtotal - discount;

  return (
    <div className="mt-6 space-y-4 text-white border-t border-white/20 pt-4">
      <p>Subtotal: ৳{subtotal}</p>

      <div>
        <label className="text-sm">Discount Amount (BDT ৳)</label>
        <Input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="text-sm">Due Amount (BDT ৳)</label>
        <Input type="number" value={dueAmount} readOnly />
      </div>

      <div>
        <label className="text-sm">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Pending" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
