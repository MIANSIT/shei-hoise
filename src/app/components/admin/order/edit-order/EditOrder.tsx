"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  App,
  Select,
  Avatar,
  Empty,
} from "antd";
import { ArrowLeftOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import CustomerInfo from "../create-order/CustomerInfo";
import AdminOrderDetails from "../create-order/AdminOrderDetails";
import OrderSummary from "../create-order/OrderSummary";
import UpdateOrderButton from "./UpdateOrderButton";
import {
  CustomerInfo as CustomerInfoType,
  OrderProduct,
} from "@/lib/types/order";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useTranslation } from "@/lib/hook/useTranslation";
import dataService from "@/lib/queries/dataService";
import type { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getAllStoreCustomers } from "@/lib/queries/customers/getAllStoreCustomers";
import type { DetailedCustomer } from "@/lib/types/users";
import type { ShippingFee, DeliveryCourier } from "@/lib/types/store/store";
import type { OrderWithItems } from "@/lib/queries/orders/getOrderByNumber";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums
const { Option } = Select;

const { Title, Text } = Typography;

interface EditOrderProps {
  orderNumber: string;
  returnUrl?: string;
}

// interface OrderItemData {
//   id: string;
//   product_id: string;
//   variant_id?: string;
//   product_name: string;
//   variant_details: any;
//   quantity: number;
//   unit_price: number;
//   total_price: number;
// }

