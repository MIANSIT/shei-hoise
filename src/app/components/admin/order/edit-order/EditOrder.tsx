"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
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
import type { ShippingFee, DeliveryCourier } from "@/lib/types/store/store";
import type { OrderWithItems } from "@/lib/queries/orders/getOrderByNumber";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums
import { useEditOrderDraftStore } from "@/lib/store/orderDraftStore";

const { Title, Text } = Typography;

interface EditOrderProps {
  orderNumber: string;
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

export default function EditOrder({ orderNumber }: EditOrderProps) {
  const { notification } = App.useApp();
  const router = useRouter();
  const t = useTranslation();

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Draft persistence - survives tab switches / accidental reloads
  const hasHydrated = useEditOrderDraftStore((s) => s._hasHydrated);
  const [readyToSyncDraft, setReadyToSyncDraft] = useState(false);
  // True for the entire duration of the post-save refetch — suppresses the
  // draft-sync effect from immediately recreating a fresh "mirror" draft
  // out of the just-saved data, which would otherwise look restorable
  // (and show the "restored" notification) on the next reload despite
  // there being nothing actually unsaved.
  const justSavedRef = useRef(false);

  // ── Dirty state: field-level comparison against the original DB order ────────
  // Gated on readyToSyncDraft so comparisons only run after the order data is
  // loaded AND any saved draft has been applied — avoiding false positives.
  const customerDirtyFields = useMemo(() => {
    if (!originalOrder || !readyToSyncDraft) return {};
    const origAddr = originalOrder.shipping_address;
    return {
      name: customerInfo.name !== (originalOrder.customer?.name || ""),
      email: customerInfo.email !== (originalOrder.customer?.email || ""),
      phone: customerInfo.phone !== (originalOrder.customer?.phone || ""),
      address: customerInfo.address !== (origAddr?.address_line_1 || origAddr?.address || ""),
      city: customerInfo.city !== (origAddr?.city || ""),
      postal_code: customerInfo.postal_code !== (origAddr?.postal_code || ""),
      notes: customerInfo.notes !== (originalOrder.notes || ""),
    };
  }, [customerInfo, originalOrder, readyToSyncDraft]);

  const financialDirtyFields = useMemo(() => {
    if (!originalOrder || !readyToSyncDraft) return {};
    return {
      taxAmount: taxAmount !== Number(originalOrder.tax_amount),
      discount: discount !== Number(originalOrder.discount_amount || 0),
      additionalCharges: additionalCharges !== Number(originalOrder.additional_charges || 0),
      deliveryCost: deliveryCost !== Number(originalOrder.shipping_fee),
      status: status !== originalOrder.status,
      paymentStatus: paymentStatus !== originalOrder.payment_status,
      paymentMethod: paymentMethod !== (originalOrder.payment_method || "cash"),
      courier: courier !== (originalOrder.courier || ""),
    };
  }, [discount, additionalCharges, deliveryCost, taxAmount, status, paymentStatus, paymentMethod, courier, originalOrder, readyToSyncDraft]);

  const isDirtyProducts = useMemo(() => {
    if (!originalOrder || !readyToSyncDraft) return false;
    if (orderProducts.length !== originalOrderProducts.length) return true;
    return orderProducts.some((p, i) => {
      const orig = originalOrderProducts[i];
      return (
        !orig ||
        p.product_id !== orig.product_id ||
        p.variant_id !== orig.variant_id ||
        p.quantity !== orig.quantity ||
        p.unit_price !== orig.unit_price
      );
    });
  }, [orderProducts, originalOrderProducts, originalOrder, readyToSyncDraft]);

  const hasDirtyChanges =
    Object.values(customerDirtyFields).some(Boolean) ||
    isDirtyProducts ||
    Object.values(financialDirtyFields).some(Boolean);

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
  const fetchCustomerProfile = useCallback(async (customerId: string) => {
    try {
      const profile = await dataService.getCustomerProfileByStoreCustomerId(
        customerId
      );
      if (profile) {
        setCustomerInfo((prev) => ({
          ...prev,
          address: prev.address || profile.address || profile.address_line_1 || "",
          city: prev.city || profile.city || "",
          postal_code: prev.postal_code || profile.postal_code || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching customer profile:", error);
    } finally {
    }
  }, []);

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
        title: t.admin.createOrderErrLoadProducts,
        description: t.admin.createOrderErrLoadProductsDesc,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, loading, notification]);

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

          // Set shipping address info
          if (order.shipping_address) {
            setCustomerInfo((prev) => ({
              ...prev,
              address:
                order.shipping_address.address_line_1 ||
                order.shipping_address.address ||
                prev.address,
              city: order.shipping_address.city || prev.city,
              postal_code:
                order.shipping_address.postal_code || prev.postal_code,
              deliveryMethod: order.delivery_option || prev.deliveryMethod,
              deliveryOption:
                order.shipping_address.deliveryOption || prev.deliveryOption,
              notes: order.notes || prev.notes,
            }));
          }

          // Fetch customer profile
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

  // Restore a saved draft (if any) for THIS order, once the original data
  // has been fetched from the DB and Zustand has finished reading from
  // localStorage. Must run before the "sync to draft" effect below, or the
  // freshly-fetched DB values would overwrite the draft before it loads.
  useEffect(() => {
    if (!hasHydrated || !originalOrder || readyToSyncDraft) return;

    const draft = useEditOrderDraftStore.getState().getDraft(orderNumber);
    // A draft saved before orderUpdatedAt existed (undefined) is treated as
    // safe to restore once, same as before this check was added. Otherwise,
    // if the order's real updated_at has moved on since the draft was
    // captured — another admin edited it, a courier webhook updated its
    // status, etc. — restoring it would silently revert real data, so it's
    // discarded instead of reapplied.
    const isStale =
      draft?.orderUpdatedAt !== undefined && draft.orderUpdatedAt !== originalOrder.updated_at;

    if (draft && isStale) {
      useEditOrderDraftStore.getState().clearDraft(orderNumber);
    } else if (draft) {
      setCustomerInfo(draft.customerInfo);
      setOrderProducts(draft.orderProducts);
      setDiscount(draft.discount);
      setAdditionalCharges(draft.additionalCharges);
      setDeliveryCost(draft.deliveryCost);
      setTaxAmount(draft.taxAmount);
      setStatus(draft.status);
      setPaymentStatus(draft.paymentStatus);
      setPaymentMethod(draft.paymentMethod);
      // Drafts saved before Delivery Courier existed have no `courier` key —
      // leave the value the order-load effect above already set rather than
      // wiping it to "", which would look like a courier change on save and
      // incorrectly clear that order's real shipment data.
      if (draft.courier !== undefined) {
        setCourier(draft.courier);
      }
      notification.info({
        title: t.admin.editOrderRestoredTitle,
        description: t.admin.editOrderRestoredDesc,
      });
    }

    setReadyToSyncDraft(true);
  }, [hasHydrated, originalOrder, readyToSyncDraft, orderNumber, notification]);

  // Sync every change to this order's draft so it survives tab switches and
  // accidental reloads. Gated on readyToSyncDraft so it never fires before
  // the restore effect above has had a chance to run.
  useEffect(() => {
    if (!readyToSyncDraft || justSavedRef.current) return;
    useEditOrderDraftStore.getState().setDraft(orderNumber, {
      orderId,
      orderUpdatedAt: originalOrder?.updated_at,
      customerInfo,
      orderProducts,
      discount,
      additionalCharges,
      deliveryCost,
      taxAmount,
      status,
      paymentStatus,
      paymentMethod,
      courier,
    });
  }, [
    readyToSyncDraft,
    orderNumber,
    orderId,
    originalOrder?.updated_at,
    customerInfo,
    orderProducts,
    discount,
    additionalCharges,
    deliveryCost,
    taxAmount,
    status,
    paymentStatus,
    courier,
    paymentMethod,
  ]);

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
  }, [
    user?.store_id,
    userLoading,
    hasFetchedData,
    fetchProducts,
    fetchStoreSettings,
    fetchOrderData,
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
        <CustomerInfo
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          onEmailChange={handleEmailChange}
          emailError={emailError}
          orderId={orderId}
          isExistingCustomer={true}
          shippingFees={shippingFees}
          settingsLoading={settingsLoading}
          dirtyFields={customerDirtyFields}
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
            <Space>
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

          {hasDirtyChanges && (
            <Alert
              type="warning"
              showIcon
              title={<span className="font-medium">{t.admin.editOrderUnsavedTitle}</span>}
              description={t.admin.editOrderUnsavedDesc}
              className="mb-3"
            />
          )}

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
                <div className="relative">
                  {isDirtyProducts && (
                    <span className="absolute -top-2.5 right-0 z-10 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                      Items modified
                    </span>
                  )}
                  <AdminOrderDetails
                    products={products}
                    orderProducts={orderProducts}
                    setOrderProducts={setOrderProducts}
                    originalOrderProducts={originalOrderProducts}
                  />
                </div>
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
                  dirtyFields={financialDirtyFields}
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
                  onOrderUpdated={async () => {
                    useEditOrderDraftStore.getState().clearDraft(orderNumber);
                    // Re-sync originalOrder/originalOrderProducts to the
                    // just-saved values — otherwise hasDirtyChanges keeps
                    // comparing the form against the pre-save snapshot
                    // forever, showing "Unsaved changes" even right after
                    // a successful save. justSavedRef suppresses the
                    // draft-sync effect for the duration, so this refetch
                    // doesn't immediately recreate a "restorable" draft
                    // out of data that was just saved successfully.
                    justSavedRef.current = true;
                    await fetchOrderData();
                    justSavedRef.current = false;
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
