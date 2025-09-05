"use client";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface CustomerInfoData {
  name: string;
  address: string;
  contact: string;
  deliveryMethod: string;
  city: string; // ✅ Added city
}

interface CustomerInfoProps {
  customerInfo: CustomerInfoData;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfoData>>;
  orderId: string;
}

export default function CustomerInfo({ customerInfo, setCustomerInfo, orderId }: CustomerInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Customer Information</h3>

      <div>
        <label className="text-sm">Order ID</label>
        <Input value={orderId} disabled />
      </div>

      <div>
        <label className="text-sm">Customer Name</label>
        <Input
          placeholder="Customer Name"
          value={customerInfo.name}
          onChange={(e) =>
            setCustomerInfo(prev => ({ ...prev, name: e.target.value }))
          }
        />
      </div>

      <div>
        <label className="text-sm">Customer Address</label>
        <textarea
          placeholder="456 Market Street"
          value={customerInfo.address}
          onChange={(e) =>
            setCustomerInfo(prev => ({ ...prev, address: e.target.value }))
          }
          className="w-full rounded-md border   px-4 py-2 focus:outline-none focus:ring-2 "
        />
      </div>

      <div>
        <label className="text-sm">Customer Contact</label>
        <Input
          placeholder="017********"
          value={customerInfo.contact}
          onChange={(e) =>
            setCustomerInfo(prev => ({ ...prev, contact: e.target.value }))
          }
        />
      </div>

      {/* ✅ City Selection */}
      <div>
        <label className="text-sm">City</label>
        <Select
          value={customerInfo.city}
          onValueChange={(val) =>
            setCustomerInfo(prev => ({ ...prev, city: val }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inside-dhaka">Inside Dhaka</SelectItem>
            <SelectItem value="outside-dhaka">Outside Dhaka</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm">Delivery Method</label>
        <Select
          value={customerInfo.deliveryMethod}
          onValueChange={(val) =>
            setCustomerInfo(prev => ({ ...prev, deliveryMethod: val }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="courier">Courier</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
