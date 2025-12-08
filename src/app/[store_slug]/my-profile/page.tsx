"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/lib/hook/profile-user/useUserProfile";
import { updateUserProfile } from "@/lib/queries/user/updateUserProfile";
import {
  getAdminProfile,
  AdminUserWithProfile,
} from "@/lib/queries/user/getAdminUser";
import Footer from "../../components/common/Footer";
import { UserLoadingSkeleton } from "../../components/skeletons/UserLoadingSkeleton";
import { AccessDenied } from "../../components/user-profile/AccessDenied";
import { ProfileHeader } from "../../components/user-profile/ProfileHeader";
import { ProfileCard } from "../../components/user-profile/ProfileCard";
import { StoreInfoCard } from "../../components/user-profile/StoreInfoCard";
import { AccountInfoCard } from "../../components/user-profile/AccountInfoCard";
import { PersonalInfoCard } from "../../components/user-profile/PersonalInfoCard";
import { ProfileDetailsCard } from "../../components/user-profile/ProfileDetailsCard";
import { EditProfileForm } from "../../components/user-profile/EditProfileForm";
import { UserWithProfile } from "@/lib/queries/user/getUserProfile";
import { ProfileFormData } from "@/lib/types/profile";

type DisplayUser = UserWithProfile | AdminUserWithProfile;

// ✅ Type guard for Admin/Store Owner
function isAdminUser(user: DisplayUser): user is AdminUserWithProfile {
  return "first_name" in user;
}

export default function UserProfilePage() {
  const { user, loading, error, isAuthenticated } = useUserProfile();
  const [currentUser, setCurrentUser] = useState<DisplayUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current user data depending on user_type
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      if (user.user_type === "customer") {
        setCurrentUser(user); // customers use the local hook
      } else {
        try {
          const adminData = await getAdminProfile(user.id);
          setCurrentUser(adminData);
        } catch (err) {
          console.error("Failed to fetch admin/store_owner profile:", err);
        }
      }
    };

    fetchData();
  }, [user]);

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => setIsEditing(false);

  const handleSave = async (formData: ProfileFormData) => {
    if (!currentUser || currentUser.user_type !== "customer") return;

    try {
      const { user: updatedUser, profile: updatedProfile } =
        await updateUserProfile(
          currentUser.id,
          {
            first_name: formData.name,
            last_name: formData.name,
            phone: formData.phone,
          },
          {
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            address_line_1: formData.address,
            address_line_2: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
          }
        );

      setCurrentUser({
        ...currentUser,
        ...updatedUser,
        profile: updatedProfile,
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  if (loading) return <UserLoadingSkeleton />;

  if (!isAuthenticated || error) {
    return (
      <AccessDenied
        title={error ? "Error Loading Profile" : "Access Denied"}
        message={
          error
            ? "Failed to load user profile. Please try again."
            : "Please log in to access this page."
        }
        showHomeButton={true}
        showLoginButton={!error}
      />
    );
  }

  const displayUser = currentUser || user;

  const showEditButton = displayUser?.user_type === "customer";
  if (!displayUser) {
    return <UserLoadingSkeleton />; // or some placeholder
  }
  // Safely get names using type guard
  const firstName = isAdminUser(displayUser)
    ? displayUser.first_name
    : displayUser.name;
  const lastName = isAdminUser(displayUser)
    ? displayUser.last_name
    : displayUser.name;

  return (
    <div className="min-h-screen flex flex-col">
      <ProfileHeader firstName={firstName} lastName={lastName} />

      <main className="grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard
                firstName={firstName}
                lastName={lastName}
                email={displayUser?.email}
                phone={displayUser?.phone}
                hasProfile={!!displayUser?.profile}
                onEdit={handleEdit}
                isEditing={isEditing}
                showEditButton={showEditButton}
              />

              <StoreInfoCard
                storeSlug={displayUser?.store_slug}
                storeName={displayUser?.store_name}
              />

              <AccountInfoCard
                createdAt={displayUser?.created_at}
                updatedAt={displayUser?.updated_at}
                userId={displayUser?.id}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              {isEditing && showEditButton ? (
                <EditProfileForm
                  user={displayUser as UserWithProfile} // safe cast for editing
                  onCancel={handleCancel}
                  onSave={handleSave}
                />
              ) : (
                <>
                  <PersonalInfoCard
                    firstName={firstName}
                    lastName={lastName}
                    email={displayUser?.email}
                    phone={displayUser?.phone}
                  />
                  <ProfileDetailsCard profile={displayUser?.profile} />
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
