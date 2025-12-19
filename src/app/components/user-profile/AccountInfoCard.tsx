import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon } from "lucide-react";

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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Account Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground">Member Since</div>
          <div className="text-sm text-muted-foreground">
            {createdAt ? formatDate(createdAt) : "N/A"}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">Last Updated</div>
          <div className="text-sm text-muted-foreground">
            {updatedAt ? formatDate(updatedAt) : "N/A"}
          </div>
        </div>
        {/* <div>
          <div className="text-sm font-medium text-gray-900">User ID</div>
          <div className="text-sm text-gray-600 font-mono truncate">
            {userId}
          </div>
        </div> */}
      </CardContent>
    </Card>
  );
}
