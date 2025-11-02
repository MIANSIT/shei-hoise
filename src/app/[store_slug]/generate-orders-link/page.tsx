// app/admin/orders/page.tsx
import CustomOrder from "../../components/orders/CustomOrder";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";

export default function OrdersPage() {
  return (
    <div className="">
      <Header />
      <CustomOrder />
      <Footer />
    </div>
  );
}
