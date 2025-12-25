"use client";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useStoreSettings } from "@/lib/hook/stores/useStoreSettings";
import { SheiSkeleton } from "@/app/components/ui/shei-skeleton";
import StoreProfileCard from "@/app/components/admin/dashboard/store-settings/store/StoreProfileCard";
import ContactCard from "@/app/components/admin/dashboard/store-settings/store/ContactCard";
import LegalCard from "@/app/components/admin/dashboard/store-settings/store/LegalCard";
import OperationalSettingsCard from "@/app/components/admin/dashboard/store-settings/store/OperationalSettingsCard";
import PolicyCard from "@/app/components/admin/dashboard/store-settings/store/PolicyCard";

// Import types from the correct path - adjust based on your actual structure
// Option 1: If types are in "@/types/store"

// Option 2: If types are in "@/lib/types/store/store"
import type {
  UpdatedStoreData,
  UpdatedStoreSettings,
  PolicyType,
} from "@/lib/types/store/store";

export default function StoreManagementPage() {
  const { storeId } = useCurrentUser();
  const { store, loading: storeLoading } = useStore(storeId);
  const { settings, loading: settingsLoading } = useStoreSettings(storeId);

  const loading = storeLoading || settingsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <SheiSkeleton className="h-64 w-full lg:w-2/3 rounded-2xl" />
          <SheiSkeleton className="h-64 w-full lg:w-1/3 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SheiSkeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) return null;

  // Handler for policy updates
  const handlePolicySave = async (type: PolicyType, content: string) => {
    console.log(`Saving ${type}:`, content);

    try {
      // In a real app, you would call your API here:
      // const response = await fetch(`/api/store-settings/${settings?.id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     [type === 'terms' ? 'terms_and_conditions' : 'privacy_policy']: content
      //   }),
      // });

      // if (!response.ok) throw new Error('Failed to update policy');

      // return await response.json();

      return Promise.resolve(); // Simulate async operation
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
      throw error;
    }
  };

  // Handler for operational settings updates
  const handleSettingsUpdate = async (
    updatedSettings: UpdatedStoreSettings
  ) => {
    console.log("Updating operational settings:", updatedSettings);

    try {
      // In a real app, you would call your API here:
      // const response = await fetch(`/api/store-settings/${settings?.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedSettings),
      // });

      // if (!response.ok) throw new Error('Failed to update settings');

      // return await response.json();

      return Promise.resolve(); // Simulate async operation
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  // Handler for store profile updates
  const handleStoreUpdate = async (updatedStore: UpdatedStoreData) => {
    console.log("Updating store profile:", updatedStore);

    try {
      // In a real app, you would call your API here:
      // const response = await fetch(`/api/stores/${store.id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedStore),
      // });

      // if (!response.ok) throw new Error('Failed to update store');

      // return await response.json();

      return Promise.resolve(); // Simulate async operation
    } catch (error) {
      console.error("Error updating store:", error);
      throw error;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Store Profile
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your store identity, settings, and policies
        </p>
      </div>

      {/* Store Profile Card */}
      <StoreProfileCard store={store} onStoreUpdate={handleStoreUpdate} />

      {/* Contact & Legal Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactCard store={store} />
        <LegalCard store={store} />
      </div>

      {/* Operational Settings */}
      {settings && (
        <OperationalSettingsCard
          settings={settings}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}

      {/* Policies */}
      {settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <PolicyCard
            title="Terms & Conditions"
            content={settings.terms_and_conditions ?? ""}
            iconType="terms"
            onSave={(content) => handlePolicySave("terms", content)}
          />
          <PolicyCard
            title="Privacy Policy"
            content={settings.privacy_policy ?? ""}
            iconType="privacy"
            onSave={(content) => handlePolicySave("privacy", content)}
          />
        </div>
      )}
    </div>
  );
}
