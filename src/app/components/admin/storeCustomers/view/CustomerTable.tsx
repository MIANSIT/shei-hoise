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
  ShoppingOutlined,
} from "@ant-design/icons";
import { DetailedCustomer } from "@/lib/types/users"; // Change to DetailedCustomer
import { deleteUserWithCheck } from "@/lib/queries/user/deleteUserWithCheck";

const { Text, Title } = Typography;

interface CustomerTableProps {
  customers: DetailedCustomer[]; // Change to DetailedCustomer[]
  onEdit: (customer: DetailedCustomer) => void; // Update parameter type
  onDelete: (customer: DetailedCustomer) => void; // Update parameter type
  onViewDetails: (customer: DetailedCustomer) => void; // Update parameter type
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

  const handleDelete = (customer: DetailedCustomer) => {
    modal.confirm({
      title: "Delete Customer",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        const result = await deleteUserWithCheck(customer.id);

        if (!result.success) {
          notification.error({
            message: "Delete Failed",
            description: result.message,
          });
          return;
        }

        // ✅ Only here
        // notification.success({
        //   message: "Customer Deleted",
        //   description: result.message,
        // });

        // Update table (no notification)
        onDelete(customer);
      },
    });
  };

  const columns = [
    {
      title: "Customer",
      dataIndex: "name",
      key: "name",
      render: (
        name: string,
        record: DetailedCustomer // Update type
      ) => (
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
            <Space size={4} wrap>
              {record.source === "orders" && (
                <Tag
                  icon={<ShoppingOutlined />}
                  color="blue"
                  className="text-xs"
                >
                  From Orders
                </Tag>
              )}
              {typeof record.order_count === "number" &&
                record.order_count > 0 && (
                  <Tag color="green" className="text-xs">
                    {record.order_count} orders
                  </Tag>
                )}
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: "Contact",
      dataIndex: "email",
      key: "email",
      render: (
        email: string,
        record: DetailedCustomer // Update type
      ) => (
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
      render: (
        record: DetailedCustomer // Update type
      ) => (
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

      <div className="md:hidden">
        <div className="flex flex-col gap-3">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              size="small"
              className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
              styles={{
                body: { padding: "16px" },
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate text-base mb-1">
                      {customer.name}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Tag
                        color={customer.status === "active" ? "green" : "red"}
                        className="text-xs border-0 font-medium"
                      >
                        {customer.status?.toUpperCase() || "ACTIVE"}
                      </Tag>
                      {customer.source === "orders" && (
                        <Tag
                          icon={<ShoppingOutlined />}
                          color="blue"
                          className="text-xs"
                        >
                          Orders
                        </Tag>
                      )}
                      {typeof customer.order_count === "number" &&
                        customer.order_count > 0 && (
                          <Tag color="green" className="text-xs">
                            {customer.order_count} orders
                          </Tag>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <MailOutlined className="text-blue-500 text-sm flex-shrink-0" />
                  <Text className="text-sm text-gray-700 truncate">
                    {customer.email}
                  </Text>
                </div>

                {customer.phone && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <PhoneOutlined className="text-green-500 text-sm flex-shrink-0" />
                    <Text className="text-sm text-gray-700 truncate">
                      {customer.phone}
                    </Text>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-2 pt-3 border-t border-gray-200">
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="middle"
                  onClick={() => onViewDetails(customer)}
                  className="flex-1 flex items-center justify-center gap-1 h-9 text-sm font-medium"
                ></Button>
                <Button
                  icon={<EditOutlined />}
                  size="middle"
                  onClick={() => onEdit(customer)}
                  className="flex-1 flex items-center justify-center gap-1 h-9 text-sm font-medium border-gray-300 text-gray-700"
                ></Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="middle"
                  onClick={() => handleDelete(customer)}
                  className="flex-1 flex items-center justify-center gap-1 h-9 text-sm font-medium"
                ></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
