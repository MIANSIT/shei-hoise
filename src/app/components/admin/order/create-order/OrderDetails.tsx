// app/components/admin/order/create-order/OrderDetails.tsx
"use client";
import { useState } from "react";
import {
  Card,
  Button,
  Select,
  Row,
  Col,
  List,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  InputNumber,
  Image,
  Alert
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined
} from "@ant-design/icons";
import { OrderProduct } from "@/lib/types/order";
import { ProductWithVariants, ProductVariant } from "@/lib/queries/products/getProductsWithVariants";

const { Option } = Select;
const { Title, Text } = Typography;

interface OrderDetailsProps {
  products: ProductWithVariants[];
  orderProducts: OrderProduct[];
  setOrderProducts: React.Dispatch<React.SetStateAction<OrderProduct[]>>;
}

export default function OrderDetails({
  products,
  orderProducts,
  setOrderProducts,
}: OrderDetailsProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("no-variant");
  const [quantity, setQuantity] = useState(1);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.product_variants?.find(v => v.id === selectedVariantId);
  
  // Filter available variants with positive stock and active status
  const availableVariants = selectedProduct?.product_variants?.filter(v => {
    if (!v.is_active) return false;
    const availableStock = v.product_inventory[0]?.quantity_available - v.product_inventory[0]?.quantity_reserved || 0;
    return availableStock > 0;
  }) ?? [];

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

  // Get primary image for product or variant
  const getPrimaryImage = (product?: ProductWithVariants, variant?: ProductVariant) => {
    if (variant?.product_images && variant.product_images.length > 0) {
      const primaryVariantImage = variant.product_images.find(img => img.is_primary);
      return primaryVariantImage || variant.product_images[0];
    }
    if (product?.product_images && product.product_images.length > 0) {
      const primaryProductImage = product.product_images.find(img => img.is_primary);
      return primaryProductImage || product.product_images[0];
    }
    return null;
  };

  // Check if we can add the product (validation)
  const canAddProduct = () => {
    if (!selectedProduct || quantity < 1) return false;
    
    // If product has active variants, must select a variant
    if (availableVariants.length > 0 && selectedVariantId === "no-variant") {
      return false;
    }

    // Check stock availability
    if (selectedVariantId !== "no-variant" && selectedVariant) {
      return quantity <= getAvailableQuantity(selectedVariant);
    } else {
      return quantity <= (getBaseProductAvailableQuantity(selectedProduct) || 0);
    }
  };

  const handleAddProduct = () => {
    if (!canAddProduct() || !selectedProduct) return;

    const unitPrice = selectedVariantId !== "no-variant" && selectedVariant?.base_price 
      ? selectedVariant.base_price 
      : selectedProduct.base_price || 0;
    
    const totalPrice = unitPrice * quantity;

    const variantDetails = selectedVariantId !== "no-variant" && selectedVariant ? {
      variant_name: selectedVariant.variant_name,
      color: selectedVariant.color,
      base_price: selectedVariant.base_price,
      discounted_price: selectedVariant.discounted_price,
    } : undefined;

    const newOrderProduct: OrderProduct = {
      product_id: selectedProduct.id,
      variant_id: selectedVariantId !== "no-variant" ? selectedVariantId : undefined,
      product_name: selectedProduct.name,
      variant_details: variantDetails,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      variant_name: selectedVariantId !== "no-variant" ? (selectedVariant?.variant_name || undefined) : undefined,
    };

    setOrderProducts(prev => [...prev, newOrderProduct]);
    
    // Reset form
    setSelectedProductId("");
    setSelectedVariantId("no-variant");
    setQuantity(1);
  };

  const handleRemoveProduct = (index: number) => {
    setOrderProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setOrderProducts(prev => prev.map((item, i) => 
      i === index 
        ? { 
            ...item, 
            quantity: newQuantity, 
            total_price: item.unit_price * newQuantity 
          }
        : item
    ));
  };

  // Filter products that have available stock
  const availableProducts = products.filter(product => {
    const baseStockAvailable = getBaseProductAvailableQuantity(product) > 0;
    const variantsAvailable = product.product_variants?.some(v => 
      v.is_active && getAvailableQuantity(v) > 0
    ) ?? false;
    return baseStockAvailable || variantsAvailable;
  });

  const isAddButtonDisabled = !canAddProduct();

  return (
    <Card styles={{
    body: {
      padding: '10px'
    }
  }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>
          Order Items
        </Title>
        <Text type="secondary">Add products to this order</Text>

        {/* Product Selection */}
        <Card size="small" title="Add Product" >
          {/* Product Selection - First Line */}
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text strong>Product</Text>
                <Select
                  placeholder="Select product"
                  value={selectedProductId || undefined}
                  onChange={(value) => {
                    setSelectedProductId(value);
                    setSelectedVariantId("no-variant");
                    setQuantity(1);
                  }}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {availableProducts.map(product => {
                    const primaryImage = getPrimaryImage(product);
                    return (
                      <Option key={product.id} value={product.id}>
                        <Space>
                          {primaryImage && (
                            <Image
                              src={primaryImage.image_url}
                              alt={product.name}
                              width={20}
                              height={20}
                              style={{ borderRadius: '4px' }}
                              preview={false}
                            />
                          )}
                          <span>
                            {product.name} - ৳{product.base_price || 0}
                            {product.product_variants && product.product_variants.length > 0 && 
                              ` (${product.product_variants.length} variants)`
                            }
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
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text strong>Variant</Text>
                <Select
                  placeholder="Select variant"
                  value={selectedVariantId}
                  onChange={(value) => {
                    setSelectedVariantId(value);
                    setQuantity(1);
                  }}
                  style={{ width: '100%' }}
                  size="large"
                  disabled={!selectedProductId || availableVariants.length === 0}
                >
                  <Option value="no-variant">Base Product</Option>
                  {availableVariants.map(variant => {
                    const primaryImage = getPrimaryImage(selectedProduct, variant);
                    return (
                      <Option key={variant.id} value={variant.id}>
                        <Space>
                          {primaryImage && (
                            <Image
                              src={primaryImage.image_url}
                              alt={variant.variant_name || "Variant"}
                              width={20}
                              height={20}
                              style={{ borderRadius: '4px' }}
                              preview={false}
                            />
                          )}
                          <span>
                            {variant.variant_name} - ৳{variant.base_price || 0}
                          </span>
                        </Space>
                      </Option>
                    );
                  })}
                </Select>
                {selectedProductId && availableVariants.length === 0 && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    No variants available
                  </Text>
                )}
              </Space>
            </Col>

            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text strong>Quantity</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber
                    placeholder="Qty"
                    min={1}
                    max={
                      selectedVariantId !== "no-variant" && selectedVariant
                        ? getAvailableQuantity(selectedVariant)
                        : getBaseProductAvailableQuantity(selectedProduct) || 100
                    }
                    value={quantity}
                    onChange={(value) => setQuantity(value || 1)}
                    style={{ width: '70%' }}
                    size="large"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddProduct}
                    disabled={isAddButtonDisabled}
                    style={{ width: '30%' }}
                    size="large"
                  >
                    Add
                  </Button>
                </Space.Compact>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Max: {
                    selectedVariantId !== "no-variant" && selectedVariant
                      ? getAvailableQuantity(selectedVariant)
                      : getBaseProductAvailableQuantity(selectedProduct) || "N/A"
                  } available
                </Text>
              </Space>
            </Col>
          </Row>

          {selectedProductId && availableVariants.length > 0 && selectedVariantId === "no-variant" && (
            <Alert
              message="Variant Required"
              description="Please select a variant for this product"
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}
        </Card>

        {/* Order Items List */}
        {orderProducts.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Divider />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text strong>Added Items ({orderProducts.length})</Text>
              <Text strong>Subtotal: ৳{orderProducts.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}</Text>
            </Space>

            <List
              dataSource={orderProducts}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Space.Compact key="quantity">
                      <Button
                        size="small"
                        onClick={() => handleQuantityChange(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <InputNumber
                        size="small"
                        min={1}
                        value={item.quantity}
                        onChange={(value) => handleQuantityChange(index, value || 1)}
                        style={{ width: '60px', textAlign: 'center' }}
                      />
                      <Button
                        size="small"
                        onClick={() => handleQuantityChange(index, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </Space.Compact>,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveProduct(index)}
                      size="small"
                    />
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.product_name}</Text>
                        {item.variant_name && (
                          <Tag color="blue">Variant: {item.variant_name}</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text>
                        ৳{item.unit_price} × {item.quantity} = 
                        <Text strong> ৳{item.total_price}</Text>
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Space>
        ) : (
          <Empty
            image={<ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />}
            description="No products added to order"
          />
        )}
      </Space>
    </Card>
  );
}