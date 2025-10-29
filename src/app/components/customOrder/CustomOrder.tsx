"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, Col, Typography, Space, App, Button, Empty } from "antd";
import {
  PlusOutlined,
  LinkOutlined,
  CopyOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { getProductsWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { OrderProduct } from "@/lib/types/order";
import OrderDetails from "../admin/order/create-order/OrderDetails";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { useParams } from "next/navigation";

const { Title, Text } = Typography;

export default function CustomOrder() {
  const { notification } = App.useApp();
  const params = useParams();
  const storeSlug = Array.isArray(params.store_slug)
    ? params.store_slug[0]
    : params.store_slug;

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset link when order changes
  useEffect(() => {
    setGeneratedLink(null);
  }, [orderProducts]);

  // Fetch products using storeSlug
  const fetchProducts = useCallback(async () => {
    if (!storeSlug) {
      notification.error({
        message: "Store not found",
        description: "Store slug missing in URL.",
      });
      return;
    }

    setLoading(true);
    try {
      const storeId = await getStoreIdBySlug(storeSlug);
      if (!storeId) {
        notification.error({
          message: "Invalid Store",
          description: "Could not find a store with this slug.",
        });
        return;
      }

      const res = await getProductsWithVariants(storeId);
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
  }, [storeSlug, notification]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const isFormValid = orderProducts.length > 0;

  const handleGenerateLink = () => {
    if (!isFormValid || !storeSlug) {
      notification.error({
        message: "Cannot generate link",
        description: "Please select products first.",
      });
      return;
    }

    // Build query string: ?product=product_id@variant_id@quantity&product=...
    const params = orderProducts
      .map((item) => {
        const variantPart = item.variant_id ? item.variant_id : "none";
        return `product=${item.product_id}@${variantPart}@${item.quantity}`;
      })
      .join("&");

    const url = `/${storeSlug}/prepare-order?${params}`;
    setGeneratedLink(url);

    notification.success({
      message: "Order Link Generated",
      description: "Link generated successfully!",
    });
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(window.location.origin + generatedLink);
    setCopied(true);
    notification.success({
      message: "Link Copied",
      description: "The order link has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Text type="secondary" className="mt-3">
          Loading products...
        </Text>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6 rounded-xl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <Title level={3} className="!mb-0 text-gray-800 dark:text-gray-100">
              Quick Order Link
            </Title>
            <Text type="secondary">
              Generate a unique order link for your customers instantly.
            </Text>
          </div>
        </div>

        {/* Main Card */}
        <Card
          className="shadow-md rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all hover:shadow-lg"
          style={{ padding: "20px" }}
        >
          <Col xs={24} lg={24}>
            {products.length > 0 ? (
              <OrderDetails
                products={products}
                orderProducts={orderProducts}
                setOrderProducts={setOrderProducts}
              />
            ) : (
              <Empty description="No products found" />
            )}
          </Col>

          {/* Generate Link Section */}
          <Col className="mt-4 justify-end flex">
            <Space size="middle">
              {!generatedLink ? (
                <Button
                  type="default"
                  size="large"
                  disabled={!isFormValid}
                  icon={<LinkOutlined />}
                  onClick={handleGenerateLink}
                >
                  Generate Order Link
                </Button>
              ) : (
                <>
                  <input
                    type="text"
                    readOnly
                    value={window.location.origin + generatedLink}
                    className="border rounded-lg px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <Button
                    type="primary"
                    icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={handleCopyLink}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Card>
      </div>
    </div>
  );
}
