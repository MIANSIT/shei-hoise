import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import ReceiveStockPage from "@/app/components/admin/dashboard/stock/ReceiveStockPage";

export default function ReceiveStockRoute() {
  return (
    <FeatureGatedPage featureKey="stock_management">
      <ReceiveStockPage />
    </FeatureGatedPage>
  );
}
