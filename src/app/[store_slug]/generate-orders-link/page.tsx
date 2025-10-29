// app/admin/orders/page.tsx
import CustomOrder from "@/app/components/customOrder/CustomOrder";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";

export default function OrdersPage() {
  return (
    <div className="h-full">
      <Header />
      <CustomOrder guestMode={true} />
      <Footer />
    </div>
  );
}
