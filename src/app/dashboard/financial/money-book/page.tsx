import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import MoneyBookPage from "@/app/components/admin/dashboard/financial/MoneyBookPage";

export default function MoneyBookRoute() {
  return (
    <FeatureGatedPage featureKey="money_tracker">
      <MoneyBookPage />
    </FeatureGatedPage>
  );
}
