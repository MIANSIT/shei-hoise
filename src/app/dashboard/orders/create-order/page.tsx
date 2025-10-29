// app/admin/orders/page.tsx
import CreateOrder from "@/app/components/admin/order/create-order/CreateOrder";

export default function OrdersPage() {
  return (
    <div className="h-full">
      <CreateOrder />
    </div>
  )
}