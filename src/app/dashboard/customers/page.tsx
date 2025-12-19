"use client";

import { useState, useEffect } from "react";
import { Card, App, Pagination, Spin, Button, Space } from "antd";
import { TeamOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
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
import { updateCustomerProfileAsAdmin } from "@/lib/queries/user/admin-customers";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";

// Constants for pagination
const DEFAULT_PAGE_SIZE = 10;

export default function CustomerPage() {
  const { notification } = App.useApp();
  const [customers, setCustomers] = useState<DetailedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "details" | "edit">("list");
  const [selectedCustomer, setSelectedCustomer] =
    useState<DetailedCustomer | null>(null);
  const router = useRouter();

  const { storeId, loading: userLoading } = useCurrentUser();
  const userFormData = useCustomerFormData(selectedCustomer);

  // Use URL sync for search and pagination
  const [searchTerm, setSearchTerm] = useUrlSync("search", "", (v) => v || "");
  const [currentPage, setCurrentPage] = useUrlSync("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync(
    "pageSize",
    DEFAULT_PAGE_SIZE,
    parseInteger
  );

  // Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch customers with search and pagination
  useEffect(() => {
    if (!storeId || userLoading) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);

        const result = await getAllStoreCustomers(
          storeId,
          searchTerm,
          currentPage,
          pageSize
        );

        if (
          result &&
          typeof result === "object" &&
          "customers" in result &&
          "totalCount" in result
        ) {
          setCustomers(result.customers);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
        } else {
          setCustomers(result as DetailedCustomer[]);
          setTotalCount((result as DetailedCustomer[]).length);
          setTotalPages(1);
        }
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
  }, [storeId, userLoading, notification, searchTerm, currentPage, pageSize]);

  // Update customer - Use ProfileFormData type
  const handleUpdateCustomer = async (
    customerId: string,
    data: ProfileFormData
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
          address: data.address,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
        }
      );

      const nameParts = updated.customer.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updatedCustomer: DetailedCustomer = {
        id: updated.customer.id,
        name: updated.customer.name,
        first_name: firstName,
        last_name: lastName,
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
          address_line_1: updated.profile.address,
          address_line_2: null,
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const activeCustomersOrders = customers.filter(
    (c) => (c.order_count ?? 0) > 0
  ).length;
  const activeCustomersStatus = customers.filter(
    (c) => c.status === "active"
  ).length;

  const customersThisMonth = customers.filter((c) => {
    if (!c.created_at) return false;
    const created = new Date(c.created_at);
    return (
      created.getMonth() === currentMonth &&
      created.getFullYear() === currentYear
    );
  }).length;

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
        totalCustomers={totalCount}
        activeCustomersOrders={activeCustomersOrders}
        activeCustomersStatus={activeCustomersStatus}
        thisMonth={customersThisMonth}
      />
      <Card
        title={
          <div className="flex items-center gap-2">
            <TeamOutlined />
            Customer List
            {loading && <Spin size="small" className="ml-2" />}
          </div>
        }
      >
        <CustomerTable
          customers={customers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          isLoading={loading}
          storeId={storeId}
        />

        {/* Responsive Pagination */}
        {!loading && totalCount > 0 && (
          <div className="mt-6">
            {/* Desktop Pagination */}
            <div className="hidden md:flex justify-between items-center">
              <div className="text-gray-600">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                customers
              </div>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={totalCount}
                onChange={handlePageChange}
                onShowSizeChange={handlePageChange}
                showSizeChanger
                pageSizeOptions={[10, 25, 50, 100]}
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`
                }
              />
            </div>

            {/* Mobile Pagination - Simple one by one */}
            <div className="md:hidden">
              <div className="flex flex-col gap-4">
                {/* Page info */}
                <div className="text-center text-gray-600 text-sm">
                  Page {currentPage} of {totalPages} •{" "}
                  {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  customers
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between items-center">
                  <Button
                    type="default"
                    icon={<LeftOutlined />}
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex-1 max-w-[120px]"
                  >
                    Previous
                  </Button>

                  <div className="text-center px-4">
                    <span className="font-semibold text-gray-800">
                      {currentPage}
                    </span>
                    <span className="text-gray-500"> / {totalPages}</span>
                  </div>

                  <Button
                    type="default"
                    icon={<RightOutlined />}
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex-1 max-w-[120px]"
                  >
                    Next
                  </Button>
                </div>

                {/* Page size selector for mobile */}
                <div className="flex justify-center mt-2">
                  <Space wrap>
                    <span className="text-gray-600 text-sm">Show:</span>
                    {[10, 25, 50].map((size) => (
                      <Button
                        key={size}
                        type={pageSize === size ? "primary" : "default"}
                        size="small"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </Space>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
