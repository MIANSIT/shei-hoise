import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import BalanceSheetPage from "@/app/components/admin/dashboard/financial/BalanceSheetPage";

export default function BalanceSheetRoute() {
  return (
    <FeatureGatedPage featureKey="balance_sheet">
      <BalanceSheetPage />
    </FeatureGatedPage>
  );
}
