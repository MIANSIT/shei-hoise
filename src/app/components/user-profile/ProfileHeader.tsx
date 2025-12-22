import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface ProfileHeaderProps {
  firstName?: string | null;
  lastName?: string | null;
  userType?: string | null;
  isActive?: boolean;
}

export function ProfileHeader({
  firstName,
  lastName,
  userType,
  isActive,
}: ProfileHeaderProps) {
  const getUserStatusBadge = () => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">Inactive</Badge>
    );
  };

  const getUserTypeBadge = () => {
    const type = userType?.toLowerCase();
    const variants = {
      admin: "destructive",
      store_owner: "default",
      customer: "secondary",
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || "secondary"}>
        <Shield className="w-3 h-3 mr-1" />
        {userType || "Customer"}
      </Badge>
    );
  };

  return (
    <header className="bg-background shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              My Profile
            </h1>
            <p className="text-muted-foreground mt-2">
              {firstName && lastName
                ? `Welcome back, ${firstName} ${lastName}`
                : "Manage your account information and preferences"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
            {getUserStatusBadge()}
            {getUserTypeBadge()}
          </div>
        </div>
      </div>
    </header>
  );
}
