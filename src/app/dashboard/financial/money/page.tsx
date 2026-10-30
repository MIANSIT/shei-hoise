import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import MoneyOverview from "@/app/components/admin/dashboard/financial/MoneyOverview";

export default function MoneyOverviewPage() {
  return (
    <FeatureGatedPage featureKey="money_tracker">
      <MoneyOverview />
    </FeatureGatedPage>
  );
}
