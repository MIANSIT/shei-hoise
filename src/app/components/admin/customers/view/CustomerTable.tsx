// app/components/admin/customers/view/CustomerTable.tsx
import React from "react";
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Empty,
  Spin,
  App,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status?: "active" | "inactive";
}

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetails: (customer: Customer) => void;
  isLoading?: boolean;
}

export function CustomerTable({
  customers,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
}: CustomerTableProps) {
  const { notification, modal } = App.useApp();

  const handleDelete = (customer: Customer) => {
    modal.confirm({
      title: "Delete Customer",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk() {
        onDelete(customer);
        notification.success({
          message: "Customer Deleted",
          description: `${customer.name} has been deleted successfully.`,
        });
      },
    });
  };

  const columns = [
    {
      title: "Customer",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Customer) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#1890ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            {record.address && (
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.address}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "Contact",
      dataIndex: "email",
      key: "email",
      render: (email: string, record: Customer) => (
        <Space direction="vertical" size={0}>
          <Space>
            <MailOutlined style={{ color: "#1890ff" }} />
            <Text>{email}</Text>
          </Space>
          {record.phone && (
            <Space>
              <PhoneOutlined style={{ color: "#52c41a" }} />
              <Text type="secondary">{record.phone}</Text>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string = "active") => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Customer) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onViewDetails(record)}
          >
            View
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          >
            Edit
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading customers...</Text>
        </div>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              No Customers Found
            </Title>
            <Text type="secondary">
              Get started by adding your first customer
            </Text>
          </div>
        }
      />
    );
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table
          columns={columns}
          dataSource={customers.map((customer) => ({
            ...customer,
            key: customer.id,
          }))}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} customers`,
          }}
          scroll={{ x: 800 }}
        />
      </div>

      {/* Mobile Cards - Fixed Button Layout */}
      <div className="md:hidden ">
        <div className="flex flex-col gap-2">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              size="small"
              className="w-full"
              styles={{
                body: { padding: "12px" },
              }}
            >
              {/* Header with Avatar and Name */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate text-sm">
                      {customer.name}
                    </div>
                    <Tag
                      color={customer.status === "active" ? "green" : "red"}
                      className="text-xs mt-1"
                    >
                      {customer.status?.toUpperCase() || "ACTIVE"}
                    </Tag>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <MailOutlined className="text-blue-500 text-xs" />
                  <Text className="text-xs text-gray-600 truncate">
                    {customer.email}
                  </Text>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneOutlined className="text-green-500 text-xs" />
                    <Text className="text-xs text-gray-600 truncate">
                      {customer.phone}
                    </Text>
                  </div>
                )}
                {customer.address && (
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {customer.address}
                  </div>
                )}
              </div>

              {/* Action Buttons - Fixed Layout */}
              <div className="flex justify-center gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => onViewDetails(customer)}
                  className="h-8 w-8 flex items-center justify-center"
                  title="View"
                />
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => onEdit(customer)}
                  className="h-8 w-8 flex items-center justify-center"
                  title="Edit"
                />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => handleDelete(customer)}
                  className="h-8 w-8 flex items-center justify-center"
                  title="Delete"
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
