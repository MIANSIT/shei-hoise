"use client";

import { useState, useEffect } from "react";
import { Card, App } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { DetailedCustomer } from "@/lib/types/users";
import { PageHeader } from "@/app/components/admin/storeCustomers/view/PageHeader";
import { CustomerStats } from "@/app/components/admin/storeCustomers/view/CustomerStats";
import { CustomerTable } from "@/app/components/admin/storeCustomers/view/CustomerTable";
import { CustomerDetailsView } from "@/app/components/admin/storeCustomers/view/CustomerDetailsView";
import { EditProfileForm } from "@/app/components/user-profile/EditProfileForm";
import { ProfileFormData } from "@/lib/types/profile"; // Use ProfileFormData
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useCustomerFormData } from "@/lib/hook/profile-user/useCustomerFormData";
import { updateCustomerProfileAsAdmin } from "@/lib/queries/user/admin-customers";

export default function CustomerPage() {
  const { notification } = App.useApp();
  const [customers, setCustomers] = useState<DetailedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "details" | "edit">("list");
  const [selectedCustomer, setSelectedCustomer] =
    useState<DetailedCustomer | null>(null);
  const router = useRouter();
  const [filteredCustomers, setFilteredCustomers] = useState<
    DetailedCustomer[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { storeId, loading: userLoading } = useCurrentUser();
  const userFormData = useCustomerFormData(selectedCustomer);

  // Fetch customers
  useEffect(() => {
    if (!storeId || userLoading) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const allCustomers = await getAllStoreCustomers(storeId);
        setCustomers(allCustomers);
      } catch {
        notification.error({
          message: "Error",
          description: "Failed to load customers. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [storeId, userLoading, notification]);

  // Update customer - Use ProfileFormData type
  const handleUpdateCustomer = async (
    customerId: string,
    data: ProfileFormData // Use ProfileFormData type
  ) => {
    try {
      const updated = await updateCustomerProfileAsAdmin(
        customerId,
        {
          name: data.name,
          phone: data.phone,
        },
        {
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          address: data.address, // Field name is 'address'
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
        }
      );

      // Extract first and last names for UI compatibility
      const nameParts = updated.customer.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updatedCustomer: DetailedCustomer = {
        id: updated.customer.id,
        name: updated.customer.name,
        first_name: firstName, // For UI compatibility
        last_name: lastName, // For UI compatibility
        email: updated.customer.email,
        phone: updated.customer.phone || "",
        status: "active",
        order_count: 0,
        source: "direct",
        user_type: "customer",
        created_at: updated.customer.created_at,
        updated_at: updated.customer.updated_at,
        profile_id: updated.customer.profile_id,
        profile_details: {
          date_of_birth: updated.profile.date_of_birth,
          gender: updated.profile.gender,
          address_line_1: updated.profile.address, // Map 'address' to 'address_line_1' for UI
          address_line_2: null, // Not in your schema
          city: updated.profile.city,
          state: updated.profile.state,
          postal_code: updated.profile.postal_code,
          country: updated.profile.country,
        },
      };

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? updatedCustomer : c))
      );
      if (selectedCustomer?.id === customerId)
        setSelectedCustomer(updatedCustomer);

      notification.success({
        message: "Customer Updated",
        description: `${updatedCustomer.name} updated successfully.`,
      });

      return updatedCustomer;
    } catch (error) {
      notification.error({
        message: "Error",
        description: "Failed to update customer.",
      });
      throw error;
    }
  };

  const handleEdit = (customer: DetailedCustomer) => {
    setSelectedCustomer(customer);
    setViewMode("edit");
  };

  const handleSaveEdit = async (data: ProfileFormData) => {
    if (!selectedCustomer) return;
    await handleUpdateCustomer(selectedCustomer.id, data);
    setViewMode("list");
    setSelectedCustomer(null);
  };

  const handleCancelEdit = () => {
    setViewMode("list");
    setSelectedCustomer(null);
  };

  const handleDelete = (customer: DetailedCustomer) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    notification.success({
      message: "Customer Deleted",
      description: `${customer.name} deleted successfully.`,
    });
  };

  const handleViewDetails = (customer: DetailedCustomer) => {
    setSelectedCustomer(customer);
    setViewMode("details");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCustomer(null);
  };

  const handleAddCustomer = () => {
    router.push("/dashboard/customers/create-customer");
  };

  // Search filter
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          (c.name?.toLowerCase() || "").includes(term) ||
          (c.email?.toLowerCase() || "").includes(term) ||
          (c.phone?.toLowerCase() || "").includes(term)
      )
    );
  }, [searchTerm, customers]);

  const handleSearchChange = (value: string) => setSearchTerm(value);

  const activeCustomers = customers.length;

  // Views
  if (viewMode === "edit" && userFormData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EditProfileForm
            user={userFormData}
            onCancel={handleCancelEdit}
            onSave={handleSaveEdit}
          />
        </div>
      </div>
    );
  }

  if (viewMode === "details" && selectedCustomer) {
    return (
      <CustomerDetailsView
        customer={selectedCustomer}
        onBack={handleBackToList}
        onEdit={handleEdit}
        onUpdateCustomer={handleUpdateCustomer}
      />
    );
  }

  return (
    <div>
      <PageHeader
        onAddCustomer={handleAddCustomer}
        onSearchChange={handleSearchChange}
      />
      <CustomerStats
        totalCustomers={customers.length}
        activeCustomers={activeCustomers}
      />
      <Card
        title={
          <div className="flex items-center gap-2">
            <TeamOutlined />
            Customer List
          </div>
        }
      >
        <CustomerTable
          customers={filteredCustomers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          isLoading={loading}
          storeId={storeId} // ✅ ADD THIS
        />
      </Card>
    </div>
  );
}
