import FeatureGatedPage from "@/app/components/admin/common/FeatureGatedPage";
import MembershipsPage from "@/app/components/admin/dashboard/memberships/MembershipsPage";

export default function MembershipsRoute() {
  return (
    <FeatureGatedPage featureKey="customer_membership">
      <MembershipsPage />
    </FeatureGatedPage>
  );
}
