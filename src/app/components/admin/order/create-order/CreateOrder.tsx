/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Empty,
  Spin,
  Alert,
  Divider,
  Typography,
  Space,
  Avatar,
  Select,
  Descriptions,
  App,
  Dropdown,
} from "antd";
import {
  UserAddOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  DownOutlined,
} from "@ant-design/icons";
import CustomerInfo from "./CustomerInfo";
import OrderDetails from "./OrderDetails";
import OrderSummary from "./OrderSummary";
import SaveOrderButton from "./SaveOrderButton";
import {
  CustomerInfo as CustomerInfoType,
  OrderProduct,
} from "@/lib/types/order";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import type { StoreCustomer } from "@/lib/queries/customers/getStoreCustomersSimple";
import type { CustomerProfile } from "@/lib/queries/customers/getCustomerProfile";

const { Title, Text } = Typography;
const { Option } = Select;

type CustomerType = "new" | "existing";

export default function CreateOrder() {
  const { notification } = App.useApp();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<StoreCustomer[]>(
    []
  );
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading: userLoading } = useCurrentUser();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfoType>({
    name: "",
    phone: "",
    address: "",
    deliveryMethod: "",
    city: "",
    email: "",
    notes: "",
    password: "AdminCustomer1232*",
  });

  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [status, setStatus] = useState<
    "pending" | "confirmed" | "completed" | "cancelled"
  >("pending");
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "paid" | "failed" | "refunded"
  >("pending");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [orderId, setOrderId] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("new");
  const [selectedCustomer, setSelectedCustomer] =
    useState<StoreCustomer | null>(null);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch customer profile data from user_profiles table
  const fetchCustomerProfile = useCallback(async (customerId: string) => {
    setProfileLoading(true);
    try {
      const profile = await dataService.getCustomerProfile(customerId);
      setCustomerProfile(profile);
      if (profile) {
        setCustomerInfo((prev) => ({
          ...prev,
          address: profile.address_line_1 || "",
          city: profile.city || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching customer profile:", error);
      setCustomerProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) {
      console.log("No store_id available for products fetch");
      return;
    }
    setLoading(true);
    try {
      const res = await dataService.getProductsWithVariants(user.store_id);
      setProducts(res);
    } catch (err) {
      console.error("Error fetching products:", err);
      notification.error({
        message: "Error Loading Products",
        description: "Failed to load products. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, notification]);

  // Fetch customers with better error handling
  const fetchCustomers = useCallback(async () => {
    if (!user?.store_id) {
      console.log("No store_id available for customer fetch");
      return;
    }

    setCustomerLoading(true);
    try {
      console.log("Starting customer fetch for store:", user.store_id);
      const res = await dataService.getStoreCustomersSimple(user.store_id);
      setCustomers(res);
      setFilteredCustomers(res);

      if (res.length > 0) {
        notification.success({
          message: `Loaded ${res.length} Customers`,
          description: "Customer list updated successfully.",
        });
      } else {
        notification.info({
          message: "No Customers Found",
          description: "No existing customers found for your store.",
        });
      }
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      notification.error({
        message: "Error Loading Customers",
        description: `Failed to load customer list. Error: ${
          err?.message || "Unknown error"
        }`,
        duration: 4,
      });
    } finally {
      setCustomerLoading(false);
    }
  }, [user?.store_id, notification]);

  // Load data when user is available
  useEffect(() => {
    if (user?.store_id && !userLoading) {
      console.log("User loaded with store_id:", user.store_id);
      fetchProducts();
      fetchCustomers();
    }
  }, [user?.store_id, userLoading, fetchProducts, fetchCustomers]);

  // Filter customers based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.first_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Generate order ID
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const sessionCounter = Math.floor(Math.random() * 1000);
    setOrderId(
      `SHEI${year}${month}${day}${sessionCounter.toString().padStart(3, "0")}`
    );
  }, []);

  // Update delivery cost based on city
  useEffect(() => {
    if (customerInfo.city === "inside-dhaka") setDeliveryCost(80);
    else if (customerInfo.city === "outside-dhaka") setDeliveryCost(150);
    else setDeliveryCost(0);
  }, [customerInfo.city]);

  // Calculate totals
  useEffect(() => {
    const newSubtotal = orderProducts.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    setSubtotal(newSubtotal);
    setTotalAmount(newSubtotal - discount + deliveryCost + taxAmount);
  }, [orderProducts, discount, deliveryCost, taxAmount]);

  // Handle customer selection from dropdown
  const handleCustomerSelect = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerInfo({
        name: customer.first_name,
        phone: customer.phone || "",
        address: "",
        city: "",
        deliveryMethod: "courier",
        email: customer.email,
        customer_id: customer.id,
        notes: "",
        password: "AdminCustomer1232*",
      });
      await fetchCustomerProfile(customer.id);
    }
  };

  // Reset to new customer
  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setCustomerProfile(null);
    setSearchTerm("");
    setCustomerInfo({
      name: "",
      phone: "",
      address: "",
      deliveryMethod: "",
      city: "",
      email: "",
      notes: "",
      password: "AdminCustomer1232*",
    });
    setCustomerType("new");
  };

  // Handle customer type change
  const handleCustomerTypeChange = (type: CustomerType) => {
    if (type === "new") {
      handleNewCustomer();
    } else {
      setCustomerType("existing");
    }
  };

  // Customer type dropdown items
  const customerTypeItems = [
    {
      key: "new",
      label: (
        <Space>
          <Text>New Customer</Text>
        </Space>
      ),
      icon: <UserAddOutlined />,
    },
    {
      key: "existing",
      label: (
        <Space>
          <Text>Existing Customer</Text>
        </Space>
      ),
      icon: <UserOutlined />,
    },
  ];

  const isFormValid =
    customerInfo.name &&
    customerInfo.phone &&
    customerInfo.address &&
    customerInfo.city &&
    customerInfo.deliveryMethod &&
    orderProducts.length > 0;

  // Render customer content based on type
  const renderCustomerContent = () => {
    if (customerType === "new") {
      return (
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          orderId={orderId}
        />
      );
    }

    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Text strong>Select Existing Customer</Text>
          </Col>
          <Col>
            <Button type="default" onClick={handleNewCustomer}>
              New Customer Instead
            </Button>
          </Col>
        </Row>

        {customerLoading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Spin size="large" />
            <div style={{ marginTop: "16px" }}>
              <Text type="secondary">Loading customers...</Text>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>
                  {searchTerm
                    ? "No customers found matching your search"
                    : "No customers found"}
                </Text>
                <Button
                  type="primary"
                  onClick={fetchCustomers}
                  loading={customerLoading}
                >
                  Refresh Customer List
                </Button>
              </Space>
            }
          />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Select
              placeholder="Select a customer from the list..."
              value={selectedCustomer?.id || undefined}
              onChange={handleCustomerSelect}
              style={{ width: "100%" }}
              size="large"
              showSearch
              filterOption={false}
              notFoundContent={
                searchTerm ? "No customers found" : "Type to search customers"
              }
            >
              {filteredCustomers.map((customer) => (
                <Option key={customer.id} value={customer.id}>
                  <Space>
                    <Avatar icon={<UserOutlined />} size="small" />
                    <span>
                      {customer.first_name}
                      {customer.email && ` - ${customer.email}`}
                      {customer.phone && ` - ${customer.phone}`}
                    </span>
                  </Space>
                </Option>
              ))}
            </Select>

            {selectedCustomer && (
              <>
                <Card
                  title={
                    <Space>
                      <UserOutlined />
                      <Text strong>Selected Customer Information</Text>
                      <Tag color="blue">Existing Customer</Tag>
                      {profileLoading && <Spin size="small" />}
                    </Space>
                  }
                  style={{
                    border: "2px solid #1890ff",
                    backgroundColor: "#f0f8ff",
                  }}
                >
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Name">
                      <Text strong>{selectedCustomer.first_name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      <Space>
                        <MailOutlined />
                        <Text>{selectedCustomer.email}</Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      <Space>
                        <PhoneOutlined />
                        <Text>{selectedCustomer.phone || "Not provided"}</Text>
                      </Space>
                    </Descriptions.Item>
                    {customerProfile?.address_line_1 && (
                      <Descriptions.Item label="Address">
                        <Space>
                          <HomeOutlined />
                          <Text>{customerProfile.address_line_1}</Text>
                          {customerProfile.address_line_2 && (
                            <Text type="secondary">
                              {customerProfile.address_line_2}
                            </Text>
                          )}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {customerProfile?.city && (
                      <Descriptions.Item label="City">
                        <Text>{customerProfile.city}</Text>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Customer ID">
                      <Text type="secondary">{selectedCustomer.id}</Text>
                    </Descriptions.Item>
                  </Descriptions>

                  {customerProfile ? (
                    <Alert
                      message="Address Auto-filled"
                      description="Customer address and city have been auto-filled from their profile. You can modify these if needed for this specific order."
                      type="success"
                      showIcon
                      style={{ marginTop: "16px" }}
                    />
                  ) : (
                    <Alert
                      message="Address Required"
                      description="No address found in customer profile. Please manually enter the delivery address and city for this order."
                      type="info"
                      showIcon
                      style={{ marginTop: "16px" }}
                    />
                  )}
                </Card>

                <CustomerInfo
                  customerInfo={customerInfo}
                  setCustomerInfo={setCustomerInfo}
                  orderId={orderId}
                  isExistingCustomer={true}
                />
              </>
            )}

            {!selectedCustomer && filteredCustomers.length > 0 && (
              <Alert
                message="Select a Customer"
                description="Choose a customer from the dropdown above to pre-fill their information."
                type="info"
                showIcon
              />
            )}
          </Space>
        )}
      </Space>
    );
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Spin size="large" />
        <div className="mt-4">
          <Text type="secondary">Loading user information...</Text>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Spin size="large" />
        <div className="mt-4">
          <Text type="secondary">Loading products...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-full mx-auto">
        <Space direction="vertical" size="large" className="w-full">
          <div>
            <Title level={2} className="m-0">
              Create New Order
            </Title>
            <Text type="secondary">
              Create orders for new or existing customers
            </Text>
          </div>

          <Card
            className="w-full"
            styles={{
              body: {
                padding: "10px",
              },
            }}
          >
            {/* Customer Type Selector - Beautiful Dropdown */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <Text strong className="text-lg">
                    Customer Type
                  </Text>
                </div>

                {/* Mobile Dropdown */}
                <div className="block sm:hidden w-full">
                  <Dropdown
                    menu={{
                      items: customerTypeItems,
                      onClick: (e) =>
                        handleCustomerTypeChange(e.key as CustomerType),
                      selectedKeys: [customerType],
                    }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <Button
                      size="large"
                      className="w-full flex items-center justify-between"
                      style={{
                        background: "var(--ant-primary-1)",
                        borderColor: "var(--ant-primary-3)",
                      }}
                    >
                      <Space>
                        {customerType === "new" ? (
                          <UserAddOutlined />
                        ) : (
                          <UserOutlined />
                        )}
                        <Text strong>
                          {customerType === "new"
                            ? "New Customer"
                            : "Existing Customer"}
                        </Text>
                      </Space>
                      <DownOutlined className="text-xs" />
                    </Button>
                  </Dropdown>
                </div>

                {/* Desktop Buttons */}
                <div className="hidden sm:flex space-x-2">
                  <Button
                    type={customerType === "new" ? "primary" : "default"}
                    icon={<UserAddOutlined />}
                    onClick={() => handleCustomerTypeChange("new")}
                    size="large"
                  >
                    New Customer
                  </Button>
                  <Button
                    type={customerType === "existing" ? "primary" : "default"}
                    icon={<UserOutlined />}
                    onClick={() => handleCustomerTypeChange("existing")}
                    size="large"
                  >
                    Existing Customer
                  </Button>
                </div>
              </div>

              {/* Current Selection Indicator */}
              <div className="mt-3 p-3 rounded-lg border border-dashed border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <Space>
                  {customerType === "new" ? (
                    <>
                      <UserAddOutlined className="text-blue-600" />
                      <Text strong className="text-blue-600">
                        Creating order for a new customer
                      </Text>
                    </>
                  ) : (
                    <>
                      <UserOutlined className="text-green-600" />
                      <Text strong className="text-green-600">
                        {selectedCustomer
                          ? `Selected: ${selectedCustomer.first_name}`
                          : "Select an existing customer"}
                      </Text>
                    </>
                  )}
                </Space>
              </div>
            </div>

            {/* Customer Content */}
            {renderCustomerContent()}

            <Divider />

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <OrderDetails
                  products={products}
                  orderProducts={orderProducts}
                  setOrderProducts={setOrderProducts}
                />
              </Col>

              <Col xs={24} lg={12}>
                <OrderSummary
                  orderProducts={orderProducts}
                  subtotal={subtotal}
                  taxAmount={taxAmount}
                  setTaxAmount={setTaxAmount}
                  discount={discount}
                  setDiscount={setDiscount}
                  deliveryCost={deliveryCost}
                  setDeliveryCost={setDeliveryCost}
                  totalAmount={totalAmount}
                  status={status}
                  setStatus={setStatus}
                  paymentStatus={paymentStatus}
                  setPaymentStatus={setPaymentStatus}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                />
              </Col>
            </Row>

            <Divider />

            <Row justify="end">
              <Col>
                <SaveOrderButton
                  storeId={user?.store_id || ""}
                  orderId={orderId}
                  orderProducts={orderProducts}
                  customerInfo={customerInfo}
                  subtotal={subtotal}
                  taxAmount={taxAmount}
                  discount={discount}
                  deliveryCost={deliveryCost}
                  totalAmount={totalAmount}
                  status={status}
                  paymentStatus={paymentStatus}
                  paymentMethod={paymentMethod}
                  disabled={!isFormValid || !user?.store_id}
                  onCustomerCreated={fetchCustomers}
                />
              </Col>
            </Row>
          </Card>
        </Space>
      </div>
    </div>
  );
}
