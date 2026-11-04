import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import InvestorMoneyPage from "@/app/components/admin/dashboard/financial/InvestorMoneyPage";

export default function InvestorMoneyRoute() {
  return (
    <FeatureGatedPage featureKey="money_tracker">
      <InvestorMoneyPage />
    </FeatureGatedPage>
  );
}
