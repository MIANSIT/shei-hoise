import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import SuppliersPage from "@/app/components/admin/dashboard/stock/SuppliersPage";

export default function SuppliersRoute() {
  return (
    <FeatureGatedPage featureKey="stock_management">
      <SuppliersPage />
    </FeatureGatedPage>
  );
}
