/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Spin,
  Alert,
  Divider,
  Typography,
  Space,
  Descriptions,
  App,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import CustomerInfo from "../create-order/CustomerInfo";
import OrderDetails from "../create-order/OrderDetails";
import OrderSummary from "../create-order/OrderSummary";
import UpdateOrderButton from "./UpdateOrderButton";
import {
  CustomerInfo as CustomerInfoType,
  OrderProduct,
} from "@/lib/types/order";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import type { CustomerProfile } from "@/lib/queries/customers/getCustomerProfile";
import {
  getStoreSettings,
  type ShippingFee,
} from "@/lib/queries/stores/getStoreSettings";

const { Title, Text } = Typography;

interface EditOrderProps {
  orderNumber: string;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "shipped";
  subtotal: number;
  tax_amount: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  shipping_address: any;
  billing_address: any;
  notes: string;
  delivery_option: string;
  order_items: OrderItemData[];
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    user_type?: string;
    is_active?: boolean;
  };
  customer_profile?: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

interface OrderItemData {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_details: any;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function EditOrder({ orderNumber }: EditOrderProps) {
  const { notification } = App.useApp();
  const router = useRouter();

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(true);
  const { user, loading: userLoading } = useCurrentUser();

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
    customer_id: "",
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
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<OrderData | null>(null);

