import { ReactNode } from "react";

export interface Stat {
  title: string;
  value: string;
  icon: ReactNode;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

export interface OrderStatusCard {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
  textColor: string;
}

export interface InventoryAlert {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
  actionText: string;
}

export interface ChartData {
  date: string;
  sales: number;
}

export interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

export interface CustomerStat {
  title: string;
  value: string;
  icon: ReactNode;
  subValue?: string;
}

export interface Alert {
  type: "stock" | "order" | "payment";
  message: string;
  count: number;
}

export interface Order {
  id: string;
  customer: string;
  total: string;
  status: string;
}

export interface DashboardData {
  stats: Stat[];
  orderStatusCards: OrderStatusCard[];
  inventoryAlerts: InventoryAlert[];
  salesTrend: ChartData[];
  topProducts: TopProduct[];
  customerStats: CustomerStat[];
  alerts: Alert[];
  recentOrders: Order[];
}
