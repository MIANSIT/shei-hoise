"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

import { formatDate } from "@/lib/utils/formatDate";
interface AccountInfoCardProps {
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

export function AccountInfoCard({
  createdAt,
  updatedAt,
//   userId,
}: AccountInfoCardProps) {
  const t = useTranslation();


  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t.admin.myProfileAccountInfo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground">{t.admin.myProfileMemberSince}</div>
          <div className="text-sm text-muted-foreground">
            {createdAt ? formatDate(createdAt) : "N/A"}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{t.admin.myProfileLastUpdated}</div>
          <div className="text-sm text-muted-foreground">
            {updatedAt ? formatDate(updatedAt) : "N/A"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
