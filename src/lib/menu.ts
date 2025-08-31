import {
  Home,
  Package,
  ShoppingCart,
  Settings,
  User,
  CreditCard,
  DollarSign,
  PlusCircle,
  List,
  CheckCircle,
  Clock,
} from "lucide-react";
import React from "react";

export interface MenuItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: MenuItem[];
}

export const sideMenu: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  {
    title: "Products",
    icon: Package,
    children: [
      { title: "Add Product", href: "/dashboard/products/add-product", icon: PlusCircle },
      { title: "Stock Update", href: "/dashboard/products/stocks-update", icon: Package },
      { title: "All Products", href: "/dashboard/products", icon: List },
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    children: [
      { title: "Add Order", href: "/dashboard/orders/create-order", icon: PlusCircle },
      { title: "Pending Orders", href: "/dashboard/orders/pending", icon: Clock },
      { title: "Processing Orders", href: "/dashboard/orders/processing", icon: Clock },
      { title: "Completed Orders", href: "/dashboard/orders/completed", icon: CheckCircle },
    ],
  },
  {
    title: "Account",
    icon: User,
    children: [
      { title: "Profile", href: "/account/profile", icon: User },
      { title: "Settings", href: "/account/settings", icon: Settings },
    ],
  },
  {
    title: "Financial",
    icon: DollarSign,
    children: [
      { title: "Billing", href: "/financial/billing", icon: CreditCard },
      { title: "Cost", href: "/financial/cost", icon: DollarSign },
    ],
  },
];
