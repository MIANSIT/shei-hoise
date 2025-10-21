/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/admin/order/create-order/CreateOrder.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Tabs,
  Input,
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
  App
} from "antd";
import {
  UserAddOutlined,
  UserOutlined,
  SearchOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined
} from "@ant-design/icons";
import CustomerInfo from "./CustomerInfo";
import OrderDetails from "./OrderDetails";
import OrderSummary from "./OrderSummary";
import SaveOrderButton from "./SaveOrderButton";
import { CustomerInfo as CustomerInfoType, OrderProduct } from "@/lib/types/order";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getProductsWithVariants, ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { getStoreCustomersSimple, StoreCustomer } from "@/lib/queries/customers/getStoreCustomersSimple";
import { supabaseAdmin } from "@/lib/supabase";

const { Title, Text } = Typography;
const { Option } = Select;

interface CustomerProfile {
  user_id: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export default function CreateOrder() {
  const { notification } = App.useApp();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<StoreCustomer[]>([]);
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
    password: "",
  });

  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [status, setStatus] = useState<"pending" | "confirmed" | "completed" | "cancelled">("pending");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed" | "refunded">("pending");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [orderId, setOrderId] = useState("");
  const [customerTab, setCustomerTab] = useState<string>("new");
  const [selectedCustomer, setSelectedCustomer] = useState<StoreCustomer | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch customer profile data from user_profiles table
  const fetchCustomerProfile = useCallback(async (customerId: string) => {
    setProfileLoading(true);
    try {
      console.log('Fetching profile for customer:', customerId);
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles') // Using the correct table name
        .select('*')
        .eq('user_id', customerId)
        .single();

      if (error) {
        console.log('No profile found for customer:', error.message);
        setCustomerProfile(null);
      } else {
        console.log('Profile found:', profile);
        setCustomerProfile(profile);
        
        // Auto-populate address and city if available
        if (profile) {
          setCustomerInfo(prev => ({
            ...prev,
            address: profile.address_line_1 || "",
            city: profile.city || ""
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      setCustomerProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) {
      console.log('No store_id available for products fetch');
      return;
    }
    setLoading(true);
    try {
      const res = await getProductsWithVariants(user.store_id);
      setProducts(res);
    } catch (err) {
      console.error("Error fetching products:", err);
      notification.error({
        message: 'Error Loading Products',
        description: 'Failed to load products. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, notification]);

  // Fetch customers with better error handling
  const fetchCustomers = useCallback(async () => {
    if (!user?.store_id) {
      console.log('No store_id available for customer fetch');
      return;
    }
    
    setCustomerLoading(true);
    try {
      console.log('Starting customer fetch for store:', user.store_id);
      
      const res = await getStoreCustomersSimple(user.store_id);
      setCustomers(res);
      setFilteredCustomers(res);
      
      if (res.length > 0) {
        notification.success({
          message: `Loaded ${res.length} Customers`,
          description: 'Customer list updated successfully.',
        });
      } else {
        notification.info({
          message: 'No Customers Found',
          description: 'No existing customers found for your store.',
        });
      }
      
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      
      notification.error({
        message: 'Error Loading Customers',
        description: `Failed to load customer list. Error: ${err?.message || 'Unknown error'}`,
        duration: 4,
      });
    } finally {
      setCustomerLoading(false);
    }
  }, [user?.store_id, notification]);

  // Load data when user is available
  useEffect(() => {
    if (user?.store_id && !userLoading) {
      console.log('User loaded with store_id:', user.store_id);
      fetchProducts();
      fetchCustomers();
    }
  }, [user?.store_id, userLoading, fetchProducts, fetchCustomers]);

  // Filter customers based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    setOrderId(`SHEI${year}${month}${day}${sessionCounter.toString().padStart(3, "0")}`);
  }, []);

  // Update delivery cost based on city
  useEffect(() => {
    if (customerInfo.city === "inside-dhaka") setDeliveryCost(80);
    else if (customerInfo.city === "outside-dhaka") setDeliveryCost(150);
    else setDeliveryCost(0);
  }, [customerInfo.city]);

  // Calculate totals
  useEffect(() => {
    const newSubtotal = orderProducts.reduce((sum, item) => sum + item.total_price, 0);
    setSubtotal(newSubtotal);
    setTotalAmount(newSubtotal - discount + deliveryCost + taxAmount);
  }, [orderProducts, discount, deliveryCost, taxAmount]);

  // Handle customer selection from dropdown
  const handleCustomerSelect = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      
      // Reset customer info first
      setCustomerInfo({
        name: customer.first_name,
        phone: customer.phone || "",
        address: "", // Will be populated from profile
        city: "", // Will be populated from profile
        deliveryMethod: "courier",
        email: customer.email,
        customer_id: customer.id,
        notes: "",
        password: "", // Not needed for existing customers
      });

      // Fetch and populate profile data
      await fetchCustomerProfile(customer.id);
    }
  };

  // Reset to new customer
  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setCustomerProfile(null);
    setCustomerInfo({
      name: "",
      phone: "",
      address: "",
      deliveryMethod: "",
      city: "",
      email: "",
      notes: "",
      password: "",
    });
    setCustomerTab("new");
  };

  const isFormValid = 
    customerInfo.name && 
    customerInfo.phone && 
    customerInfo.address && 
    customerInfo.city && 
    customerInfo.deliveryMethod && 
    orderProducts.length > 0;

  // Tabs configuration using items prop
  const tabItems = [
    {
      key: 'new',
      label: (
        <span>
          <UserAddOutlined />
          New Customer
        </span>
      ),
      children: (
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          orderId={orderId}
        />
      ),
    },
    {
      key: 'existing',
      label: (
        <span>
          <UserOutlined />
          Existing Customer
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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

          <Input
            placeholder="Search customers by name, email, or phone..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="large"
          />

          {customerLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">Loading customers...</Text>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical">
                  <Text>{searchTerm ? "No customers found matching your search" : "No customers found"}</Text>
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
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Customer Dropdown */}
              <Select
                placeholder="Select a customer from the list..."
                value={selectedCustomer?.id || undefined}
                onChange={handleCustomerSelect}
                style={{ width: '100%' }}
                size="large"
                showSearch
                filterOption={false}
                notFoundContent={searchTerm ? "No customers found" : "Type to search customers"}
              >
                {filteredCustomers.map(customer => (
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

              {/* Selected Customer Information */}
              {selectedCustomer && (
                <Card 
                  title={
                    <Space>
                      <UserOutlined />
                      <Text strong>Selected Customer Information</Text>
                      <Tag color="blue">Existing Customer</Tag>
                      {profileLoading && <Spin size="small" />}
                    </Space>
                  }
                  style={{ border: '2px solid #1890ff', backgroundColor: '#f0f8ff' }}
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
                            <Text type="secondary">{customerProfile.address_line_2}</Text>
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
                      style={{ marginTop: '16px' }}
                    />
                  ) : (
                    <Alert
                      message="Address Required"
                      description="No address found in customer profile. Please manually enter the delivery address and city for this order."
                      type="info"
                      showIcon
                      style={{ marginTop: '16px' }}
                    />
                  )}
                </Card>
              )}

              {/* Customer Info Form for Address Details */}
              {selectedCustomer && (
                <CustomerInfo
                  customerInfo={customerInfo}
                  setCustomerInfo={setCustomerInfo}
                  orderId={orderId}
                  isExistingCustomer={true}
                />
              )}
            </Space>
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
      ),
    },
  ];

  if (userLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">Loading user information...</Text>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">Loading products...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                Create New Order
              </Title>
              <Text type="secondary">
                Create orders for new or existing customers
              </Text>
            </div>

            <Card>
              <Tabs 
                activeKey={customerTab} 
                onChange={setCustomerTab}
                size="large"
                items={tabItems}
              />

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
        </Col>
      </Row>
    </div>
  );
}