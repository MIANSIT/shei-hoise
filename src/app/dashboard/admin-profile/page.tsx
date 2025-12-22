"use client";

import { useState, useEffect, useRef } from "react";
import { useUserProfile } from "@/lib/hook/profile-user/useAdminProfile";
import { updateUserProfile } from "@/lib/queries/user/updateUserProfile";
import Footer from "../../components/common/Footer";
import { UserLoadingSkeleton } from "../../components/skeletons/UserLoadingSkeleton";
import { AccessDenied } from "../../components/user-profile/AccessDenied";
import { ProfileHeader } from "../../components/user-profile/ProfileHeader";
import { ProfileCard } from "../../components/user-profile/ProfileCard";
import { StoreInfoCard } from "../../components/user-profile/StoreInfoCard";
import { AccountInfoCard } from "../../components/user-profile/AccountInfoCard";
import { PersonalInfoCard } from "../../components/user-profile/PersonalInfoCard";
import { ProfileDetailsCard } from "../../components/user-profile/adminProfile/AdminPersonalDetails";
import { EditProfileForm } from "../../components/user-profile/adminProfile/EditAdminProfile";
import { AdminUserWithProfile } from "@/lib/queries/user/getAdminUser";
import { ProfileFormData } from "@/lib/types/adminProfile";

export default function StoreOwnerProfilePage() {
  const { user, loading, error, isAuthenticated } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUserWithProfile | null>(
    null
  );
  const formRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // ✅ STORE OWNER SIDE: Only allow store_owners to edit, block customers and admin
  const showEditButton = Boolean(
    user?.profile && user?.user_type === "store_owner" // Only store_owners can edit on store owner side
  );

  const handleEdit = () => {
    setIsEditing(true);

    // Wait for next render
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100); // small delay to ensure form is rendered
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async (formData: ProfileFormData) => {
    if (!currentUser) return;

    try {
      const { user: updatedUser, profile: updatedProfile } =
        await updateUserProfile(
          currentUser.id,
          {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
          },
          {
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

  // Additional check: Only store_owners should access this page
  if (user && user.user_type !== "store_owner") {
    return (
      <AccessDenied
        title="Access Restricted"
        message="This page is only accessible to store owners."
        showHomeButton={true}
        showLoginButton={false}
      />
    );
  }

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
        // emailVerified={displayUser?.email_verified}
      />

      <main className="grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard
                firstName={displayUser?.first_name}
                lastName={displayUser?.last_name}
                email={displayUser?.email}
                phone={displayUser?.phone}
                userType={displayUser?.user_type}
                hasProfile={!!displayUser?.profile}
                showEditButton={showEditButton}
                onEdit={handleEdit}
                isEditing={isEditing}
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

            <div className="lg:col-span-2 space-y-6" ref={formRef}>
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
                    showAdminMessage={false} // Store owners can edit, so no admin message
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
