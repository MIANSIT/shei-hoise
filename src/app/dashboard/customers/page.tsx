"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, App, Tag } from "antd";
import { TeamOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { DetailedCustomer } from "@/lib/types/users";
import { PageHeader } from "@/app/components/admin/storeCustomers/view/PageHeader";
import { CustomerStats } from "@/app/components/admin/storeCustomers/view/CustomerStats";
import { CustomerTable } from "@/app/components/admin/storeCustomers/view/CustomerTable";
import { CustomerDetailsView } from "@/app/components/admin/storeCustomers/view/CustomerDetailsView";
import { EditProfileForm } from "@/app/components/user-profile/EditProfileForm";
import { ProfileFormData } from "@/lib/types/profile";
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useCustomerFormData } from "@/lib/hook/profile-user/useCustomerFormData";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { updateCustomerProfileAsAdmin } from "@/lib/queries/user/admin-customers";

const { Text } = Typography;

export default function CustomerPage() {
  const { notification } = App.useApp();
  const [customers, setCustomers] = useState<DetailedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "details" | "edit">("list");
  const [selectedCustomer, setSelectedCustomer] =
    useState<DetailedCustomer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // Use the custom hook
  const userFormData = useCustomerFormData(selectedCustomer);

  // Use the hook to get store ID
  const { storeId, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!storeId || userLoading) return;

      try {
        setLoading(true);
        console.log("Fetching customers for store:", storeId);
        const allCustomers = await getAllStoreCustomers(storeId);
        setCustomers(allCustomers);
      } catch (error) {
        console.error("Error fetching customers:", error);
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

  // Handle customer update - single function used by both edit views
  const handleUpdateCustomer = async (
    customerId: string,
    data: ProfileFormData
  ) => {
    setIsSaving(true);
    try {
      // Use the admin function to update in database
      await updateCustomerProfileAsAdmin(
        customerId,
        {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || "",
        },
        {
          date_of_birth: data.date_of_birth || "",
          gender: data.gender || "",
          address_line_1: data.address_line_1 || "",
          address_line_2: data.address_line_2 || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          country: data.country || "",
        }
      );

      // Transform the form data back to DetailedCustomer format
      const updatedCustomer: DetailedCustomer = {
        id: customerId,
        name: `${data.first_name} ${data.last_name}`.trim(),
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || undefined,
        profile_details: {
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
          country: data.country || null,
        },
        updated_at: new Date().toISOString(),
        // Preserve other existing properties
        created_at: selectedCustomer?.created_at || new Date().toISOString(),
        user_type: selectedCustomer?.user_type || "customer",
        status: selectedCustomer?.status || "active",
        source: selectedCustomer?.source || "direct",
        order_count: selectedCustomer?.order_count || 0,
        last_order_date: selectedCustomer?.last_order_date,
        avatar_url: selectedCustomer?.avatar_url,
      };

      // Update the customer in the local state
      setCustomers((prevCustomers) =>
        prevCustomers.map((c) =>
          c.id === customerId ? { ...c, ...updatedCustomer } : c
        )
      );

      // Also update the selected customer if it's the same one
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer(updatedCustomer);
      }

      // Show success notification
      notification.success({
        message: "Customer Updated",
        description: `${updatedCustomer.name} has been updated successfully.`,
      });

      return updatedCustomer;
    } catch (error) {
      console.error("Error saving customer:", error);
      notification.error({
        message: "Error",
        description: "Failed to update customer. Please try again.",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (customer: DetailedCustomer) => {
    setSelectedCustomer(customer);
    setViewMode("edit");
  };

  const handleSaveEdit = async (data: ProfileFormData) => {
    if (!selectedCustomer) return;

    try {
      await handleUpdateCustomer(selectedCustomer.id, data);
      // Return to list view
      setViewMode("list");
      setSelectedCustomer(null);
    } catch (error) {
      // Error is already handled in handleUpdateCustomer
      throw error;
    }
  };

  const handleCancelEdit = () => {
    setViewMode("list");
    setSelectedCustomer(null);
  };

  const handleDelete = (customer: DetailedCustomer) => {
    setCustomers(customers.filter((c) => c.id !== customer.id));
    notification.success({
      message: "Customer Deleted",
      description: `${customer.name} has been deleted successfully.`,
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

  const activeCustomers = customers.length;
  const customersFromOrders = customers.filter(
    (c) => c.source === "orders"
  ).length;

  // Render edit view directly
  if (viewMode === "edit" && userFormData) {
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
                  Back to Customers
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
            onSave={handleSaveEdit}
          />
        </div>
      </div>
    );
  }

  // Render details view
  if (viewMode === "details" && selectedCustomer) {
    return (
      <CustomerDetailsView
        customer={selectedCustomer}
        onBack={handleBackToList}
        onEdit={handleEdit}
        onUpdateCustomer={handleUpdateCustomer} // Pass the update function
      />
    );
  }

  // Render list view
  return (
    <div style={{ padding: "24px" }}>
      <PageHeader onAddCustomer={handleAddCustomer} />

      <CustomerStats
        totalCustomers={customers.length}
        activeCustomers={activeCustomers}
      />

      <Card
        title={
          <div className="flex flex-col md:flex-row md:items-center md:gap-2">
            <div className="flex items-center gap-2 mb-1 md:mb-0">
              <TeamOutlined />
              <span>Customer List</span>
            </div>
            <Tag
              icon={<ShoppingOutlined />}
              color="blue"
              className="w-fit text-center"
            >
              {customersFromOrders} from orders
            </Tag>
          </div>
        }
        extra={
          <div className="hidden md:block">
            <Text type="secondary">{customers.length} customers found</Text>
          </div>
        }
      >
        <CustomerTable
          customers={customers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          isLoading={loading}
        />
      </Card>
    </div>
  );
}
