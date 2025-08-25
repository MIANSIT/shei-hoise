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
      { title: "Add Product", href: "/products/add", icon: PlusCircle },
      { title: "Stock Change", href: "/products/stock", icon: Package },
      { title: "All Products", href: "/dashboard/products", icon: List },
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    children: [
      { title: "Add Order", href: "/orders/add", icon: PlusCircle },
      { title: "Pending Orders", href: "/orders/pending", icon: Clock },
      { title: "Processing Orders", href: "/orders/processing", icon: Clock }, // New submenu
      { title: "Completed Orders", href: "/orders/completed", icon: CheckCircle },
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
