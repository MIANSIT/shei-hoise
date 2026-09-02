"use client";

import { useEffect, useState } from "react";
import { Modal, Radio, InputNumber, Button, Space, Typography } from "antd";
import {
  ProductWithVariants,
  ProductVariant,
} from "@/lib/queries/products/getProductsWithVariants";

const { Text } = Typography;

function getEffectivePrice(variant: ProductVariant): number {
  return variant.discounted_price && variant.discounted_price > 0
    ? variant.discounted_price
    : variant.base_price || 0;
}

function getAvailableQuantity(variant: ProductVariant): number {
  const stock = variant.product_inventory[0];
  if (!stock) return 0;
  return Math.max(0, stock.quantity_available - stock.quantity_reserved);
}

interface VariantPickerModalProps {
  open: boolean;
  product: ProductWithVariants | null;
  currencyIcon: string;
  onClose: () => void;
  onConfirm: (variant: ProductVariant, quantity: number) => void;
}

export default function VariantPickerModal({
  open,
  product,
  currencyIcon,
  onClose,
  onConfirm,
}: VariantPickerModalProps) {
  const activeVariants = (product?.product_variants ?? []).filter(
    (v) => v.is_active,
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open) {
      setSelectedId(activeVariants[0]?.id);
      setQuantity(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const selectedVariant = activeVariants.find((v) => v.id === selectedId);
  const maxQty = selectedVariant ? getAvailableQuantity(selectedVariant) : 0;

  const handleConfirm = () => {
    if (!selectedVariant || quantity < 1 || quantity > maxQty) return;
    onConfirm(selectedVariant, quantity);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={product ? `${product.name} — choose a variant` : "Choose a variant"}
      centered
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Radio.Group
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setQuantity(1);
          }}
          style={{ width: "100%" }}
        >
          <Space orientation="vertical" style={{ width: "100%" }}>
            {activeVariants.map((variant) => {
              const available = getAvailableQuantity(variant);
              return (
                <Radio
                  key={variant.id}
                  value={variant.id}
                  disabled={available <= 0}
                  style={{ width: "100%" }}
                >
                  <Space>
                    <Text>{variant.variant_name || "Variant"}</Text>
                    <Text strong>
                      {currencyIcon}
                      {getEffectivePrice(variant)}
                    </Text>
                    <Text type={available > 0 ? "secondary" : "danger"}>
                      {available > 0 ? `${available} in stock` : "Out of stock"}
                    </Text>
                  </Space>
                </Radio>
              );
            })}
          </Space>
        </Radio.Group>

        {selectedVariant && (
          <Space align="center">
            <Text strong>Quantity</Text>
            <InputNumber
              min={1}
              max={Math.max(1, maxQty)}
              value={quantity}
              onChange={(v) => setQuantity(v || 1)}
              disabled={maxQty <= 0}
            />
          </Space>
        )}

        <Button
          type="primary"
          block
          size="large"
          disabled={!selectedVariant || maxQty <= 0}
          onClick={handleConfirm}
        >
          Add to Sale
        </Button>
      </Space>
    </Modal>
  );
}