  // Store settings states
  const [shippingFees, setShippingFees] = useState<ShippingFee[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Fetch store settings with shipping fees
  const fetchStoreSettings = useCallback(async () => {
    if (!user?.store_id) return;

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

  // Fetch customer profile data
  const fetchCustomerProfile = useCallback(async (customerId: string) => {
    setProfileLoading(true);
    try {
      const profile = await dataService.getCustomerProfile(customerId);
      setCustomerProfile(profile);
      if (profile) {
        setCustomerInfo((prev) => ({
          ...prev,
          address: profile.address_line_1 || prev.address,
          city: profile.city || prev.city,
          postal_code: profile.postal_code || prev.postal_code,
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

  // Fetch order data
  const fetchOrderData = useCallback(async () => {
    if (!user?.store_id || !orderNumber) return;

    setOrderLoading(true);
    try {
      const order = await dataService.getOrderByNumber(
        user.store_id,
        orderNumber
      );
      if (order) {
        setOriginalOrder(order);
        setOrderId(order.order_number);

        // Set order status and payment info
        setStatus(order.status);
        setPaymentStatus(order.payment_status);
        setPaymentMethod(order.payment_method);

        // Set financial data - ALWAYS set delivery cost from API response
        setSubtotal(Number(order.subtotal));
        setTaxAmount(Number(order.tax_amount));
        setDeliveryCost(Number(order.shipping_fee)); // This is crucial
        setTotalAmount(Number(order.total_amount));

        // Set customer info from order
        if (order.customer) {
          setCustomerInfo((prev) => ({
            ...prev,
            name: order.customer?.first_name || "",
            phone: order.customer?.phone || "",
            email: order.customer?.email || "",
            customer_id: order.customer_id,
          }));

          // Use customer profile data if available
          if (order.customer_profile) {
            setCustomerInfo((prev) => ({
              ...prev,
              address: order.customer_profile?.address_line_1 || prev.address,
              city: order.customer_profile?.city || prev.city,
              postal_code:
                order.customer_profile?.postal_code || prev.postal_code,
            }));
          }

          // Set shipping address info - prioritize shipping address over customer profile
          if (order.shipping_address) {
            setCustomerInfo((prev) => ({
              ...prev,
              address: order.shipping_address.address_line_1 || prev.address,
              city: order.shipping_address.city || prev.city,
              postal_code:
                order.shipping_address.postal_code || prev.postal_code,
              deliveryMethod: order.delivery_option || "",
              deliveryOption: order.shipping_address.deliveryOption || "",
              notes: order.notes || "",
            }));
          }

          await fetchCustomerProfile(order.customer_id);
        }

        // Convert order items to OrderProduct format
        const convertedOrderProducts: OrderProduct[] = order.order_items.map(
          (item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            variant_details: item.variant_details,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price),
            variant_name: item.variant_details?.variant_name,
          })
        );

        setOrderProducts(convertedOrderProducts);
      }
    } catch (error) {
      console.error("Error fetching order data:", error);
      notification.error({
        message: "Error Loading Order",
        description: "Failed to load order data. Please try again.",
      });
    } finally {
      setOrderLoading(false);
    }
  }, [user?.store_id, orderNumber, fetchCustomerProfile]);

  // Auto-select delivery option based on shipping fee from backend
  useEffect(() => {
    if (
      originalOrder &&
      shippingFees.length > 0 &&
      !customerInfo.deliveryOption
    ) {
      const currentShippingFee = Number(originalOrder.shipping_fee);
      console.log(
        "🔄 Auto-selecting delivery option for fee:",
        currentShippingFee
      );
      console.log("Available shipping fees:", shippingFees);

      // Method 1: Try to find exact match with shipping fees
      const matchingShippingFee = shippingFees.find(
        (fee) => fee.price === currentShippingFee
      );

      if (matchingShippingFee) {
        // Found exact match - use the shipping fee's name
        const deliveryOptionValue = matchingShippingFee.name
          .toLowerCase()
          .replace(/\s+/g, "-");
        console.log("✅ Exact match found:", deliveryOptionValue);

        setCustomerInfo((prev) => ({
          ...prev,
          deliveryOption: deliveryOptionValue,
        }));
      } else {
        // No exact match - check if it's a custom amount
        const standardFees = shippingFees.map((fee) => fee.price);
        const isCustomAmount = !standardFees.includes(currentShippingFee);

        if (isCustomAmount) {
          console.log(
            "🔧 Custom delivery amount detected:",
            currentShippingFee
          );
          setCustomerInfo((prev) => ({
            ...prev,
            deliveryOption: "custom",
          }));
        } else {
          // Find closest match for standard amounts
          const closestFee = shippingFees.reduce((prev, curr) => {
            return Math.abs(curr.price - currentShippingFee) <
              Math.abs(prev.price - currentShippingFee)
              ? curr
              : prev;
          });

          if (closestFee) {
            const deliveryOptionValue = closestFee.name
              .toLowerCase()
              .replace(/\s+/g, "-");
            console.log("📌 Using closest match:", deliveryOptionValue);

            setCustomerInfo((prev) => ({
              ...prev,
              deliveryOption: deliveryOptionValue,
            }));
          }
        }
      }
    }
  }, [originalOrder, shippingFees, customerInfo.deliveryOption]);

  // Update delivery cost when delivery option changes (only for standard options)
  useEffect(() => {
    if (customerInfo.deliveryOption && shippingFees.length > 0) {
      // Don't change delivery cost for custom option - keep the backend value
      if (customerInfo.deliveryOption === "custom") {
        console.log(
          "🔧 Custom delivery - keeping backend value:",
          deliveryCost
        );
        return;
      }

      const shippingFee = shippingFees.find((fee) => {
        if (!fee || typeof fee !== "object" || !fee.name) return false;
        const feeName = String(fee.name).toLowerCase().replace(/\s+/g, "-");
        const deliveryOption = String(
          customerInfo.deliveryOption
        ).toLowerCase();
        return feeName === deliveryOption;
      });

      if (shippingFee) {
        console.log("🔄 Updating delivery cost to:", shippingFee.price);
        setDeliveryCost(shippingFee.price);
      }
    }
  }, [customerInfo.deliveryOption, shippingFees]);

  // Initialize data
  useEffect(() => {
    if (user?.store_id && !userLoading) {
      const initializeData = async () => {
        try {
          // Fetch all data
          await Promise.all([
            fetchProducts(),
            fetchStoreSettings(),
            fetchOrderData(),
          ]);
        } catch (error) {
          console.error("Error initializing data:", error);
        }
      };

      initializeData();
    }
  }, [user?.store_id, userLoading]);

  // Debug logging
  useEffect(() => {
    console.log("🎯 Current Delivery State:", {
      backendShippingFee: originalOrder?.shipping_fee,
      currentDeliveryCost: deliveryCost,
      selectedDeliveryOption: customerInfo.deliveryOption,
      isCustom: customerInfo.deliveryOption === "custom",
    });
  }, [deliveryCost, customerInfo.deliveryOption, originalOrder]);

  useEffect(() => {
    console.log("🔄 Order Products Updated:", orderProducts);
    console.log("📊 Order Products Count:", orderProducts.length);
    console.log("💰 Subtotal:", subtotal);
  }, [orderProducts, subtotal]);

  // Calculate totals
  useEffect(() => {
    const newSubtotal = orderProducts.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    setSubtotal(newSubtotal);
    setTotalAmount(newSubtotal - discount + deliveryCost + taxAmount);
  }, [orderProducts, discount, deliveryCost, taxAmount]);

  const isFormValid =
    customerInfo.name &&
    customerInfo.phone &&
    customerInfo.address &&
    customerInfo.postal_code &&
    customerInfo.city &&
    customerInfo.deliveryMethod &&
    customerInfo.deliveryOption &&
    orderProducts.length > 0;

  // Render customer information
  const renderCustomerInfo = () => {
    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card
          title={
            <Space>
              <UserOutlined />
              <Text strong>Customer Information</Text>
              <Tag color="blue">Existing Customer</Tag>
              {profileLoading && <Spin size="small" />}
            </Space>
          }
          style={{
            border: "2px solid #1890ff",
            backgroundColor: "#f0f8ff",
          }}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Name">
              <Text strong>{customerInfo.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <Space>
                <MailOutlined />
                <Text>{customerInfo.email}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              <Space>
                <PhoneOutlined />
                <Text>{customerInfo.phone || "Not provided"}</Text>
              </Space>
            </Descriptions.Item>
            {originalOrder?.customer?.user_type && (
              <Descriptions.Item label="User Type">
                <Text>{originalOrder.customer.user_type}</Text>
              </Descriptions.Item>
            )}
            {originalOrder?.customer?.is_active !== undefined && (
              <Descriptions.Item label="Status">
                <Tag color={originalOrder.customer.is_active ? "green" : "red"}>
                  {originalOrder.customer.is_active ? "Active" : "Inactive"}
                </Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Address">
              <Space>
                <HomeOutlined />
                <Text>{customerInfo.address || "Not provided"}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="City">
              <Text>{customerInfo.city || "Not provided"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Postal Code">
              <Text>{customerInfo.postal_code || "Not provided"}</Text>
            </Descriptions.Item>
            {originalOrder?.customer_profile?.country && (
              <Descriptions.Item label="Country">
                <Text>{originalOrder.customer_profile.country}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
          {customerProfile ? (
            <Alert
              message="Profile Auto-filled"
              description="Customer information has been auto-filled from their profile. You can modify the delivery details for this specific order."
              type="success"
              showIcon
              style={{ marginTop: "16px" }}
            />
          ) : (
            <Alert
              message="Customer Information"
              description="This order is linked to an existing customer. You can modify the delivery details for this specific order."
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
      </Space>
    );
  };

  if (userLoading || orderLoading) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Spin size="large" />
        <Text type="secondary" className="mt-4">
          {userLoading
            ? "Loading user information..."
            : "Loading order data..."}
        </Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Spin size="large" />
        <Text type="secondary" className="mt-4">
          Loading products...
        </Text>
      </div>
    );
  }

  if (!originalOrder) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Alert
          message="Order Not Found"
          description={`Order with number ${orderNumber} was not found.`}
          type="error"
          showIcon
        />
        <Button
          type="primary"
          onClick={() => router.back()}
          style={{ marginTop: 16 }}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-full mx-auto">
        <Space direction="vertical" size="large" className="w-full">
          <div className="flex justify-between items-center">
            <div>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
                style={{ marginBottom: 16 }}
              >
                Back
              </Button>
              <Title level={2} className="m-0">
                Edit Order: {orderNumber}
              </Title>
              <Text type="secondary">
                Update order details for {customerInfo.name}
              </Text>
            </div>
            <Tag color="orange">Editing</Tag>
          </div>

          <Card
            className="w-full"
            styles={{
              body: {
                padding: "10px",
              },
            }}
          >
            {/* Customer Information - Direct display without dropdown */}
            {renderCustomerInfo()}

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
                  shippingFees={shippingFees}
                  customerDeliveryOption={customerInfo.deliveryOption}
                />
              </Col>
            </Row>

            <Divider />

            <Row justify="end">
              <Col>
                <UpdateOrderButton
                  storeId={user?.store_id || ""}
                  orderId={orderId}
                  originalOrder={originalOrder}
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
                />
              </Col>
            </Row>
          </Card>
        </Space>
      </div>
    </div>
  );
}
