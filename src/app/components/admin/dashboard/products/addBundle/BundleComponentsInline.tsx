"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Select, InputNumber, Input, Button as AntButton, Space, Typography } from "antd";
import Image from "next/image";
import { Trash2, Boxes, Layers } from "lucide-react";
import { BundleType, BundleItemType } from "@/lib/schema/bundleSchema";
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

type Slot =
  | { kind: "single"; idx: number }
  | { kind: "group"; groupId: string; indices: number[] };

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

  const slots = useMemo<Slot[]>(() => {
    const seenGroups = new Set<string>();
    const result: Slot[] = [];
    items.forEach((item, idx) => {
      if (item.option_group_id) {
        if (seenGroups.has(item.option_group_id)) return;
        seenGroups.add(item.option_group_id);
        const indices = items.reduce<number[]>((acc, it, i) => {
          if (it.option_group_id === item.option_group_id) acc.push(i);
          return acc;
        }, []);
        result.push({ kind: "group", groupId: item.option_group_id, indices });
      } else {
        result.push({ kind: "single", idx });
      }
    });
    return result;
  }, [items]);

  const emptyItem = (
    overrides: Partial<BundleItemType> = {}
  ): BundleItemType => ({
    component_product_id: "",
    component_variant_id: null,
    quantity_needed: 1,
    option_group_id: null,
    option_group_label: null,
    ...overrides,
  });

  const commit = (next: BundleItemType[]) =>
    setValue("bundle_items", next, { shouldDirty: true, shouldValidate: true });

  const handleAdd = () => {
    commit([...items, emptyItem()]);
  };

  const handleAddGroup = () => {
    const groupId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `group-${Date.now()}`;
    commit([
      ...items,
      emptyItem({ option_group_id: groupId, option_group_label: "Choose one", quantity_needed: 1 }),
      emptyItem({ option_group_id: groupId, option_group_label: "Choose one", quantity_needed: 1 }),
    ]);
  };

  const handleAddAlternative = (groupId: string, indices: number[]) => {
    const template = items[indices[0]];
    commit([
      ...items,
      emptyItem({
        option_group_id: groupId,
        option_group_label: template.option_group_label,
        quantity_needed: template.quantity_needed,
      }),
    ]);
  };

  const handleRemove = (idx: number) => {
    commit(items.filter((_, i) => i !== idx));
  };

  const handleRemoveOption = (idx: number) => {
    commit(items.filter((_, i) => i !== idx));
  };

  const handleRemoveGroup = (groupId: string) => {
    commit(items.filter((item) => item.option_group_id !== groupId));
  };

  const updateItem = (idx: number, patch: Partial<BundleItemType>) => {
    commit(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const updateGroup = (groupId: string, patch: Partial<BundleItemType>) => {
    commit(
      items.map((item) =>
        item.option_group_id === groupId ? { ...item, ...patch } : item
      )
    );
  };

  const errors = formState.errors.bundle_items;

  const componentValue = slots.reduce((sum, slot) => {
    const idx = slot.kind === "single" ? slot.idx : slot.indices[0];
    const item = items[idx];
    if (!item) return sum;
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

  const renderProductSelect = (item: BundleItemType, onChange: (value: string) => void) => (
    <Select
      placeholder="Select a product"
      value={item.component_product_id || undefined}
      style={{ width: "100%" }}
      size="large"
      showSearch
      optionFilterProp="children"
      filterOption={(input, option) => {
        const product = products.find((p) => p.id === option?.value);
        return product?.name?.toLowerCase().includes(input.toLowerCase()) ?? false;
      }}
      onChange={onChange}
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
  );

  const renderVariantSelect = (
    item: BundleItemType,
    activeVariants: ProductWithVariants["product_variants"],
    hasProduct: boolean,
    onChange: (value: string) => void
  ) => (
    <Select
      placeholder="Base product"
      value={item.component_variant_id ?? "no-variant"}
      style={{ width: "100%" }}
      size="large"
      disabled={!hasProduct || activeVariants.length === 0}
      onChange={onChange}
    >
      <Option value="no-variant">Base product</Option>
      {activeVariants.map((variant) => (
        <Option key={variant.id} value={variant.id}>
          {variant.variant_name}
        </Option>
      ))}
    </Select>
  );

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
              Pick the products (and quantities) this bundle is made of. Use a choice
              group when a slot can be fulfilled by more than one product or variant
              (e.g. Adult vs Kitten flavor) — the customer picks one at checkout.
            </p>
          </div>
        </div>
        <Space>
          <AntButton onClick={handleAdd}>Add product</AntButton>
          <AntButton icon={<Layers className="h-4 w-4" />} onClick={handleAddGroup}>
            Add choice group
          </AntButton>
        </Space>
      </div>

      {slots.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No products added yet — click &quot;Add product&quot; to build the recipe.
        </p>
      )}

      <div className="space-y-4">
        {slots.map((slot) => {
          if (slot.kind === "single") {
            const idx = slot.idx;
            const item = items[idx];
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
                  {renderProductSelect(item, (value) =>
                    updateItem(idx, { component_product_id: value, component_variant_id: null })
                  )}
                </div>

                <div className="w-full sm:w-56">
                  <Text className="mb-1.5 block text-sm font-medium">Variant</Text>
                  {renderVariantSelect(item, activeVariants, !!selectedProduct, (value) =>
                    updateItem(idx, {
                      component_variant_id: value === "no-variant" ? null : value,
                    })
                  )}
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
          }

          // Choice group: shared label + quantity, 2+ alternative options.
          const { groupId, indices } = slot;
          const first = items[indices[0]];

          return (
            <div
              key={groupId}
              className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4"
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <Text className="mb-1.5 block text-sm font-medium">
                    Slot label (shown to customers)
                  </Text>
                  <Input
                    size="large"
                    placeholder="e.g. Choose your kitchen flavor"
                    value={first.option_group_label ?? ""}
                    onChange={(e) => updateGroup(groupId, { option_group_label: e.target.value })}
                  />
                </div>
                <div className="w-full sm:w-32">
                  <Text className="mb-1.5 block text-sm font-medium">Quantity</Text>
                  <InputNumber
                    min={1}
                    style={{ width: "100%" }}
                    size="large"
                    value={first.quantity_needed}
                    onChange={(value) =>
                      updateGroup(groupId, { quantity_needed: Number(value) || 1 })
                    }
                  />
                </div>
                <AntButton danger onClick={() => handleRemoveGroup(groupId)}>
                  Remove group
                </AntButton>
              </div>

              <div className="space-y-2">
                {indices.map((idx) => {
                  const item = items[idx];
                  const selectedProduct = products.find(
                    (p) => p.id === item.component_product_id
                  );
                  const activeVariants =
                    selectedProduct?.product_variants.filter((v) => v.is_active) ?? [];

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-end"
                    >
                      <div className="flex-1">
                        <Text className="mb-1.5 block text-xs text-muted-foreground">
                          Alternative product
                        </Text>
                        {renderProductSelect(item, (value) =>
                          updateItem(idx, {
                            component_product_id: value,
                            component_variant_id: null,
                          })
                        )}
                      </div>
                      <div className="w-full sm:w-56">
                        <Text className="mb-1.5 block text-xs text-muted-foreground">
                          Variant
                        </Text>
                        {renderVariantSelect(item, activeVariants, !!selectedProduct, (value) =>
                          updateItem(idx, {
                            component_variant_id: value === "no-variant" ? null : value,
                          })
                        )}
                      </div>
                      <AntButton
                        danger
                        type="text"
                        icon={<Trash2 className="h-4 w-4" />}
                        disabled={indices.length <= 2}
                        onClick={() => handleRemoveOption(idx)}
                        aria-label="Remove alternative"
                      />
                    </div>
                  );
                })}
              </div>

              <AntButton
                className="mt-2"
                size="small"
                onClick={() => handleAddAlternative(groupId, indices)}
              >
                + Add alternative
              </AntButton>
            </div>
          );
        })}
      </div>

      {errors?.message && (
        <p className="mt-3 text-xs text-rose-500">{errors.message as string}</p>
      )}

      {slots.length > 0 && componentValue > 0 && (
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
