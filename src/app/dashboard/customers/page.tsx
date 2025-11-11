// app/customer/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, App, Tag } from "antd";
import { TeamOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { TableCustomer } from "@/lib/types/users";
import { PageHeader } from "@/app/components/admin/storeCustomers/view/PageHeader";
import { CustomerStats } from "@/app/components/admin/storeCustomers/view/CustomerStats";
import { CustomerTable } from "@/app/components/admin/storeCustomers/view/CustomerTable";
import { CustomerDetailsModal } from "@/app/components/admin/storeCustomers/view/CustomerDetailsModal";
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const { Text } = Typography;

export default function CustomerPage() {
  const { notification } = App.useApp();
  const [customers, setCustomers] = useState<TableCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<TableCustomer | null>(null);
  const router = useRouter();

  // Use the hook to get store ID
  const { storeId, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    const fetchCustomers = async () => {
      // Don't fetch if we don't have a store ID yet
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

  const handleEdit = (customer: TableCustomer) => {
    notification.info({
      message: "Edit Customer",
      description: `Editing ${customer.name}`,
    });
  };

  const handleDelete = (customer: TableCustomer) => {
    setCustomers(customers.filter((c) => c.id !== customer.id));
    notification.success({
      message: "Customer Deleted",
      description: `${customer.name} has been deleted successfully.`,
    });
  };

  const handleViewDetails = (customer: TableCustomer) => {
    setSelectedCustomer(customer);
    setDetailModalVisible(true);
  };

  const handleAddCustomer = () => {
    router.push("/dashboard/customers/create-customer");
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedCustomer(null);
  };

  const activeCustomers = customers.length;
  const customersFromOrders = customers.filter(
    (c) => c.source === "orders"
  ).length;

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

      <CustomerDetailsModal
        visible={detailModalVisible}
        customer={selectedCustomer}
        onClose={closeDetailModal}
        onEdit={handleEdit}
      />
    </div>
  );
}
