// app/customer/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Statistic,
  Typography,
  Space,
  Divider,
  Modal,
  App,
} from "antd";
import {
  UserAddOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  EyeOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import CustomerTable from "@/app/components/admin/customers/view/CustomerTable";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;
const { confirm } = Modal;

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status?: "active" | "inactive";
}

const CustomerPage: React.FC = () => {
  const { notification } = App.useApp(); // Use App context for notifications
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const router = useRouter();
  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Replace with your actual API call
        setTimeout(() => {
          const mockCustomers: Customer[] = [
            {
              id: 1,
              name: "John Doe",
              email: "john.doe@example.com",
              phone: "+1-555-0101",
              address: "123 Main St, New York, NY",
              status: "active",
            },
            {
              id: 2,
              name: "Jane Smith",
              email: "jane.smith@example.com",
              phone: "+1-555-0102",
              address: "456 Oak Ave, Los Angeles, CA",
              status: "active",
            },
            {
              id: 3,
              name: "Bob Johnson",
              email: "bob.johnson@example.com",
              phone: "+1-555-0103",
              address: "789 Pine Rd, Chicago, IL",
              status: "inactive",
            },
            {
              id: 4,
              name: "Alice Brown",
              email: "alice.brown@example.com",
              phone: "+1-555-0104",
              address: "321 Elm St, Houston, TX",
              status: "active",
            },
            {
              id: 5,
              name: "Charlie Wilson",
              email: "charlie.wilson@example.com",
              phone: "+1-555-0105",
              address: "654 Maple Dr, Phoenix, AZ",
              status: "active",
            },
          ];
          setCustomers(mockCustomers);
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error("Error fetching customers:", error);
        notification.error({
          message: "Error",
          description: "Failed to load customers. Please try again.",
        });
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [notification]);

  const handleEdit = (customer: Customer) => {
    console.log("Edit customer:", customer);
    notification.info({
      message: "Edit Customer",
      description: `Editing ${customer.name}`,
    });
  };

  const handleDelete = (customer: Customer) => {
    confirm({
      title: "Are you sure you want to delete this customer?",
      icon: <ExclamationCircleOutlined />,
      content: `Customer: ${customer.name}`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk() {
        setCustomers(customers.filter((c) => c.id !== customer.id));
        console.log("Deleted customer:", customer);
        notification.success({
          message: "Customer Deleted",
          description: `${customer.name} has been deleted successfully.`,
        });
      },
    });
  };

  const handleViewDetails = (customer: Customer) => {
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

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active"
  ).length;

  return (
    <div style={{ padding: "24px" }}>
      {/* Custom Header Section */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Customers
            </Title>
            <Text type="secondary">
              Manage your customer information and details
            </Text>
          </div>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="large"
            onClick={handleAddCustomer}
          >
            Add Customer
          </Button>
        </div>
        <Divider style={{ margin: "16px 0" }} />
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Customers"
              value={customers.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Customers"
              value={activeCustomers}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="This Month"
              value={customers.length}
              prefix={<RiseOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Customer Table */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            Customer List
          </Space>
        }
        extra={<Text type="secondary">{customers.length} customers found</Text>}
      >
        <CustomerTable
          customers={customers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          isLoading={loading}
        />
      </Card>

      {/* Customer Details Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            Customer Details
          </Space>
        }
        open={detailModalVisible}
        onCancel={closeDetailModal}
        footer={[
          <Button key="close" onClick={closeDetailModal}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              if (selectedCustomer) {
                closeDetailModal();
                handleEdit(selectedCustomer);
              }
            }}
          >
            Edit Customer
          </Button>,
        ]}
        width={600}
      >
        {selectedCustomer && (
          <div style={{ padding: "16px 0" }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Name:</Text>
                <br />
                <Text>{selectedCustomer.name}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Email:</Text>
                <br />
                <Text>{selectedCustomer.email}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Phone:</Text>
                <br />
                <Text>{selectedCustomer.phone || "N/A"}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>
                <br />
                <Text
                  style={{
                    color:
                      selectedCustomer.status === "active"
                        ? "#52c41a"
                        : "#ff4d4f",
                    fontWeight: "bold",
                  }}
                >
                  {selectedCustomer.status?.toUpperCase() || "ACTIVE"}
                </Text>
              </Col>
              <Col span={24}>
                <Text strong>Address:</Text>
                <br />
                <Text>{selectedCustomer.address || "N/A"}</Text>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerPage;
