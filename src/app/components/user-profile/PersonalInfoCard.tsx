import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Shield } from "lucide-react";

interface PersonalInfoCardProps {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  phone?: string | null;
  emailVerified?: boolean;
  userType?: string | null;
  showAdminMessage?: boolean; // New boolean prop
}

export function PersonalInfoCard({
  firstName,
  lastName,
  email,
  phone,
  // emailVerified,
  userType,
  showAdminMessage = true, // Default to false since it's also used on user side
}: PersonalInfoCardProps) {
  const isAdminOrVendor = userType === "admin" || userType === "store_owner";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          {isAdminOrVendor
            ? "Your administrative account information"
            : "Your basic personal details and contact information"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-foreground">
              First Name
            </div>
            <div className="mt-1 text-muted-foreground">
              {firstName || (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Last Name</div>
            <div className="mt-1 text-muted-foreground">
              {lastName || (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </div>
          </div>
          <div className="md:col-span-1">
            <div className="text-sm font-medium text-foreground">
              Email Address
            </div>
            <div className="mt-1 text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">{email}</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-1">
            <div className="text-sm font-medium text-foreground">
              Phone Number
            </div>
            <div className="mt-1 text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>
                {phone || <span className="text-muted-foreground">Not provided</span>}
              </span>
            </div>
          </div>

          {isAdminOrVendor && (
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Account Role
              </div>

              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <Badge
                  variant={userType === "admin" ? "destructive" : "default"}
                  className="w-fit"
                >
                  {userType?.toUpperCase()}
                </Badge>
                {showAdminMessage && (
                  <span className="text-sm text-foreground">
                    {userType === "admin"
                      ? "Full system access"
                      : "Store management access"}
                  </span>
                )}
              </div>

              {isAdminOrVendor && showAdminMessage && (
                <div className="text-sm text-muted-foreground mt-2">
                  Profile editing is managed through the administrative system.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
