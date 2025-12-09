"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { DetailedCustomer } from "@/lib/types/users";
import { EditProfileForm } from "@/app/components/user-profile/EditProfileForm";
import { ProfileFormData } from "@/lib/types/profile";
import { ProfileHeader } from "@/app/components/user-profile/ProfileHeader";
import { ProfileCard } from "@/app/components/user-profile/ProfileCard";
import { PersonalInfoCard } from "@/app/components/user-profile/PersonalInfoCard";
import { ProfileDetailsCard } from "@/app/components/user-profile/ProfileDetailsCard";
import { AccountInfoCard } from "@/app/components/user-profile/AccountInfoCard";
import { useCustomerFormData } from "@/lib/hook/profile-user/useCustomerFormData";

interface CustomerDetailsViewProps {
  customer: DetailedCustomer;
  onBack: () => void;
  onEdit: (customer: DetailedCustomer) => void;
  onUpdateCustomer: (
    customerId: string,
    data: ProfileFormData // Use ProfileFormData
  ) => Promise<DetailedCustomer>;
}

export function CustomerDetailsView({
  customer,
  onBack,
  onEdit,
  onUpdateCustomer,
}: CustomerDetailsViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomer, setCurrentCustomer] =
    useState<DetailedCustomer>(customer);
  const [isSaving, setIsSaving] = useState(false);

  // Use the custom hook to get form data
  const userFormData = useCustomerFormData(currentCustomer);

  // Use first_name/last_name from DetailedCustomer if available, otherwise extract from name
  const firstName =
    currentCustomer.first_name || currentCustomer.name?.split(" ")[0] || "";
  const lastName =
    currentCustomer.last_name ||
    currentCustomer.name?.split(" ").slice(1).join(" ") ||
    "";

  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Handle save profile data - now uses the parent's update function
  const handleSaveProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const updatedCustomer = await onUpdateCustomer(currentCustomer.id, data);

      // Update local state with the returned updated customer
      setCurrentCustomer(updatedCustomer);

      // Call the parent's onEdit function to ensure consistency
      onEdit(updatedCustomer);

      // Exit edit mode and stay in details view
      setIsEditing(false);
    } catch (error) {
      // Error is already handled in parent component
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && userFormData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Mobile Layout - Back button top right, title below */}
            <div className="block sm:hidden">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2"
                  disabled={isSaving}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Customer
                </h1>
                <p className="text-gray-600 mt-2">
                  Update customer information
                </p>
              </div>
            </div>

            {/* Desktop Layout - Back button left, title center */}
            <div className="hidden sm:flex relative items-center justify-center">
              <div className="absolute left-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2"
                  disabled={isSaving}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Details
                </Button>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Customer
                </h1>
                <p className="text-gray-600 mt-1">
                  Update customer information
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EditProfileForm
            user={userFormData}
            onCancel={handleCancelEdit}
            onSave={handleSaveProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Mobile Layout - Back button top right, title below */}
          <div className="block sm:hidden">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Customer Details
              </h1>
              <p className="text-gray-600 mt-2">
                View and manage customer information
              </p>
            </div>
          </div>

          {/* Desktop Layout - Back button left, title center */}
          <div className="hidden sm:flex relative items-center justify-center">
            <div className="absolute left-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Customers
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Customer Details
              </h1>
              <p className="text-gray-600 mt-1">
                View and manage customer information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Profile cards */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard
              firstName={firstName}
              lastName={lastName}
              email={currentCustomer.email}
              phone={currentCustomer.phone}
              avatarUrl={currentCustomer.avatar_url}
              userType="customer"
              hasProfile={!!currentCustomer.profile_details}
              showEditButton={true}
              onEdit={handleEditClick}
              isEditing={isEditing}
            />

            <AccountInfoCard
              createdAt={currentCustomer.created_at}
              updatedAt={currentCustomer.updated_at}
            />
          </div>

          {/* Right column - Details cards */}
          <div className="lg:col-span-2 space-y-6">
            <ProfileHeader
              firstName={firstName}
              lastName={lastName}
              userType={currentCustomer.user_type || "customer"}
              isActive={currentCustomer.status === "active"}
              emailVerified={true}
            />

            <PersonalInfoCard
              firstName={firstName}
              lastName={lastName}
              email={currentCustomer.email}
              phone={currentCustomer.phone}
              userType="customer"
              showAdminMessage={false}
              emailVerified={true}
            />

            {/* ProfileDetailsCard now receives the full profile_details */}
            <ProfileDetailsCard profile={currentCustomer.profile_details} />

            {/* Additional customer-specific information */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      Total Orders
                    </div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">
                      {currentCustomer.order_count || 0}
                    </div>
                  </div>
                  {currentCustomer.last_order_date && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Last Order
                      </div>
                      <div className="mt-1 text-gray-900">
                        {new Date(
                          currentCustomer.last_order_date
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
