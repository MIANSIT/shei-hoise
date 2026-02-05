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
import type { CustomerProfile } from "@/lib/types/customer";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import type { ShippingFee } from "@/lib/types/store/store";
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import { DetailedCustomer } from "@/lib/types/users";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
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
  // const { user, loading: userLoading, storeSlug } = useCurrentUser();
  const { user, loading: userLoading } = useCurrentUser();
  const [storeName, setStoreName] = useState<string>("");

  const [customerInfo, setCustomerInfo] = useState<CustomerInfoType>({
    name: "",
    phone: "",
    address: "",
    deliveryMethod: "",
    deliveryOption: "",
    city: "",
    email: "",
    notes: "",
    postal_code: "",
  });

  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [status, setStatus] = useState<OrderStatus>(OrderStatus.PENDING); // ✅ Using enum
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    PaymentStatus.PENDING,
  ); // ✅ Using enum
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

  // Email validation state
  const [emailError, setEmailError] = useState<string>("");

  // Validate email uniqueness
  const validateEmailUniqueness = useCallback(
    (email: string): boolean => {
      if (!email) return true;

      const normalizedEmail = email.toLowerCase().trim();
      const existingCustomer = customers.find(
        (customer) => customer.email.toLowerCase().trim() === normalizedEmail,
      );

      if (existingCustomer && customerType === "new") {
        setEmailError(
          `Email already exists for customer: ${
            existingCustomer.name || "Unnamed Customer"
          }`,
        );
        return false;
      }

      setEmailError("");
      return true;
    },
    [customers, customerType],
  );

  // Handle email changes with validation
  const handleEmailChange = useCallback(
    (email: string) => {
      setCustomerInfo((prev) => ({ ...prev, email }));
      validateEmailUniqueness(email);
    },
    [validateEmailUniqueness],
  );

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
  }, [user?.store_id, settingsLoading, notification]);

  // Fetch store name for order ID
  const fetchStoreName = useCallback(async () => {
    if (!user?.store_id) return;

    try {
      const { data: storeData, error } = await dataService.getStoreById(
        user.store_id,
      );
      if (error) {
        console.error("Error fetching store:", error);
        return;
      }

      if (storeData?.store_name) {
        const prefix = storeData.store_name
          .replace(/\s+/g, "")
          .substring(0, 4)
          .toUpperCase();
        setStoreName(prefix);
      }
    } catch (error) {
      console.error("Error fetching store name:", error);
    }
  }, [user?.store_id]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!user?.store_id || loading) return;

    setLoading(true);
    try {
      const res = await dataService.getProductsWithVariants({
        storeId: user.store_id,
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      notification.error({
        message: "Error Loading Products",
        description: "Failed to load products. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, loading, notification]);

  // Fetch customers from orders
  // Fetch customers from orders
  const fetchCustomers = useCallback(async () => {
    if (!user?.store_id || customerLoading) return;

    setCustomerLoading(true);
    try {
      const res = await getAllStoreCustomers(user.store_id);

      // Handle both return types
      let customerArray: DetailedCustomer[] = [];

      if (Array.isArray(res)) {
        // It's already an array
        customerArray = res;
      } else if (res && typeof res === "object" && "customers" in res) {
        // It's a PaginatedCustomers object - extract the customers array
        customerArray = res.customers;
      }

      setCustomers(customerArray);
      setFilteredCustomers(customerArray);

      // Re-validate email after fetching customers
      if (customerInfo.email) {
        validateEmailUniqueness(customerInfo.email);
      }
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      notification.error({
        message: "Error Loading Customers",
        description: "Failed to load customer list from orders.",
        duration: 4,
      });
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  }, [
    user?.store_id,
    customerLoading,
    customerInfo.email,
    validateEmailUniqueness,
    notification,
  ]);

  // Main data fetching effect
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (user?.store_id && !userLoading && !hasFetchedData) {
      setHasFetchedData(true);

      const fetchAll = async () => {
        try {
          await Promise.allSettled([
            fetchStoreName(), // fetch store prefix
            fetchProducts(), // fetch products
            fetchCustomers(), // fetch customers
            fetchStoreSettings(), // fetch shipping fees & tax
          ]);
        } catch (error) {
          console.error("Error fetching initial data:", error);
        } finally {
          setInitialLoading(false);
        }
      };

      fetchAll();
    }
  }, [
    user?.store_id,
    userLoading,
    hasFetchedData,
    fetchStoreName,
    fetchProducts,
    fetchCustomers,
    fetchStoreSettings,
  ]);

  // Generate order ID with store name prefix
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const sessionCounter = Math.floor(Math.random() * 1000);

    const newOrderId = `${storeName}${year}${month}${day}${sessionCounter
      .toString()
      .padStart(3, "0")}`;

    setOrderId(newOrderId);
  }, [storeName]);

  // Filter customers based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          (customer.name?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.phone?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ),
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Update delivery cost based on delivery option
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
          customerInfo.deliveryOption,
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

  // Calculate totals including additional charges
  useEffect(() => {
    const newSubtotal = orderProducts.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    setSubtotal(newSubtotal);

    // Calculate total amount with all components
    const calculatedTotal =
      newSubtotal - discount + additionalCharges + deliveryCost + taxAmount;
    setTotalAmount(calculatedTotal);
  }, [orderProducts, discount, additionalCharges, deliveryCost, taxAmount]);

  // Handle customer selection
  const handleCustomerSelect = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);

    if (customer) {
      setSelectedCustomer(customer);
      setProfileLoading(true);

      setCustomerInfo((prev) => ({
        ...prev,
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email,
        customer_id: customer.id,
      }));

      setEmailError("");

      if (customer.profile_details) {
        setCustomerInfo((prev) => ({
          ...prev,
          address:
            customer.profile_details?.address ||
            customer.profile_details?.address_line_1 ||
            "",
          city: customer.profile_details?.city || "",
          postal_code: customer.profile_details?.postal_code || "",
        }));
        setCustomerProfile({
          store_customer_id: customer.id, // or customer.profile_details.store_customer_id if it exists
          id: customer.id,
          address:
            customer.profile_details.address ||
            customer.profile_details.address_line_1 ||
            "",
          city: customer.profile_details.city || "",
          postal_code: customer.profile_details.postal_code || "",
          country: customer.profile_details.country || "",
        });
      } else {
        setCustomerProfile(null);
      }

      setProfileLoading(false);
    }
  };

  // Reset to new customer
  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setCustomerProfile(null);
    setSearchTerm("");
    setEmailError("");
    setCustomerInfo({
      name: "",
      phone: "",
      address: "",
      deliveryOption: "",
      deliveryMethod: "",
      city: "",
      email: "",
      notes: "",
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
      setEmailError("");
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
    orderProducts.length > 0 &&
    !emailError;

  // Render customer content based on type
  const renderCustomerContent = () => {
    if (customerType === "new") {
      return (
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          onEmailChange={handleEmailChange}
          emailError={emailError}
          orderId={orderId}
          shippingFees={shippingFees}
          settingsLoading={settingsLoading}
        />
      );
    }

    return (
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
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
              <Space orientation="vertical">
                <Text>No customers found from order history</Text>
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
          <Space orientation="vertical" style={{ width: "100%" }} size="large">
            <Select
              placeholder="Select a customer from order history..."
              value={selectedCustomer?.id || undefined}
              onChange={handleCustomerSelect}
              style={{ width: "100%" }}
              size="large"
              showSearch={{
                filterOption: (input, option) => {
                  const customer = option?.children?.[1]?.props?.children || "";
                  return customer.toLowerCase().includes(input.toLowerCase());
                },
                onSearch: setSearchTerm,
              }}
              notFoundContent={
                searchTerm ? "No customers found" : "Type to search customers"
              }
            >
              {filteredCustomers.map((customer) => (
                <Option key={customer.id} value={customer.id}>
                  <Space>
                    <Avatar icon={<UserOutlined />} size="small" />
                    <span>
                      {customer.name || "Unnamed Customer"}
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
                  className="
    border-2
    border-[#1890ff]
    bg-[#f0f8ff]

    dark:border-[#177ddc]
    dark:bg-[rgba(24,144,255,0.18)]
  "
                  title={
                    <Space>
                      <UserOutlined className="text-[#1890ff] dark:text-[#69b1ff]" />

                      <Text
                        strong
                        className="text-[#1f1f1f] dark:text-[#e6f4ff]"
                      >
                        Selected Customer Information
                      </Text>

                      <Tag
                        className="
          border-[#1890ff]
          text-[#1890ff]
          bg-[#e6f4ff]

          dark:border-[#177ddc]
          dark:text-[#69b1ff]
          dark:bg-[rgba(24,144,255,0.25)]
        "
                      >
                        Existing Customer
                      </Tag>

                      {profileLoading && <Spin size="small" />}
                    </Space>
                  }
                >
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Name">
                      <Text strong>
                        {selectedCustomer.name || "Unnamed Customer"}
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
                    <Descriptions.Item label="Order Count">
                      <Text>{selectedCustomer.order_count || 0} orders</Text>
                    </Descriptions.Item>
                    {customerProfile?.address && (
                      <Descriptions.Item label="Address">
                        <Space>
                          <HomeOutlined />
                          <Text>{customerProfile.address}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {customerProfile ? (
                    <Alert
                      title="Address Auto-filled"
                      description="Customer address has been auto-filled from their recent order. You can modify if needed."
                      type="success"
                      showIcon
                      style={{ marginTop: "16px" }}
                    />
                  ) : (
                    <Alert
                      title="Address Required"
                      description="Please enter the delivery address, city, and postal code for this order."
                      type="info"
                      showIcon
                      style={{ marginTop: "16px" }}
                    />
                  )}
                </Card>

                <CustomerInfo
                  customerInfo={customerInfo}
                  setCustomerInfo={setCustomerInfo}
                  onEmailChange={handleEmailChange}
                  emailError={emailError}
                  orderId={orderId}
                  isExistingCustomer={true}
                  shippingFees={shippingFees}
                  settingsLoading={settingsLoading}
                />
              </>
            )}

            {!selectedCustomer && filteredCustomers.length > 0 && (
              <Alert
                title="Select a Customer"
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

  if (userLoading || initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Spin size="large" />
        <div className="mt-4">
          <Text type="secondary">Loading data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className=" overflow-auto">
      <div className="max-w-6xl mx-auto">
        <Space orientation="vertical" size="large" className="w-full">
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
            {/* Customer Type Selector */}
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
                          ? `Selected: ${selectedCustomer.name}`
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
                  additionalCharges={additionalCharges}
                  setAdditionalCharges={setAdditionalCharges}
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
                  additionalCharges={additionalCharges}
                  deliveryCost={deliveryCost}
                  totalAmount={totalAmount}
                  status={status}
                  paymentStatus={paymentStatus}
                  paymentMethod={paymentMethod}
                  disabled={!isFormValid || !user?.store_id || !!emailError}
                  onCustomerCreated={fetchCustomers}
                  emailError={emailError}
                />
              </Col>
            </Row>
          </Card>
        </Space>
      </div>
    </div>
  );
}
