import { Card, CardContent } from "@/components/ui/card";
import SettingItem from "@/app/components/admin/dashboard/store-settings/SettingItem";
import { Shield, CreditCard, Award } from "lucide-react";
import type { StoreData } from "@/lib/types/store/store"; // Use correct path

interface LegalCardProps {
  store: StoreData;
}

export default function LegalCard({ store }: LegalCardProps) {
  return (
    <Card className="rounded-2xl border border-gray-200/70 bg-white hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Legal Information
          </h3>
        </div>
        <div className="space-y-4">
          <SettingItem
            label="Tax ID"
            value={store.tax_id || "—"}
            icon={<CreditCard className="w-4 h-4" />}
          />
          <SettingItem
            label="Business License"
            value={store.business_license || "—"}
            icon={<Award className="w-4 h-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
