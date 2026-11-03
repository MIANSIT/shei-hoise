import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import SupplierBillsPage from "@/app/components/admin/dashboard/stock/SupplierBillsPage";

export default function SupplierBillsRoute() {
  return (
    <FeatureGatedPage featureKey="stock_management">
      <SupplierBillsPage />
    </FeatureGatedPage>
  );
}
