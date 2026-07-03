// app/components/admin/customers/view/CustomerTable.tsx
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
import { DetailedCustomer } from "@/lib/types/users";
import { deleteUserWithCheck } from "@/lib/queries/user/deleteUserWithCheck";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

const { Text, Title } = Typography;

interface CustomerTableProps {
  customers: DetailedCustomer[];
  onEdit: (customer: DetailedCustomer) => void;
  onDelete: (customer: DetailedCustomer) => void;
  onViewDetails: (customer: DetailedCustomer) => void;
  isLoading?: boolean;
  storeId: string | null;
}

export function CustomerTable({
  customers,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
  storeId,
}: CustomerTableProps) {
  const { notification, modal } = App.useApp();
  const t = useTranslation();
  const n = useLocalNum();

  const handleDelete = (customer: DetailedCustomer) => {
    modal.confirm({
      title: t.admin.customerTableDeleteTitle,
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      okText: t.admin.customerTableDeleteOk,
      okType: "danger",
      cancelText: t.admin.customerTableDeleteCancel,
      async onOk() {
        if (!storeId) {
          notification.error({
            title: t.admin.customerTableDeleteFailed,
            description: t.admin.customerTableStoreIdMissing,
          });
          return;
        }

        const result = await deleteUserWithCheck(customer.id, storeId);

        if (!result.success) {
          notification.error({
            title: t.admin.customerTableDeleteFailed,
            description: result.message,
          });
          return;
        }

        onDelete(customer);
      },
    });
  };

  const columns = [
    {
      title: t.admin.customerTableColCustomer,
      dataIndex: "name",
      key: "name",
      render: (name: string, record: DetailedCustomer) => (
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
              {typeof record.order_count === "number" &&
                record.order_count > 0 && (
                  <Tag color="green" className="text-xs">
                    {n(record.order_count)} {t.admin.customerTableOrdersTag}
                  </Tag>
                )}
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: t.admin.customerTableColContact,
      dataIndex: "email",
      key: "email",
      render: (email: string, record: DetailedCustomer) => (
        <Space orientation="vertical" size={0}>
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
      title: t.admin.customerTableColStatus,
      dataIndex: "status",
      key: "status",
      render: (status: string = "active") => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t.admin.customerTableColActions,
      key: "actions",
      render: (record: DetailedCustomer) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onViewDetails(record)}
          >
            {t.admin.customerTableViewBtn}
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          >
            {t.admin.customerTableEditBtn}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record)}
          >
            {t.admin.customerTableDeleteBtn}
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
          <Text type="secondary">{t.admin.customerTableLoading}</Text>
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
              {t.admin.customerTableEmpty}
            </Title>
            <Text type="secondary">
              {t.admin.customerTableEmptyHint}
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
          pagination={false}
          scroll={{ x: 800 }}
        />
      </div>

      <div className="md:hidden">
        <div className="flex flex-col gap-3">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              size="small"
              className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 dark:border-gray-700"
              styles={{
                body: { padding: "16px" },
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base mb-1">
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
                          {t.admin.customerTableOrdersSource}
                        </Tag>
                      )}
                      {typeof customer.order_count === "number" &&
                        customer.order_count > 0 && (
                          <Tag color="green" className="text-xs">
                            {n(customer.order_count)} {t.admin.customerTableOrdersTag}
                          </Tag>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <MailOutlined className="text-blue-500 text-sm shrink-0" />
                  <Text className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {customer.email}
                  </Text>
                </div>

                {customer.phone && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <PhoneOutlined className="text-green-500 text-sm shrink-0" />
                    <Text className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {customer.phone}
                    </Text>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="middle"
                  onClick={() => onViewDetails(customer)}
                  className="flex-1 flex items-center justify-center gap-1 h-9 text-sm font-medium"
                />
                <Button
                  icon={<EditOutlined />}
                  size="middle"
                  onClick={() => onEdit(customer)}
                  className="flex-1 flex items-center justify-center gap-1 h-9 text-sm font-medium border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="middle"
                  onClick={() => handleDelete(customer)}
                  className="flex-1 flex items-center justify-center gap-1 h-9 text-sm font-medium"
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
