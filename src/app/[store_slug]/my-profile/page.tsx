"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "../../../lib/hook/profile-user/useUserProfile";
import { updateCustomerProfile } from "@/lib/queries/user/updateCustomerProfile";
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
import { AdminUserWithProfile } from "@/lib/queries/user/getAdminUser";
import { ProfileFormData } from "@/lib/types/profile";

type DisplayUser = UserWithProfile | AdminUserWithProfile;

// ✅ Type guard for Admin/Store Owner
function isAdminUser(user: DisplayUser): user is AdminUserWithProfile {
  return "first_name" in user;
}

// ✅ Type guard for Customer
function isCustomerUser(user: DisplayUser): user is UserWithProfile {
  return user.user_type === "customer";
}

export default function UserProfilePage() {
  const { user, loading, error, isAuthenticated, isCustomer } =
    useUserProfile();
  const [currentUser, setCurrentUser] = useState<DisplayUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => setIsEditing(false);

  const handleSave = async (formData: ProfileFormData) => {
    if (!currentUser || !isCustomerUser(currentUser)) {
      console.log("Only customers can edit profile from this page");
      return;
    }

    try {
      // Update store customer profile
      const { data: userUpdate, profile: profileUpdate } =
        await updateCustomerProfile(
          currentUser.id,
          {
            name: formData.name,
            phone: formData.phone,
          },
          {
            date_of_birth: formData.date_of_birth,
            gender: formData.gender,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
          }
        );

      // Update the local state
      const updatedUser: UserWithProfile = {
        ...currentUser,
        name: formData.name,
        phone: formData.phone,
        profile: profileUpdate
          ? {
              ...currentUser.profile,
              ...profileUpdate,
            }
          : currentUser.profile,
      };

      setCurrentUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      throw err;
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
  if (!displayUser) {
    return <UserLoadingSkeleton />;
  }

  // Safely get names using type guard
  const firstName = isAdminUser(displayUser)
    ? displayUser.first_name
    : displayUser.name?.split(" ")[0] || displayUser.name;
  const lastName = isAdminUser(displayUser)
    ? displayUser.last_name
    : displayUser.name?.split(" ").slice(1).join(" ") || "";

  // const fullName = isAdminUser(displayUser)
  //   ? `${displayUser.first_name || ""} ${displayUser.last_name || ""}`.trim()
  //   : displayUser.name || "";

  // Prepare profile data for EditProfileForm
  const getProfileData = () => {
    if (isCustomerUser(displayUser)) {
      return {
        id: displayUser.id,
        email: displayUser.email,
        name: displayUser.name,
        phone: displayUser.phone,
        profile: displayUser.profile,
      };
    }
    // For admin users (though they shouldn't edit from here)
    return {
      id: displayUser.id,
      email: displayUser.email,
      name: `${displayUser.first_name || ""} ${
        displayUser.last_name || ""
      }`.trim(),
      phone: displayUser.phone,
      profile: displayUser.profile,
    };
  };

  // Only show edit button for customers
  const showEditButton = isCustomerUser(displayUser);

  return (
    <div className="min-h-screen flex flex-col">
      <ProfileHeader
        firstName={firstName}
        lastName={lastName}
        userType={displayUser.user_type}
        isActive={displayUser.is_active} // <-- add this
      />

      <main className="grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard
                firstName={firstName}
                lastName={lastName}
                email={displayUser.email}
                phone={displayUser.phone}
                userType={displayUser.user_type}
                hasProfile={!!displayUser.profile}
                onEdit={handleEdit}
                isEditing={isEditing}
                showEditButton={showEditButton}
              />

              <StoreInfoCard
                storeSlug={displayUser.store_slug}
                storeName={displayUser.store_name}
              />

              <AccountInfoCard
                createdAt={displayUser.created_at}
                updatedAt={displayUser.updated_at}
                userId={displayUser.id}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              {isEditing && showEditButton ? (
                <EditProfileForm
                  user={getProfileData()}
                  onCancel={handleCancel}
                  onSave={handleSave}
                />
              ) : (
                <>
                  <PersonalInfoCard
                    firstName={firstName}
                    lastName={lastName}
                    email={displayUser.email}
                    phone={displayUser.phone}
                    userType={displayUser.user_type}
                    showAdminMessage={!isCustomerUser(displayUser)}
                  />
                  <ProfileDetailsCard profile={displayUser.profile} />
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
