"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/lib/hook/profile-user/useUserProfile";
import { updateUserProfile } from "@/lib/queries/user/updateUserProfile";
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

export default function UserProfilePage() {
  const { user, loading, error, isAuthenticated } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithProfile | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // ✅ SECURITY FIX: Remove client-side authorization logic
  // This is now just UI logic, security is handled server-side
  const showEditButton = Boolean(
    user?.profile &&
      user?.user_type !== "admin" &&
      user?.user_type !== "store_owner"
  );

  const handleEdit = () => {
    // Let server handle authorization, just trigger UI state
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async (formData: ProfileFormData) => {
    if (!currentUser) return;

    try {
      // Server will handle all authorization checks
      const { user: updatedUser, profile: updatedProfile } =
        await updateUserProfile(
          currentUser.id,
          {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
          },
          {
            // avatar_url: formData.avatar_url,
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            address_line_1: formData.address_line_1,
            address_line_2: formData.address_line_2,
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
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  if (loading) {
    return <UserLoadingSkeleton />;
  }

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

  return (
    <div className="min-h-screen flex flex-col">
      <ProfileHeader
        firstName={displayUser?.first_name}
        lastName={displayUser?.last_name}
        userType={displayUser?.user_type}
        isActive={displayUser?.is_active}
        emailVerified={displayUser?.email_verified}
      />

      <main className="flex-grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard
                firstName={displayUser?.first_name}
                lastName={displayUser?.last_name}
                email={displayUser?.email}
                phone={displayUser?.phone}
                // avatarUrl={displayUser?.profile?.avatar_url}
                userType={displayUser?.user_type}
                hasProfile={!!displayUser?.profile}
                showEditButton={showEditButton} // Pass UI state only
                onEdit={handleEdit}
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
              {isEditing ? (
                <EditProfileForm
                  user={displayUser!}
                  onCancel={handleCancel}
                  onSave={handleSave}
                />
              ) : (
                <>
                  <PersonalInfoCard
                    firstName={displayUser?.first_name}
                    lastName={displayUser?.last_name}
                    email={displayUser?.email}
                    phone={displayUser?.phone}
                    emailVerified={displayUser?.email_verified}
                    userType={displayUser?.user_type}
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
