"use client";

import React, { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Select, InputNumber, Button as AntButton, Space, Typography } from "antd";
import Image from "next/image";
import { Trash2, Boxes } from "lucide-react";
import { BundleType } from "@/lib/schema/bundleSchema";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

const { Text } = Typography;
const { Option } = Select;

interface BundleComponentsInlineProps {
  form: UseFormReturn<BundleType>;
  storeId: string;
}

const BundleComponentsInline: React.FC<BundleComponentsInlineProps> = ({
  form,
  storeId,
}) => {
  const { watch, setValue, formState } = form;
  const items = watch("bundle_items") ?? [];
  const bundlePrice = watch("discounted_price") || watch("base_price") || 0;
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const { currency } = useUserCurrencyIcon();

  useEffect(() => {
    if (!storeId) return;
    getProductsWithVariants({ storeId, excludeBundles: true }).then((res) => {
      setProducts(res.data);
    });
  }, [storeId]);

  const handleAdd = () => {
    setValue(
      "bundle_items",
      [
        ...items,
        { component_product_id: "", component_variant_id: null, quantity_needed: 1 },
      ],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const handleRemove = (idx: number) => {
    setValue(
      "bundle_items",
      items.filter((_, i) => i !== idx),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const updateItem = (idx: number, patch: Partial<(typeof items)[number]>) => {
    const next = items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    setValue("bundle_items", next, { shouldDirty: true, shouldValidate: true });
  };

  const errors = formState.errors.bundle_items;

  const componentValue = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.component_product_id);
    if (!product) return sum;
    const variant = item.component_variant_id
      ? product.product_variants.find((v) => v.id === item.component_variant_id)
      : undefined;
    const unitPrice = variant
      ? variant.discounted_price ?? variant.base_price ?? 0
      : product.discounted_price ?? product.base_price ?? 0;
    return sum + unitPrice * item.quantity_needed;
  }, 0);
  const savings = componentValue - bundlePrice;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Boxes className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Included products</h2>
            <p className="text-xs text-muted-foreground">
              Pick the products (and quantities) this bundle is made of.
            </p>
          </div>
        </div>
        <AntButton onClick={handleAdd}>Add product</AntButton>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No products added yet — click &quot;Add product&quot; to build the recipe.
        </p>
      )}

      <div className="space-y-4">
        {items.map((item, idx) => {
          const selectedProduct = products.find(
            (p) => p.id === item.component_product_id
          );
          const activeVariants =
            selectedProduct?.product_variants.filter((v) => v.is_active) ?? [];

          return (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Text className="mb-1.5 block text-sm font-medium">Product</Text>
                <Select
                  placeholder="Select a product"
                  value={item.component_product_id || undefined}
                  style={{ width: "100%" }}
                  size="large"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    const product = products.find((p) => p.id === option?.value);
                    return (
                      product?.name?.toLowerCase().includes(input.toLowerCase()) ??
                      false
                    );
                  }}
                  onChange={(value) =>
                    updateItem(idx, {
                      component_product_id: value,
                      component_variant_id: null,
                    })
                  }
                >
                  {products.map((product) => {
                    const primaryImage = product.product_images?.[0];
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
                            />
                          )}
                          <span>
                            {product.name}
                            {product.sku && (
                              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                (SKU: {product.sku})
                              </Text>
                            )}
                          </span>
                        </Space>
                      </Option>
                    );
                  })}
                </Select>
              </div>

              <div className="w-full sm:w-56">
                <Text className="mb-1.5 block text-sm font-medium">Variant</Text>
                <Select
                  placeholder="Base product"
                  value={item.component_variant_id ?? "no-variant"}
                  style={{ width: "100%" }}
                  size="large"
                  disabled={!selectedProduct || activeVariants.length === 0}
                  onChange={(value) =>
                    updateItem(idx, {
                      component_variant_id: value === "no-variant" ? null : value,
                    })
                  }
                >
                  <Option value="no-variant">Base product</Option>
                  {activeVariants.map((variant) => (
                    <Option key={variant.id} value={variant.id}>
                      {variant.variant_name}
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-32">
                <Text className="mb-1.5 block text-sm font-medium">Quantity</Text>
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  size="large"
                  value={item.quantity_needed}
                  onChange={(value) =>
                    updateItem(idx, { quantity_needed: Number(value) || 1 })
                  }
                />
              </div>

              <AntButton
                danger
                type="text"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => handleRemove(idx)}
                aria-label="Remove product"
              />
            </div>
          );
        })}
      </div>

      {errors?.message && (
        <p className="mt-3 text-xs text-rose-500">{errors.message as string}</p>
      )}

      {items.length > 0 && componentValue > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Worth separately: <span className="font-medium text-foreground">{currency}{componentValue.toFixed(2)}</span>
          </span>
          {bundlePrice > 0 && (
            savings > 0 ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Customer saves {currency}{savings.toFixed(2)}
              </span>
            ) : (
              <span className="font-medium text-rose-500">
                Bundle price is {currency}{Math.abs(savings).toFixed(2)} more than buying separately
              </span>
            )
          )}
        </div>
      )}
    </section>
  );
};

export default BundleComponentsInline;
