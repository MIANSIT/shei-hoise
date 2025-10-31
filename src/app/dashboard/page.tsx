"use client";

import React, { useEffect, useState } from "react";
import MainDashboard from "@/app/components/admin/dashboard/dashboardComponent/MainDashboard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreOrders } from "@/lib/hook/useStoreOrders";
import { getProducts } from "@/lib/queries/products/getProducts";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BoxPlotOutlined,
} from "@ant-design/icons";

import type { Product } from "@/lib/queries/products/getProducts";

export default function DashboardPage() {
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();
  const {
    orders,
    totalAmount,
    loading: ordersLoading,
    error: ordersError,
  } = useStoreOrders(storeId || "");

  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalInventoryProducts, setTotalInventoryProducts] = useState(0);
  const [topProducts, setTopProducts] = useState<
    { name: string; quantity: number; revenue: string }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    const fetchInventory = async () => {
      try {
        setLoadingProducts(true);
        const products: Product[] = await getProducts(storeId);

        let lowStock = 0;
        let totalInventory = 0;
        const productMap = new Map<
          string,
          { quantity: number; revenue: number }
        >();

        products.forEach((product) => {
          const activeVariantsWithStock = product.variants.filter(
            (v) => v.is_active && v.stock?.quantity_available > 0
          ).length;

          if (activeVariantsWithStock > 0) {
            totalInventory += activeVariantsWithStock;
          } else if (
            product.stock?.quantity_available &&
            product.stock.quantity_available > 0
          ) {
            totalInventory += 1;
          }

          if (product.is_low_stock) lowStock++;
          product.variants.forEach((v) => {
            if (v.is_low_stock) lowStock++;
          });
        });

        // Calculate top products (both quantity & revenue)
        orders.forEach((order) => {
          order.order_items.forEach((item) => {
            const prev = productMap.get(item.product_name) || {
              quantity: 0,
              revenue: 0,
            };
            productMap.set(item.product_name, {
              quantity: prev.quantity + item.quantity,
              revenue: prev.revenue + item.unit_price * item.quantity, // ✅ use unit_price
            });
          });
        });

        const topProductsArray = Array.from(productMap.entries())
          .sort((a, b) => b[1].quantity - a[1].quantity) // sort by quantity sold
          .slice(0, 5)
          .map(([name, { quantity, revenue }]) => ({
            name,
            quantity,
            revenue: `$${revenue.toFixed(2)}`,
          }));

        setLowStockCount(lowStock);
        setTotalInventoryProducts(totalInventory);
        setTopProducts(topProductsArray);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchInventory();
  }, [storeId, orders]);

  if (userLoading || ordersLoading || loadingProducts)
    return (
      <div className="text-center mt-20 text-lg">Loading dashboard...</div>
    );
  if (userError) return <div>Error fetching user: {userError.message}</div>;
  if (ordersError) return <div>Error fetching orders: {ordersError}</div>;

  const stats = [
    {
      title: "Total Sales",
      value: `$${totalAmount}`,
      icon: <DollarOutlined className="text-green-500" />,
    },
    {
      title: "Orders",
      value: orders.length.toString(),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
    },
    {
      title: "Customers",
      value: new Set(orders.map((o) => o.customers?.id)).size.toString(),
      icon: <UserOutlined className="text-purple-500" />,
    },
    {
      title: "Total Products ",
      value: totalInventoryProducts.toString(),
      icon: <BoxPlotOutlined className="text-orange-500" />,
    },
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartData = days.map((day) => ({
    name: day,
    sales: orders
      .filter((o) => new Date(o.created_at).getDay() === days.indexOf(day))
      .reduce((sum, o) => sum + o.total_amount, 0),
  }));

  const recentOrders = orders.slice(0, 5).map((order) => ({
    id: order.order_number,
    customer: order.customers?.first_name || "Unknown",
    total: `$${order.total_amount}`,
    status: order.status,
  }));

  return (
    <MainDashboard
      stats={stats}
      chartData={chartData}
      topProducts={topProducts}
      recentOrders={recentOrders}
      lowStockCount={lowStockCount > 0 ? lowStockCount : undefined}
    />
  );
}
