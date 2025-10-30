import { ReactNode } from "react";

export interface Stat {
  title: string;
  value: string;
  icon: ReactNode;
}

export interface ChartData {
  name: string;
  sales: number;
}

export interface Product {
  name: string;
  price: string;
}

export interface Order {
  id: string;
  customer: string;
  total: string;
  status: string;
}

export interface DashboardData {
  stats: Stat[];
  chartData: ChartData[];
  topProducts: Product[];
  recentOrders: Order[];
}