export default function EditOrder({ orderNumber, returnUrl }: EditOrderProps) {
  const { notification } = App.useApp();
  const router = useRouter();
  const t = useTranslation();

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const { user, loading: userLoading } = useCurrentUser();
  const { allowed: courierTrackingAllowed } = useFeatureGate(user?.store_id, "courier_tracking");

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
    customer_id: "",
  });

  // Reassigning the order to a different existing customer — see
  // handleCustomerSelect. Off by default: the page normally just shows the
  // linked customer's details as editable text, same as before this existed.
  const [customers, setCustomers] = useState<DetailedCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<DetailedCustomer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [status, setStatus] = useState<OrderStatus>(OrderStatus.PENDING); // ✅ Using enum
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    PaymentStatus.PENDING
  ); // ✅ Using enum
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [courier, setCourier] = useState("");
  const [deliveryCouriers, setDeliveryCouriers] = useState<DeliveryCourier[]>([]);

  const [orderId, setOrderId] = useState("");
  // const [customerProfile, setCustomerProfile] =
  //   useState<CustomerProfile | null>(null);
  // const [profileLoading, setProfileLoading] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<OrderWithItems | null>(
    null
  );
  // Frozen snapshot of the order's items as originally loaded from the
  // database. Their quantities are already counted in the product/variant
  // inventory's `quantity_reserved`, so this is used to compute the true
  // remaining stock while editing (see AdminOrderDetails).
  const [originalOrderProducts, setOriginalOrderProducts] = useState<
    OrderProduct[]
  >([]);
  const [hasFetchedData, setHasFetchedData] = useState(false);

  // Store settings states
  const [shippingFees, setShippingFees] = useState<ShippingFee[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Email validation state
  const [emailError, setEmailError] = useState<string>("");


  // Fetch store settings with shipping fees
  const fetchStoreSettings = useCallback(async () => {
    if (!user?.store_id || settingsLoading) return;

    setSettingsLoading(true);
    try {
      const settings = await getStoreSettings(user.store_id);
      if (settings) {
        setShippingFees(settings.shipping_fees || []);
        setDeliveryCouriers(settings.delivery_couriers || []);
        if (settings.tax_rate) {
          setTaxAmount(settings.tax_rate);
        }
      }
    } catch (error) {
      console.error("Error fetching store settings:", error);
      notification.error({
        title: t.admin.createOrderErrLoadStore,
        description: t.admin.createOrderErrLoadStoreDesc,
      });
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.store_id, settingsLoading, notification]);

  // Validate email uniqueness
  const validateEmailUniqueness = useCallback(
    (email: string): boolean => {
      if (!email) {
        setEmailError("");
        return true;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // For edit mode, we need to check if the email exists for a DIFFERENT customer
      if (customerInfo.customer_id) {
        // In edit mode, we should allow the same customer to keep their email
        // Only show error if email belongs to a different customer
        const existingCustomerWithSameEmail =
          originalOrder?.customer?.email === normalizedEmail;

        if (existingCustomerWithSameEmail) {
          // This is the same customer's email - allow it
          setEmailError("");
          return true;
        }

        // Check if email exists for another customer
        // Note: This would require fetching all customers, but for now we'll skip this check in edit mode
        // since it's complex and might not be necessary for order editing
        setEmailError("");
        return true;
      }

      setEmailError("");
      return true;
    },
    [customerInfo.customer_id, originalOrder?.customer?.email]
  );

  // Handle email changes with validation
  const handleEmailChange = useCallback(
    (email: string) => {
      setCustomerInfo((prev) => ({ ...prev, email }));
      validateEmailUniqueness(email);
    },
    [validateEmailUniqueness]
  );

  // Fetch customer profile — a gap-filler only. When editing an existing
  // order, its own shipping_address (already applied to customerInfo just
  // before this runs) is the real, saved value and must win; the customer's
  // current profile address is only used for whatever the order itself
  // didn't have. Previously this ran the other way around and silently
  // replaced the order's real address with the customer's (possibly since-
  // changed) profile address, permanently marking Address as "Edited" with
  // no actual edit having happened.
  const fetchCustomerProfile = useCallback(
    async (customerId: string, hasShippingAddress: boolean) => {
      try {
        const profile = await dataService.getCustomerProfileByStoreCustomerId(
          customerId
        );
        if (profile) {
          // If the order already has its own shipping_address, every field on
          // it — even an intentionally-cleared empty one — is the real saved
          // value and must win. Only gap-fill from the customer's profile for
          // legacy orders that never had a shipping_address at all; otherwise
          // clearing a field (e.g. postal code) and saving would silently
          // bring the old profile value right back on the next edit.
          if (hasShippingAddress) return;
          setCustomerInfo((prev) => ({
            ...prev,
            address: prev.address || profile.address || profile.address_line_1 || "",
            city: prev.city || profile.city || "",
            postal_code: prev.postal_code || profile.postal_code || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching customer profile:", error);
      }
    },
    []
  );

  // Products are no longer preloaded in bulk here — the store's full catalog
  // can be too large. AdminOrderDetails' "Add Product" picker fetches its own
  // search results lazily; this just resolves the products already on the
  // order being edited (needed for stock/quantity checks) and accumulates
  // whatever else the picker fetches, so lookups always find their product.
  const mergeProducts = useCallback((fetched: ProductWithVariants[]) => {
    setProducts((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      for (const p of fetched) byId.set(p.id, p);
      return Array.from(byId.values());
    });
  }, []);

  useEffect(() => {
    if (!user?.store_id || originalOrderProducts.length === 0) return;

    const ids = Array.from(
      new Set(originalOrderProducts.map((item) => item.product_id)),
    );

    dataService
      .getProductsWithVariants({
        storeId: user.store_id,
        productIds: ids,
        withCounts: false,
      })
      .then((res) => mergeProducts(res.data))
      .catch((err) => {
        console.error("Error fetching order's existing products:", err);
        notification.error({
          title: t.admin.createOrderErrLoadProducts,
          description: t.admin.createOrderErrLoadProductsDesc,
        });
      });
  }, [
    user?.store_id,
    originalOrderProducts,
    mergeProducts,
    notification,
    t.admin.createOrderErrLoadProducts,
    t.admin.createOrderErrLoadProductsDesc,
  ]);

  // Fetch store customers, for the "change customer" search below — lets a
  // wrong customer picked at order-creation time actually be reassigned,
  // instead of only ever editing the (still wrong) linked customer's text fields.
  const fetchCustomers = useCallback(async () => {
    if (!user?.store_id || customerLoading) return;

    setCustomerLoading(true);
    try {
      const res = await getAllStoreCustomers(user.store_id);
      let customerArray: DetailedCustomer[] = [];

      if (Array.isArray(res)) {
        customerArray = res;
      } else if (res && typeof res === "object" && "customers" in res) {
        customerArray = res.customers;
      }

      setCustomers(customerArray);
      setFilteredCustomers(customerArray);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setCustomerLoading(false);
    }
  }, [user?.store_id, customerLoading]);

  // Filter customers based on search
  useEffect(() => {
    if (!customerSearchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const term = customerSearchTerm.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (customer) =>
            (customer.name?.toLowerCase() || "").includes(term) ||
            (customer.email?.toLowerCase() || "").includes(term) ||
            (customer.phone?.toLowerCase() || "").includes(term)
        )
      );
    }
  }, [customerSearchTerm, customers]);

  // Reassign the order to a different existing customer
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setCustomerInfo((prev) => ({
      ...prev,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      customer_id: customer.id,
      address:
        customer.profile_details?.address ||
        customer.profile_details?.address_line_1 ||
        prev.address,
      city: customer.profile_details?.city || prev.city,
      postal_code: customer.profile_details?.postal_code || prev.postal_code,
    }));
    setEmailError("");
    setShowCustomerSearch(false);
  };

  // Detach the order from its currently linked customer so the fields below
  // can be filled in for someone who doesn't have a customer record yet.
  // customer_id stays blank until save — UpdateOrderButton creates the real
  // customer record at that point (same as SaveOrderButton does on create),
  // then links the order to it.
  const handleNewCustomer = () => {
    setCustomerInfo((prev) => ({
      ...prev,
      customer_id: "",
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      postal_code: "",
    }));
    setEmailError("");
    setShowCustomerSearch(false);
  };

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

        // Set order status and payment info - using type casting
        setStatus(order.status as OrderStatus); // ✅ Type casting
        setPaymentStatus(order.payment_status as PaymentStatus); // ✅ Type casting
        setPaymentMethod(order.payment_method || "cash");
        setCourier(order.courier || "");

        // Set financial data - INCLUDING discount_amount AND additional_charges
        setSubtotal(Number(order.subtotal));
        setTaxAmount(Number(order.tax_amount));
        setDiscount(Number(order.discount_amount || 0));
        setAdditionalCharges(Number(order.additional_charges || 0));
        setDeliveryCost(Number(order.shipping_fee));
        setTotalAmount(Number(order.total_amount));

        // Set customer info from order
        if (order.customer) {
          setCustomerInfo((prev) => ({
            ...prev,
            name: order.customer?.name || "",
            phone: order.customer?.phone || "",
            email: order.customer?.email || "",
            customer_id: order.customer_id,
          }));

          // Set shipping address info. `??` (not `||`) so an intentionally
          // cleared field (empty string) is kept as-is instead of falling
          // back — only a genuinely missing (null/undefined) field does.
          if (order.shipping_address) {
            setCustomerInfo((prev) => ({
              ...prev,
              address:
                order.shipping_address.address_line_1 ??
                order.shipping_address.address ??
                prev.address,
              city: order.shipping_address.city ?? prev.city,
              postal_code:
                order.shipping_address.postal_code ?? prev.postal_code,
              deliveryMethod: order.delivery_option || prev.deliveryMethod,
              deliveryOption:
                order.shipping_address.deliveryOption || prev.deliveryOption,
              notes: order.notes || prev.notes,
            }));
          }

          // Fetch customer profile (gap-fills only if the order itself has
          // no shipping_address at all — see fetchCustomerProfile).
          await fetchCustomerProfile(order.customer_id, !!order.shipping_address);
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
        setOriginalOrderProducts(convertedOrderProducts);
      }
    } catch (error) {
      console.error("Error fetching order data:", error);
      notification.error({
        title: "Error Loading Order",
        description: "Failed to load order data. Please try again.",
      });
    } finally {
      setOrderLoading(false);
    }
  }, [user?.store_id, orderNumber, fetchCustomerProfile, notification]);

  // Auto-select delivery option based on shipping fee from backend
  useEffect(() => {
    if (
      originalOrder &&
      shippingFees.length > 0 &&
      !customerInfo.deliveryOption
    ) {
      const currentShippingFee = Number(originalOrder.shipping_fee);
      

      // Method 1: Try to find exact match with shipping fees
      const matchingShippingFee = shippingFees.find(
        (fee) => fee.price === currentShippingFee
      );

      if (matchingShippingFee) {
        // Found exact match - use the shipping fee's name
        const deliveryOptionValue = matchingShippingFee.name
          .toLowerCase()
          .replace(/\s+/g, "-");

        setCustomerInfo((prev) => ({
          ...prev,
          deliveryOption: deliveryOptionValue,
        }));
      } else {
        // No exact match - check if it's a custom amount
        const standardFees = shippingFees.map((fee) => fee.price);
        const isCustomAmount = !standardFees.includes(currentShippingFee);

        if (isCustomAmount) {
          
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
        setDeliveryCost(shippingFee.price);
      }
    }
  }, [customerInfo.deliveryOption, deliveryCost, shippingFees]);

  // Initialize data
  useEffect(() => {
    if (user?.store_id && !userLoading && !hasFetchedData) {
      setHasFetchedData(true);

      const initializeData = async () => {
        try {
          // Fetch all data in parallel
          await Promise.all([
            fetchStoreSettings(),
            fetchOrderData(),
            fetchCustomers(),
          ]);
        } catch (error) {
          console.error("Error initializing data:", error);
        }
      };

      initializeData();
    }
  }, [
    user?.store_id,
    userLoading,
    hasFetchedData,
    fetchStoreSettings,
    fetchOrderData,
    fetchCustomers,
  ]);

  // Calculate totals INCLUDING additional charges
  useEffect(() => {
    const newSubtotal = orderProducts.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    setSubtotal(newSubtotal);

    // Calculate total amount with all components including additional charges
    const calculatedTotal =
      newSubtotal - discount + additionalCharges + deliveryCost + taxAmount;
    setTotalAmount(calculatedTotal);

  }, [orderProducts, discount, additionalCharges, deliveryCost, taxAmount]);

  const isFormValid =
    customerInfo.name &&
    customerInfo.phone &&
    customerInfo.address &&
    customerInfo.city &&
    customerInfo.deliveryMethod &&
    customerInfo.deliveryOption &&
    orderProducts.length > 0 &&
    !emailError;

  // Render customer information
  const renderCustomerInfo = () => {
    return (
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Card size="small">
          <Row gutter={[16, 12]} align="middle">
            <Col flex="auto">
              <Text strong>Linked Customer</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Editing the name/phone/email below corrects this
                  customer&apos;s record everywhere, not just this order. If
                  this order was placed under the <strong>wrong person</strong>,
                  don&apos;t retype over their details — use one of the
                  actions on the right instead.
                </Text>
              </div>
            </Col>
            <Col>
              <Space>
                <Button
                  type="default"
                  onClick={() => setShowCustomerSearch((prev) => !prev)}
                  title="Link this order to a different customer who already exists in your system"
                >
                  {showCustomerSearch ? "Cancel" : "Change Customer"}
                </Button>
                <Button
                  type="default"
                  onClick={handleNewCustomer}
                  title="This order belongs to someone with no customer record yet — clear the fields and create one"
                >
                  New Customer
                </Button>
              </Space>
            </Col>
          </Row>

          {!customerInfo.customer_id && (
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              title="No customer linked"
              description="Fill in the details below for a customer who doesn't have a record yet — saving will create their customer record and link this order to it."
            />
          )}

          {showCustomerSearch && (
            <div style={{ marginTop: 12 }}>
              {customerLoading ? (
                <div style={{ textAlign: "center", padding: "12px" }}>
                  <Spin />
                </div>
              ) : customers.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No other customers found for this store."
                />
              ) : (
                <Select
                  placeholder="Search by name, email, or phone"
                  value={undefined}
                  onChange={handleCustomerSelect}
                  style={{ width: "100%" }}
                  size="large"
                  showSearch={{
                    filterOption: false,
                    onSearch: setCustomerSearchTerm,
                  }}
                  notFoundContent={
                    customerSearchTerm ? "No matching customers" : "Type to search"
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
              )}
            </div>
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

  if (!originalOrder) {
    return (
      <div className="flex justify-center items-center min-h-64 flex-col">
        <Alert
          title="Order Not Found"
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
        <Space orientation="vertical" size="large" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
                style={{ marginBottom: 16 }}
              >
                Back
              </Button>
              <Title level={2} className="m-0! wrap-break-word">
                Edit Order: {orderNumber}
              </Title>
              <Text type="secondary">
                Update order details for {customerInfo.name}
              </Text>
            </div>
            <Space wrap>
              {originalOrder?.fb_purchase_event_status && (
                <Tag
                  color={
                    originalOrder.fb_purchase_event_status === "sent"
                      ? "green"
                      : originalOrder.fb_purchase_event_status === "held"
                        ? "gold"
                        : "default"
                  }
                  title={
                    originalOrder.fb_purchase_event_status === "sent"
                      ? "Sent to Facebook immediately after checkout"
                      : originalOrder.fb_purchase_event_status === "held"
                        ? "Held — will only be sent to Facebook once this order is marked Delivered"
                        : "Suppressed — this order was cancelled before the event was ever sent"
                  }
                >
                  Facebook Purchase: {originalOrder.fb_purchase_event_status}
                </Tag>
              )}
              <Tag color="orange">Editing</Tag>
            </Space>
          </div>

          <Card
            className="w-full"
            styles={{
              body: {
                padding: "10px",
              },
            }}
          >
            {/* Customer Information */}
            {renderCustomerInfo()}

            <Divider />

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <AdminOrderDetails
                  storeId={user?.store_id || ""}
                  products={products}
                  orderProducts={orderProducts}
                  setOrderProducts={setOrderProducts}
                  originalOrderProducts={originalOrderProducts}
                  onProductsFetched={mergeProducts}
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
                  courier={courier}
                  setCourier={setCourier}
                  deliveryCouriers={deliveryCouriers}
                  courierTrackingAllowed={courierTrackingAllowed}
                  courierConsignmentId={originalOrder?.courier_consignment_id}
                  courierOrderStatus={originalOrder?.courier_order_status}
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
                  additionalCharges={additionalCharges}
                  deliveryCost={deliveryCost}
                  totalAmount={totalAmount}
                  status={status}
                  paymentStatus={paymentStatus}
                  paymentMethod={paymentMethod}
                  courier={courier}
                  disabled={!isFormValid || !user?.store_id || !!emailError}
                  emailError={emailError}
                  returnUrl={returnUrl}
                  onOrderUpdated={async () => {
                    // Re-sync the form to the just-saved values from the DB.
                    await fetchOrderData();
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Space>
      </div>
    </div>
  );
}
