import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Calendar, UserX } from "lucide-react";

// Update the interface to match your data structure
interface ProfileDetails {
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null; // Make address optional to match your data

  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface ProfileDetailsCardProps {
  profile?: ProfileDetails | null;
}

export function ProfileDetailsCard({ profile }: ProfileDetailsCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!profile) {
    return (
      <Card className="shadow-sm border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Profile Details
            </h3>
            <div className="text-gray-600 mb-4 max-w-md mx-auto">
              Additional profile information is not available.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get address from either address or address_line_1 field
  const address = profile.address || profile.address;
  const hasAddress = address || profile.city || profile.country;
  const hasProfileInfo = profile.date_of_birth || profile.gender || hasAddress;

  if (!hasProfileInfo) {
    return (
      <Card className="shadow-sm border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Additional Information
            </h3>
            <div className="text-gray-600 mb-4 max-w-md mx-auto">
              No additional profile details have been added.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>
          Additional profile information from your user profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.date_of_birth && (
            <div>
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </div>
              <div className="mt-1 text-gray-900">
                {formatDate(profile.date_of_birth)}
              </div>
            </div>
          )}
          {profile.gender && (
            <div>
              <div className="text-sm font-medium text-gray-700">Gender</div>
              <div className="mt-1 text-gray-900 capitalize">
                {profile.gender}
              </div>
            </div>
          )}
          {hasAddress && (
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </div>
              <div className="mt-1 text-gray-900 space-y-1">
                {address && <div>{address}</div>}
                <div className="flex flex-wrap gap-2">
                  {profile.city && <span>{profile.city}</span>}
                  {profile.state && <span>, {profile.state}</span>}
                  {profile.postal_code && <span>{profile.postal_code}</span>}
                  {profile.country && <span>, {profile.country}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
