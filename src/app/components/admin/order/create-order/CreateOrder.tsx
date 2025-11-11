// app/components/admin/order/create-order/CreateOrder.tsx
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
import AdminOrderDetails from "./AdminOrderDetails";
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
import type { CustomerProfile } from "@/lib/types/customer";
import {
  getStoreSettings,
  type ShippingFee,
} from "@/lib/queries/stores/getStoreSettings";
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import { DetailedCustomer } from "@/lib/types/users";

const { Title, Text } = Typography;
const { Option } = Select;

type CustomerType = "new" | "existing";

export default function CreateOrder() {
  const { notification } = App.useApp();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [customers, setCustomers] = useState<DetailedCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<
    DetailedCustomer[]
  >([]);

  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading: userLoading, storeSlug } = useCurrentUser();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfoType>({
    name: "",
    phone: "",
    address: "",
    deliveryMethod: "",
    deliveryOption: "",
    city: "",
    email: "",
    notes: "",
    password: "AdminCustomer1232*",
    postal_code: "",
  });

  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [status, setStatus] = useState<
    "pending" | "confirmed" | "completed" | "cancelled" | "shipped"
  >("pending");
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "paid" | "failed" | "refunded"
  >("pending");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [orderId, setOrderId] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("new");
  const [selectedCustomer, setSelectedCustomer] =
    useState<DetailedCustomer | null>(null);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [shippingFees, setShippingFees] = useState<ShippingFee[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [hasFetchedData, setHasFetchedData] = useState(false);

  // Fetch store name for order ID prefix
  const [storeName, setStoreName] = useState<string>("SHEI");

  // Fetch store settings with shipping fees
  const fetchStoreSettings = useCallback(async () => {
    if (!user?.store_id || settingsLoading) return;

    setSettingsLoading(true);
    try {
      const settings = await getStoreSettings(user.store_id);
      if (settings) {
        setShippingFees(settings.shipping_fees || []);
        if (settings.tax_rate) {
          setTaxAmount(settings.tax_rate);
        }
      }
    } catch (error) {
      console.error("Error fetching store settings:", error);
      notification.error({
        message: "Error Loading Store Settings",
        description: "Failed to load shipping fees and tax rates.",
      });
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.store_id, notification]);

  // Fetch store name for order ID
  const fetchStoreName = useCallback(async () => {
    if (!user?.store_id) return;

    try {
      const { data: storeData, error } = await dataService.getStoreById(
        user.store_id
      );
      if (error) {
        console.error("Error fetching store:", error);
        setStoreName("SHEI");
        return;
      }

      if (storeData?.store_name) {
        // Get first 4 characters of store name in uppercase, or use SHEI as fallback
        const prefix = storeData.store_name
          .replace(/\s+/g, "") // Remove spaces
          .substring(0, 4)
          .toUpperCase();
        setStoreName(prefix || "SHEI");
      }
    } catch (error) {
      console.error("Error fetching store name:", error);
      setStoreName("SHEI"); // Fallback to SHEI
    }
  }, [user?.store_id]);

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
          postal_code: profile.postal_code || "",
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
    if (!user?.store_id || loading) return;

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

  const fetchCustomers = useCallback(async () => {
    if (!user?.store_id || customerLoading) return;

    setCustomerLoading(true);
    try {
      // Combine customers from users + orders
      const res = await getAllStoreCustomers(user.store_id);
      setCustomers(res);
      setFilteredCustomers(res);
    } catch (err: any) {
      console.error("Error fetching all customers:", err);
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

  // Main data fetching effect - runs only once
  useEffect(() => {
    if (user?.store_id && !userLoading && !hasFetchedData) {
      console.log("🔄 Initial data fetch for store:", user.store_id);
      setHasFetchedData(true);

      // Fetch store name first for order ID
      fetchStoreName().then(() => {
        // Then fetch all other data
        Promise.all([
          fetchProducts(),
          fetchCustomers(),
          fetchStoreSettings(),
        ]).catch((error) => {
          console.error("Error in initial data fetch:", error);
        });
      });
    }
  }, [
    user?.store_id,
    userLoading,
    hasFetchedData,
    fetchProducts,
    fetchCustomers,
    fetchStoreSettings,
    fetchStoreName,
  ]);

  // Generate order ID with store name prefix
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const sessionCounter = Math.floor(Math.random() * 1000);

    setOrderId(
      `${storeName}${year}${month}${day}${sessionCounter
        .toString()
        .padStart(3, "0")}`
    );
  }, [storeName]); // Regenerate when store name changes

  // Filter customers based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          (customer.first_name?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          ) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.phone?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          )
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Update delivery cost based on delivery option from shipping fees
  useEffect(() => {
    if (
      customerInfo.deliveryOption &&
      Array.isArray(shippingFees) &&
      shippingFees.length > 0
    ) {
      const shippingFee = shippingFees.find((fee) => {
        if (!fee || typeof fee !== "object" || !fee.name) return false;

        const feeName = String(fee.name).toLowerCase().replace(/\s+/g, "-");
        const deliveryOption = String(
          customerInfo.deliveryOption
        ).toLowerCase();

        return (
          feeName.includes(deliveryOption) || deliveryOption.includes(feeName)
        );
      });

      setDeliveryCost(shippingFee?.price || 0);
    } else {
      setDeliveryCost(0);
    }
  }, [customerInfo.deliveryOption, shippingFees]);

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

      setCustomerInfo((prev) => ({
        ...prev,
        name: customer.first_name || "",
        phone: customer.phone || "",
        email: customer.email,
        customer_id: customer.id,
      }));

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
      deliveryOption: "",
      deliveryMethod: "",
      city: "",
      email: "",
      notes: "",
      password: "AdminCustomer1232*",
      postal_code: "",
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
    customerInfo.postal_code &&
    customerInfo.city &&
    customerInfo.deliveryMethod &&
    customerInfo.deliveryOption &&
    orderProducts.length > 0;

  // Render customer content based on type
  const renderCustomerContent = () => {
    if (customerType === "new") {
      return (
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          orderId={orderId}
          shippingFees={shippingFees}
          settingsLoading={settingsLoading}
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
                      {customer.first_name || "Unnamed Customer"}
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
                      <Text strong>
                        {selectedCustomer.first_name || "Unnamed Customer"}
                      </Text>
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
                  </Descriptions>

                  {customerProfile ? (
                    <Alert
                      message="Profile Auto-filled"
                      description="Customer address, city, and postal code have been auto-filled from their profile. You can modify these if needed for this specific order."
                      type="success"
                      showIcon
                      style={{ marginTop: "16px" }}
                    />
                  ) : (
                    <Alert
                      message="Address Required"
                      description="No address found in customer profile. Please manually enter the delivery address, city, and postal code for this order."
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
                  shippingFees={shippingFees}
                  settingsLoading={settingsLoading}
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
                <div className="hidden sm:flex gap-x-4">
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
                <AdminOrderDetails
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
                  shippingFees={shippingFees}
                  customerDeliveryOption={customerInfo.deliveryOption}
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
