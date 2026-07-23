// app/components/admin/order/create-order/OrderDetails.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import {
  Card,
  Button,
  Select,
  Row,
  Col,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  InputNumber,
  Image,
  notification,
  Alert,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { OrderProduct } from "@/lib/types/order";
import {
  ProductWithVariants,
  ProductVariant,
} from "@/lib/queries/products/getProductsWithVariants";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";
import dataService from "@/lib/queries/dataService";

const { Option } = Select;
const { Title, Text } = Typography;

// How many products the "Add Product" search returns per query — keeps the
// picker fast for stores with large catalogs instead of loading everything.
const PICKER_PAGE_SIZE = 30;
const PICKER_SEARCH_DEBOUNCE_MS = 300;

interface OrderDetailsProps {
  storeId: string;
  // Products already known to the parent (e.g. items already on the order
  // being edited). Merged with whatever the picker search turns up below.
  products: ProductWithVariants[];
  orderProducts: OrderProduct[];
  setOrderProducts: React.Dispatch<React.SetStateAction<OrderProduct[]>>;
  // Snapshot of the order's items as originally loaded from the database
  // (edit mode only). Their quantities are already counted in each
  // product/variant's `quantity_reserved`, so we add them back when
  // computing how much more can be added to THIS order.
  originalOrderProducts?: OrderProduct[];
  // Lets the parent accumulate every product the picker has fetched, so
  // lookups for already-added order items keep working even after the
  // picker's own search results have moved on to a different query.
  onProductsFetched?: (products: ProductWithVariants[]) => void;
}

