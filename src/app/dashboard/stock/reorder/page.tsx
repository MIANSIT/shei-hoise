import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import ReorderListPage from "@/app/components/admin/dashboard/stock/ReorderListPage";

export default function ReorderListRoute() {
  return (
    <FeatureGatedPage featureKey="stock_management">
      <ReorderListPage />
    </FeatureGatedPage>
  );
}
