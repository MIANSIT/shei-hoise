import CreateOrder from "@/app/components/admin/order/create-order/CreateOrder";

export default function OrdersPage() {
  return (
    <div className="max-h-screen flex items-start justify-center ">
      <div className="w-full max-w-6xl">
        <CreateOrder />
      </div>
    </div>
  )
}