export default function AdminOrderDetails({
  storeId,
  products,
  orderProducts,
  setOrderProducts,
  originalOrderProducts = [],
  onProductsFetched,
}: OrderDetailsProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] =
    useState<string>("no-variant");
  const [quantity, setQuantity] = useState(1);
  const [api, contextHolder] = notification.useNotification();
  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();

  // Product picker — searches the server instead of holding the whole
  // catalog in memory, since a store's product list can be huge.
  const [pickerResults, setPickerResults] = useState<ProductWithVariants[]>(
    [],
  );
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const runPickerSearch = async (search: string) => {
    if (!storeId) return;
    setPickerLoading(true);
    try {
      const res = await dataService.getProductsWithVariants({
        storeId,
        search: search.trim() || undefined,
        page: 1,
        pageSize: PICKER_PAGE_SIZE,
        withCounts: false,
      });
      setPickerResults(res.data);
      onProductsFetched?.(res.data);
    } catch (err) {
      console.error("Error searching products:", err);
    } finally {
      setPickerLoading(false);
    }
  };

  // Load a default page so the dropdown isn't empty before the user types.
  useEffect(() => {
    runPickerSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handlePickerSearch = (value: string) => {
    if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
    pickerDebounceRef.current = setTimeout(() => {
      runPickerSearch(value);
    }, PICKER_SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
    };
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.product_variants?.find(
    (v) => v.id === selectedVariantId,
  );

  // Get effective price (use discounted_price if available and > 0, otherwise use base_price)
  const getEffectivePrice = (
    product?: ProductWithVariants,
    variant?: ProductVariant,
  ) => {
    if (variant) {
      return variant.discounted_price && variant.discounted_price > 0
        ? variant.discounted_price
        : variant.base_price || 0;
    }
    if (product) {
      return product.discounted_price && product.discounted_price > 0
        ? product.discounted_price
        : product.base_price || 0;
    }
    return 0;
  };

  // Filter available variants with positive stock and active status
  const availableVariants =
    selectedProduct?.product_variants?.filter((v) => v.is_active) ?? [];

  // Get available quantity for a variant
  const getAvailableQuantity = (variant?: ProductVariant) => {
    if (!variant) return 0;
    const stock = variant.product_inventory[0];
    if (!stock) return 0;
    return Math.max(0, stock.quantity_available - stock.quantity_reserved);
  };

  // Get available quantity for base product
  const getBaseProductAvailableQuantity = (product?: ProductWithVariants) => {
    if (!product) return 0;
    const stock = product.product_inventory[0];
    if (!stock) return 0;
    return Math.max(0, stock.quantity_available - stock.quantity_reserved);
  };

  // How much of this exact product/variant is already reserved by THIS
  // order, as originally loaded from the database (0 when creating a new
  // order). Since that amount is already subtracted out of
  // `quantity_reserved`, it needs to be added back so editing an order
  // doesn't get capped at "stock minus what this order already has".
  const getOriginalReservedQuantity = (productId: string, variantId?: string) => {
    const match = originalOrderProducts.find(
      (item) =>
        item.product_id === productId &&
        (item.variant_id || undefined) === (variantId || undefined),
    );
    return match?.quantity || 0;
  };

  // Effective available quantity = truly free stock + whatever this order
  // already holds for that exact product/variant.
  const getEffectiveAvailableQuantity = (
    variant: ProductVariant | undefined,
    productId?: string,
  ) => {
    if (!variant || !productId) return getAvailableQuantity(variant);
    return getAvailableQuantity(variant) + getOriginalReservedQuantity(productId, variant.id);
  };

  const getEffectiveBaseProductAvailableQuantity = (
    product?: ProductWithVariants,
  ) => {
    if (!product) return 0;
    return (
      getBaseProductAvailableQuantity(product) +
      getOriginalReservedQuantity(product.id, undefined)
    );
  };

  // Get primary image for product or variant
  const getPrimaryImage = (
    product?: ProductWithVariants,
    variant?: ProductVariant,
  ) => {
    if (variant?.product_images && variant.product_images.length > 0) {
      const primaryVariantImage = variant.product_images.find(
        (img) => img.is_primary,
      );
      return primaryVariantImage || variant.product_images[0];
    }
    if (product?.product_images && product.product_images.length > 0) {
      const primaryProductImage = product.product_images.find(
        (img) => img.is_primary,
      );
      return primaryProductImage || product.product_images[0];
    }
    return null;
  };

  // Get how much of the selected product/variant is already in this order's draft
  const getExistingDraftQuantity = () => {
    const existingItem = orderProducts.find(
      (item) =>
        item.product_id === selectedProductId &&
        (item.variant_id || "no-variant") === selectedVariantId,
    );
    return existingItem?.quantity || 0;
  };

  // Check if we can add the product (validation)
  const canAddProduct = () => {
    if (!selectedProduct || quantity < 1) return false;

    // If product has active variants, must select a variant
    if (availableVariants.length > 0 && selectedVariantId === "no-variant") {
      return false;
    }

    // Check stock availability - the combined total (already in the draft
    // for this item + the quantity about to be added) must fit within the
    // effective available stock.
    const maxAllowed =
      selectedVariantId !== "no-variant" && selectedVariant
        ? getEffectiveAvailableQuantity(selectedVariant, selectedProduct.id)
        : getEffectiveBaseProductAvailableQuantity(selectedProduct);

    return getExistingDraftQuantity() + quantity <= maxAllowed;
  };

  const handleAddProduct = () => {
    if (!canAddProduct() || !selectedProduct) return;

    const unitPrice = getEffectivePrice(selectedProduct, selectedVariant);
    const totalPrice = unitPrice * quantity;
    const costPrice =
      selectedVariantId !== "no-variant" && selectedVariant
        ? (selectedVariant.tp_price ?? null)
        : (selectedProduct.tp_price ?? null);

    const variantDetails =
      selectedVariantId !== "no-variant" && selectedVariant
        ? {
            variant_name: selectedVariant.variant_name,
            color: selectedVariant.color,
            base_price: selectedVariant.base_price,
            discounted_price: selectedVariant.discounted_price,
          }
        : undefined;

    setOrderProducts((prev) => {
      // Check if product + variant already exists
      const existingIndex = prev.findIndex(
        (p) =>
          p.product_id === selectedProduct.id &&
          (p.variant_id || "no-variant") ===
            (selectedVariantId !== "no-variant"
              ? selectedVariantId
              : "no-variant"),
      );

      if (existingIndex !== -1) {
        // Update existing quantity and total_price
        const updated = [...prev];
        const existingItem = updated[existingIndex];
        const newQuantity = existingItem.quantity + quantity;

        // Make sure not exceeding stock
        const maxQuantity =
          selectedVariantId !== "no-variant" && selectedVariant
            ? getEffectiveAvailableQuantity(selectedVariant, selectedProduct.id)
            : getEffectiveBaseProductAvailableQuantity(selectedProduct);

        updated[existingIndex] = {
          ...existingItem,
          quantity: Math.min(newQuantity, maxQuantity),
          total_price: unitPrice * Math.min(newQuantity, maxQuantity),
        };

        return updated;
      }

      // Otherwise, add new product
      return [
        ...prev,
        {
          product_id: selectedProduct.id,
          variant_id:
            selectedVariantId !== "no-variant" ? selectedVariantId : undefined,
          product_name: selectedProduct.name,
          variant_details: variantDetails,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          cost_price: costPrice,
          variant_name:
            selectedVariantId !== "no-variant"
              ? selectedVariant?.variant_name || undefined
              : undefined,
        },
      ];
    });

    api.success({
      title: "Product Added Successfully",
      description: `${selectedProduct.name}${
        selectedVariant ? ` - ${selectedVariant.variant_name}` : ""
      } (Qty: ${quantity}) has been added to the order.`,
      placement: "topRight",
      duration: 3,
    });

    // Reset form
    setSelectedProductId("");
    setSelectedVariantId("no-variant");
    setQuantity(1);
  };

  const handleRemoveProduct = (index: number) => {
    setOrderProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = orderProducts[index];
    const product = products.find((p) => p.id === item.product_id);
    const variant = product?.product_variants?.find(
      (v) => v.id === item.variant_id,
    );

    const maxAllowed = item.variant_id
      ? getEffectiveAvailableQuantity(variant, item.product_id)
      : getEffectiveBaseProductAvailableQuantity(product);

    const clampedQuantity = product ? Math.min(newQuantity, maxAllowed) : newQuantity;

    setOrderProducts((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              quantity: clampedQuantity,
              total_price: it.unit_price * clampedQuantity,
            }
          : it,
      ),
    );
  };

  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳";

  // Format price display with discount if applicable
  const formatPriceDisplay = (
    product?: ProductWithVariants,
    variant?: ProductVariant,
  ) => {
    if (variant) {
      if (
        variant.discounted_price &&
        variant.discounted_price > 0 &&
        variant.discounted_price !== variant.base_price
      ) {
        return (
          <Space size="small">
            <Text delete type="secondary">
              {displayCurrencyIconSafe}
              {variant.base_price}
            </Text>
            <Text strong>
              {displayCurrencyIconSafe}
              {variant.discounted_price}
            </Text>
          </Space>
        );
      }
      return (
        <Text>
          {displayCurrencyIconSafe}
          {variant.base_price}
        </Text>
      );
    }

    if (product) {
      if (
        product.discounted_price &&
        product.discounted_price > 0 &&
        product.discounted_price !== product.base_price
      ) {
        return (
          <Space size="small">
            <Text delete type="secondary">
              {displayCurrencyIconSafe} {product.base_price}
            </Text>
            <Text strong>
              {displayCurrencyIconSafe}
              {product.discounted_price}
            </Text>
          </Space>
        );
      }
      return (
        <Text>
          {displayCurrencyIconSafe}
          {product.base_price}
        </Text>
      );
    }

    return <Text>{displayCurrencyIconSafe} 0</Text>;
  };

  // Products currently offered in the "Add Product" dropdown — the current
  // search page, filtered down to non-draft/inactive ones.
  const availableProducts = pickerResults.filter((product) => {
    // Hide only draft or inactive products
    if (
      product.status === ProductStatus.DRAFT ||
      product.status === ProductStatus.INACTIVE
    )
      return false;

    return true;
  });

  const isAddButtonDisabled = !canAddProduct();

  return (
    <>
      {contextHolder}
      <Card
        styles={{
          body: {
            padding: "10px",
          },
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Title level={4} style={{ margin: 0 }}>
            Order Items
          </Title>
          <Text type="secondary">Add products to this order</Text>

          {/* Product Selection */}
          <Card size="small" title="Add Product">
            {/* Product Selection - First Line */}
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Space
                  orientation="vertical"
                  style={{ width: "100%" }}
                  size="small"
                >
                  <Text strong>Product</Text>
                  <Select
                    placeholder="Search product by name"
                    value={selectedProductId || undefined}
                    onChange={(value) => {
                      setSelectedProductId(value);
                      setSelectedVariantId("no-variant");
                      setQuantity(1);
                    }}
                    style={{ width: "100%" }}
                    size="large"
                    showSearch
                    filterOption={false}
                    onSearch={handlePickerSearch}
                    loading={pickerLoading}
                    notFoundContent={
                      pickerLoading ? "Searching..." : "No products found"
                    }
                  >
                    {availableProducts.map((product) => {
                      const primaryImage = getPrimaryImage(product);
                      const hasActiveVariants =
                        product.product_variants &&
                        product.product_variants.filter((v) => v.is_active)
                          .length > 0;

                      return (
                        <Option key={product.id} value={product.id}>
                          <Space>
                            {primaryImage && (
                              <Image
                                src={primaryImage.image_url}
                                alt={product.name}
                                width={20}
                                height={20}
                                style={{ borderRadius: "4px" }}
                                preview={false}
                              />
                            )}
                            <span>
                              {product.name}

                              {/* Show SKU if product has one */}
                              {product.sku && (
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "12px",
                                    marginLeft: "4px",
                                  }}
                                >
                                  (SKU: {product.sku})
                                </Text>
                              )}

                              {/* Filter only active variants */}
                              {!hasActiveVariants && (
                                <> - {formatPriceDisplay(product)}</>
                              )}

                              {/* Show active variant count if any */}
                              {hasActiveVariants && (
                                <>
                                  {" : "}(
                                  {
                                    product.product_variants.filter(
                                      (v) => v.is_active,
                                    ).length
                                  }{" "}
                                  variants)
                                </>
                              )}
                            </span>
                          </Space>
                        </Option>
                      );
                    })}
                  </Select>
                </Space>
              </Col>
            </Row>

            {/* Variant and Quantity - Second Line */}
            <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
              <Col xs={24} md={12}>
                <Space
                  orientation="vertical"
                  style={{ width: "100%" }}
                  size="small"
                >
                  <Text strong>Variant</Text>
                  <Select
                    placeholder="Select variant"
                    value={selectedVariantId}
                    onChange={(value) => {
                      setSelectedVariantId(value);
                      setQuantity(1);
                    }}
                    style={{ width: "100%" }}
                    size="large"
                    disabled={
                      !selectedProductId || availableVariants.length === 0
                    }
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) => {
                      if (option?.value === "no-variant") return true;
                      const variant = availableVariants.find(
                        (v) => v.id === option?.value,
                      );
                      return (
                        variant?.variant_name
                          ?.toLowerCase()
                          .includes(input.toLowerCase()) ?? false
                      );
                    }}
                  >
                    <Option value="no-variant">Base Product</Option>
                    {availableVariants.map((variant) => {
                      const primaryImage = getPrimaryImage(
                        selectedProduct,
                        variant,
                      );
                      return (
                        <Option key={variant.id} value={variant.id}>
                          <Space>
                            {primaryImage && (
                              <Image
                                src={primaryImage.image_url}
                                alt={variant.variant_name || "Variant"}
                                width={20}
                                height={20}
                                style={{ borderRadius: "4px" }}
                                preview={false}
                              />
                            )}
                            <span>
                              {variant.variant_name}
                              {variant.sku && (
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "12px",
                                    marginLeft: "4px",
                                  }}
                                >
                                  (SKU: {variant.sku})
                                </Text>
                              )}
                              {" - "}
                              {formatPriceDisplay(selectedProduct, variant)}
                            </span>
                          </Space>
                        </Option>
                      );
                    })}
                  </Select>
                  {selectedProductId && availableVariants.length === 0 && (
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      No variants available
                    </Text>
                  )}
                </Space>
              </Col>

              <Col xs={24} md={12}>
                <Space
                  orientation="vertical"
                  style={{ width: "100%" }}
                  size="small"
                >
                  <Text strong>Quantity</Text>
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      placeholder="Qty"
                      min={1}
                      max={
                        selectedVariantId !== "no-variant" && selectedVariant
                          ? Math.max(
                              1,
                              getEffectiveAvailableQuantity(
                                selectedVariant,
                                selectedProduct?.id,
                              ) - getExistingDraftQuantity(),
                            )
                          : Math.max(
                              1,
                              getEffectiveBaseProductAvailableQuantity(
                                selectedProduct,
                              ) - getExistingDraftQuantity(),
                            ) || 100
                      }
                      value={quantity}
                      onChange={(value) => setQuantity(value || 1)}
                      style={{ width: "70%" }}
                      size="large"
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddProduct}
                      disabled={isAddButtonDisabled}
                      style={{ width: "50%" }}
                      size="large"
                    >
                      Add
                    </Button>
                  </Space.Compact>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Max:{" "}
                    {(() => {
                      const remaining =
                        (selectedVariantId !== "no-variant" && selectedVariant
                          ? getEffectiveAvailableQuantity(
                              selectedVariant,
                              selectedProduct?.id,
                            )
                          : getEffectiveBaseProductAvailableQuantity(
                              selectedProduct,
                            )) - getExistingDraftQuantity();
                      return remaining > 0
                        ? remaining
                        : "All stock reserved / already ordered";
                    })()}{" "}
                    available
                  </Text>
                </Space>
              </Col>
            </Row>

            {selectedProductId &&
              availableVariants.length > 0 &&
              selectedVariantId === "no-variant" && (
                <Alert
                  title="Variant Required"
                  description="Please select a variant for this product"
                  type="warning"
                  showIcon
                  style={{ marginTop: "16px" }}
                />
              )}
          </Card>

          {/* Order Items List */}
          {orderProducts.length > 0 ? (
            <Space
              orientation="vertical"
              style={{ width: "100%" }}
              size="middle"
            >
              <Divider />
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Text strong>Added Items ({orderProducts.length})</Text>
                <Text strong>
                  Subtotal: {displayCurrencyIconSafe}
                  {orderProducts
                    .reduce((sum, item) => sum + item.total_price, 0)
                    .toFixed(2)}
                </Text>
              </Space>

              <div className="order-products-list">
                {orderProducts.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "12px 8px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <Row
                      style={{ width: "100%" }}
                      gutter={[8, 8]}
                      justify="space-between"
                      align="middle"
                    >
                      {/* Product Info */}
                      <Col xs={24} sm={16} md={16} lg={18}>
                        <div>
                          <Space wrap>
                            <Text strong>{item.product_name}</Text>
                            {item.variant_name && (
                              <Tag color="blue" style={{ marginLeft: 4 }}>
                                {item.variant_name}
                              </Tag>
                            )}
                          </Space>
                          {/* Show SKU if available */}
                          {(() => {
                            const product = products.find(
                              (p) => p.id === item.product_id,
                            );
                            const variant = product?.product_variants?.find(
                              (v) => v.id === item.variant_id,
                            );
                            const sku = variant?.sku || product?.sku;

                            return sku ? (
                              <div>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: "12px" }}
                                >
                                  SKU: {sku}
                                </Text>
                              </div>
                            ) : null;
                          })()}
                          <div>
                            <Text>
                              {displayCurrencyIconSafe}
                              {item.unit_price} × {item.quantity} ={" "}
                              <Text strong>
                                {displayCurrencyIconSafe}
                                {item.total_price}
                              </Text>
                            </Text>
                          </div>
                        </div>
                      </Col>

                      {/* Quantity Controls */}
                      <Col
                        xs={24}
                        sm={8}
                        md={8}
                        lg={6}
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <Space
                          size="small"
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                          }}
                        >
                          <Space.Compact>
                            <Button
                              size="small"
                              onClick={() =>
                                handleQuantityChange(index, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <InputNumber
                              size="small"
                              min={1}
                              value={item.quantity}
                              onChange={(value) =>
                                handleQuantityChange(index, value || 1)
                              }
                              style={{ width: "60px", textAlign: "center" }}
                            />
                            <Button
                              size="small"
                              onClick={() =>
                                handleQuantityChange(index, item.quantity + 1)
                              }
                            >
                              +
                            </Button>
                          </Space.Compact>

                          <Button
                            key="delete"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveProduct(index)}
                            size="small"
                          />
                        </Space>
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            </Space>
          ) : (
            <Empty
              image={
                <ShoppingCartOutlined
                  style={{ fontSize: "48px", color: "#d9d9d9" }}
                />
              }
              description="No products added to order"
            />
          )}
        </Space>
      </Card>
    </>
  );
}
