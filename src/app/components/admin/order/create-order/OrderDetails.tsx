// app/components/admin/order/create-order/OrderDetails.tsx
"use client";
import { useState } from "react";
import { OrderProduct } from "@/lib/types/order";
import {
  ProductWithVariants,
  ProductVariant,
} from "@/lib/queries/products/getProductsWithVariants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../ui/SheiCard/SheiCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SheiAlert,
  SheiAlertDescription,
} from "../../../ui/sheiAlert/SheiAlert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart, Minus } from "lucide-react";
import Image from "next/image";

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
  const [selectedVariantId, setSelectedVariantId] =
    useState<string>("no-variant");
  const [quantity, setQuantity] = useState(1);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.product_variants?.find(
    (v) => v.id === selectedVariantId
  );

  // Filter available variants with positive stock and active status
  const availableVariants =
    selectedProduct?.product_variants?.filter((v) => {
      if (!v.is_active) return false;
      const availableStock =
        v.product_inventory[0]?.quantity_available -
          v.product_inventory[0]?.quantity_reserved || 0;
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
  const getPrimaryImage = (
    product?: ProductWithVariants,
    variant?: ProductVariant
  ) => {
    if (variant?.product_images && variant.product_images.length > 0) {
      const primaryVariantImage = variant.product_images.find(
        (img) => img.is_primary
      );
      return primaryVariantImage || variant.product_images[0];
    }
    if (product?.product_images && product.product_images.length > 0) {
      const primaryProductImage = product.product_images.find(
        (img) => img.is_primary
      );
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
      return (
        quantity <= (getBaseProductAvailableQuantity(selectedProduct) || 0)
      );
    }
  };

  const handleAddProduct = () => {
    if (!canAddProduct() || !selectedProduct) return;

    // Calculate unit price - use discounted_price if available, otherwise base_price
    const unitPrice =
      selectedVariantId !== "no-variant" && selectedVariant
        ? selectedVariant.discounted_price &&
          selectedVariant.discounted_price > 0
          ? selectedVariant.discounted_price
          : selectedVariant.base_price || 0
        : selectedProduct.discounted_price &&
          selectedProduct.discounted_price > 0
        ? selectedProduct.discounted_price
        : selectedProduct.base_price || 0;

    const totalPrice = unitPrice * quantity;

    const variantDetails =
      selectedVariantId !== "no-variant" && selectedVariant
        ? {
            variant_name: selectedVariant.variant_name,
            color: selectedVariant.color,
            base_price: selectedVariant.base_price,
            discounted_price: selectedVariant.discounted_price,
          }
        : undefined;

    const newOrderProduct: OrderProduct = {
      product_id: selectedProduct.id,
      variant_id:
        selectedVariantId !== "no-variant" ? selectedVariantId : undefined,
      product_name: selectedProduct.name,
      variant_details: variantDetails,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      variant_name:
        selectedVariantId !== "no-variant"
          ? selectedVariant?.variant_name || undefined
          : undefined,
    };

    setOrderProducts((prev) => [...prev, newOrderProduct]);

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

    setOrderProducts((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: newQuantity,
              total_price: item.unit_price * newQuantity,
            }
          : item
      )
    );
  };

  // Filter products that have available stock
  const availableProducts = products.filter((product) => {
    const baseStockAvailable = getBaseProductAvailableQuantity(product) > 0;
    const variantsAvailable =
      product.product_variants?.some(
        (v) => v.is_active && getAvailableQuantity(v) > 0
      ) ?? false;
    return baseStockAvailable || variantsAvailable;
  });

  const isAddButtonDisabled = !canAddProduct();

  const subtotal = orderProducts.reduce(
    (sum, item) => sum + item.total_price,
    0
  );

  return (
    <Card className="bg-card text-card-foreground border-border shadow-sm">
      <CardHeader className="pb-4 border-b border-border">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Items
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add products to this order
        </p>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Product Selection Card */}
        <Card className="bg-muted/30 border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Add Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-card-foreground">
                Product *
              </label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => {
                  setSelectedProductId(value);
                  setSelectedVariantId("no-variant");
                  setQuantity(1);
                }}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
                  {availableProducts.map((product) => {
                    const primaryImage = getPrimaryImage(product);
                    return (
                      <SelectItem key={product.id} value={product.id} className="py-2">
                        <div className="flex items-center gap-3">
                          {primaryImage && (
                            <div className="flex-shrink-0 w-8 h-8 relative">
                              <Image
                                src={primaryImage.image_url}
                                alt={product.name}
                                fill
                                className="rounded-md object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {product.discounted_price ? (
                                <>
                                  <span className="text-foreground font-semibold">
                                    ৳{product.discounted_price}
                                  </span>
                                  <span className="line-through">
                                    ৳{product.base_price}
                                  </span>
                                </>
                              ) : (
                                <span>৳{product.base_price || 0}</span>
                              )}
                              {product.product_variants &&
                                product.product_variants.length > 0 && (
                                  <span className="text-blue-600">
                                    • {product.product_variants.length} variants
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Variant and Quantity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Variant Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-card-foreground">
                  Variant
                </label>
                <Select
                  value={selectedVariantId}
                  onValueChange={(value) => {
                    setSelectedVariantId(value);
                    setQuantity(1);
                  }}
                  disabled={
                    !selectedProductId || availableVariants.length === 0
                  }
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border-border">
                    <SelectItem value="no-variant">Base Product</SelectItem>
                    {availableVariants.map((variant) => {
                      const primaryImage = getPrimaryImage(
                        selectedProduct,
                        variant
                      );
                      return (
                        <SelectItem key={variant.id} value={variant.id} className="py-2">
                          <div className="flex items-center gap-3">
                            {primaryImage && (
                              <div className="flex-shrink-0 w-6 h-6 relative">
                                <Image
                                  src={primaryImage.image_url}
                                  alt={variant.variant_name || "Variant"}
                                  fill
                                  className="rounded object-cover"
                                />
                              </div>
                            )}
                            <span className="font-medium">{variant.variant_name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedProductId && availableVariants.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No variants available
                  </p>
                )}
              </div>

              {/* Quantity Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-card-foreground">
                  Quantity *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={
                      selectedVariantId !== "no-variant" && selectedVariant
                        ? getAvailableQuantity(selectedVariant)
                        : getBaseProductAvailableQuantity(selectedProduct) ||
                          100
                    }
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    className="flex-1 h-11 text-center"
                  />
                  <Button
                    onClick={handleAddProduct}
                    disabled={isAddButtonDisabled}
                    className="h-11 px-6 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available:{" "}
                  {selectedVariantId !== "no-variant" && selectedVariant
                    ? getAvailableQuantity(selectedVariant)
                    : getBaseProductAvailableQuantity(selectedProduct) ||
                      "N/A"}{" "}
                  units
                </p>
              </div>
            </div>

            {/* Variant Required Warning */}
            {selectedProductId &&
              availableVariants.length > 0 &&
              selectedVariantId === "no-variant" && (
                <SheiAlert className="bg-amber-50 border-amber-200">
                  <SheiAlertDescription className="text-amber-800">
                    Please select a variant for this product
                  </SheiAlertDescription>
                </SheiAlert>
              )}
          </CardContent>
        </Card>

        {/* Order Items List */}
        {orderProducts.length > 0 ? (
          <div className="space-y-4">
            <Separator className="bg-border" />
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Order Items ({orderProducts.length})
                </h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {orderProducts.length} items
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Subtotal:</span>
                <span className="text-xl font-bold text-card-foreground">
                  ৳{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {orderProducts.map((item, index) => (
                <Card key={index} className="bg-card border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-4">
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-card-foreground text-base">
                                {item.product_name}
                              </h4>
                              {item.variant_name && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800 border-blue-200"
                                >
                                  {item.variant_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Unit: ৳{item.unit_price.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                Qty: {item.quantity}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-semibold text-card-foreground">
                                Total: ৳{item.total_price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleQuantityChange(index, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="h-9 w-9 p-0 border-border"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <div className="relative">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  index,
                                  Number(e.target.value) || 1
                                )
                              }
                              className="w-20 h-9 text-center font-medium"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleQuantityChange(index, item.quantity + 1)
                            }
                            className="h-9 w-9 p-0 border-border"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(index)}
                          className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg mb-2">No products added</p>
            <p className="text-sm text-muted-foreground">
              Select products above to add them to the order
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}