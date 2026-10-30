import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import StockHealthPage from "@/app/components/admin/dashboard/stock/StockHealthPage";

export default function StockHealthRoute() {
  return (
    <FeatureGatedPage featureKey="stock_management">
      <StockHealthPage />
    </FeatureGatedPage>
  );
}
