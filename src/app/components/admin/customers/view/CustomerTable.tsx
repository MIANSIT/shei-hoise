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

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
}) => {
  const { notification, modal } = App.useApp(); // Get modal from App context

  // Handle delete with confirmation using App context modal
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

  // Table columns for desktop
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

      {/* Mobile Cards */}
      <div className="md:hidden">
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {customers.map((customer) => (
            <Card
              key={customer.id}
              size="small"
              hoverable
              actions={[
                <EyeOutlined
                  key="view"
                  onClick={() => onViewDetails(customer)}
                />,
                <EditOutlined key="edit" onClick={() => onEdit(customer)} />,
                <DeleteOutlined
                  key="delete"
                  onClick={() => handleDelete(customer)}
                />,
              ]}
            >
              <Card.Meta
                avatar={
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#1890ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                }
                title={customer.name}
                description={
                  <Space direction="vertical" size={0}>
                    <Space>
                      <MailOutlined style={{ fontSize: "12px" }} />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {customer.email}
                      </Text>
                    </Space>
                    {customer.phone && (
                      <Space>
                        <PhoneOutlined style={{ fontSize: "12px" }} />
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {customer.phone}
                        </Text>
                      </Space>
                    )}
                    {customer.address && (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {customer.address}
                      </Text>
                    )}
                    <Tag color={customer.status === "active" ? "green" : "red"}>
                      {customer.status?.toUpperCase() || "ACTIVE"}
                    </Tag>
                  </Space>
                }
              />
            </Card>
          ))}
        </Space>
      </div>
    </div>
  );
};

export default CustomerTable;
