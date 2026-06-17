import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User as UserIcon, Shield } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

interface IncompleteProfileCardProps {
  onEdit: () => void;
  userType?: string | null;
}

export function IncompleteProfileCard({
  onEdit,
  userType,
}: IncompleteProfileCardProps) {
  const t = useTranslation();
  const canEdit = userType !== "admin" && userType !== "store_owner";

  return (
    <Card className="shadow-sm border-dashed border-2">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <UserIcon className="w-12 h-12  mx-auto mb-4" />
          <h3 className="text-lg font-medium  mb-2">
            {t.admin.myProfileIncompleteTitle}
          </h3>
          <div className="text-gray-600 mb-4 max-w-md mx-auto">
            {canEdit
              ? t.admin.myProfileIncompleteDesc
              : t.admin.myProfileIncompleteDescAdmin}
          </div>

          {canEdit ? (
            <Button onClick={onEdit}>{t.admin.myProfileAddProfileInfo}</Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">{t.admin.myProfileAdminManagedBadge}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
