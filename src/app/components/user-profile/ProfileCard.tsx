import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Edit, Shield, Loader2 } from "lucide-react";

interface ProfileCardProps {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  userType?: string | null;
  hasProfile?: boolean;
  showEditButton?: boolean;
  isEditing?: boolean; // 👈 new prop
  onEdit: () => void;
}

export function ProfileCard({
  firstName,
  lastName,
  email,
  phone,
  avatarUrl,
  userType,
  hasProfile = false,
  showEditButton = false,
  isEditing = false, // 👈 default false
  onEdit,
}: ProfileCardProps) {
  const getInitials = () => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return `${first}${last}` || email?.[0]?.toUpperCase() || "U";
  };

  const getAltText = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}'s profile picture`;
    }
    return "User profile picture";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
          <AvatarImage src={avatarUrl || undefined} alt={getAltText()} />
          <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {firstName && lastName
              ? `${firstName} ${lastName}`
              : "Complete Your Profile"}
          </h2>

          <div className="text-gray-600 flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{email}</span>
          </div>

          {phone && (
            <div className="text-gray-600 flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{phone}</span>
            </div>
          )}

          {(userType === "admin" || userType === "store_owner") && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              <span className="font-medium capitalize">{userType}</span>
            </div>
          )}
        </div>

        {/* 👇 Dynamic section based on editing status */}
        {isEditing ? (
          <div className="flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg w-full">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Editing Profile...</span>
          </div>
        ) : showEditButton ? (
          <Button
            onClick={onEdit}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : !hasProfile ? (
          <div className="text-center text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg w-full">
            <p>No profile data available to edit</p>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg w-full">
            <p>Profile editing is managed through admin panel</p>
          </div>
        )}
      </div>
    </div>
  );
}
