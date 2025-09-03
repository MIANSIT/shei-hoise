"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
  deliveryCost: number;
  setDeliveryCost: React.Dispatch<React.SetStateAction<number>>;
  status: string;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
}

export default function OrderSummary({
  products,
  discount,
  setDiscount,
  deliveryCost,
  setDeliveryCost,
  status,
  setStatus,
}: OrderSummaryProps) {
  const subtotal = products.reduce(
    (sum, p) => sum + Number(p.currentPrice) * p.quantity,
    0
  );

  const dueAmount = subtotal - discount + deliveryCost;

  return (
    <div className="mt-6 space-y-4  border-t border-white/20 pt-4">
      <p>Subtotal: ৳{subtotal}</p>

      {/* Discount */}
      <div>
        <label className="text-sm">Discount Amount (BDT ৳)</label>
        <Input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
        />
      </div>

      {/* Delivery Cost */}
      <div>
        <label className="text-sm">Delivery Cost (BDT ৳)</label>
        <Input
          type="number"
          value={deliveryCost}
          onChange={(e) => setDeliveryCost(Number(e.target.value))}
        />
      </div>

      {/* Due Amount */}
      <div>
        <label className="text-sm">Due Amount (BDT ৳)</label>
        <Input type="number" value={dueAmount} readOnly />
      </div>

      {/* Status */}
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
