import {
  Home,
  Package,
  ShoppingCart,
  UserPlus,
  User,
  CreditCard,
  DollarSign,
  PlusCircle,
  List,
  Clipboard,
  Edit,
  BarChart2,
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
    title: "Users",
    icon: User,
    children: [
      { title: "All Users", href: "/account/profile", icon: User },
      { title: "Create Users", href: "/account/settings", icon: UserPlus },
    ],
  },
  {
    title: "Products",
    icon: Package,
    children: [
      {
        title: "Add Product",
        href: "/dashboard/products/add-product",
        icon: PlusCircle,
      },
      {
        title: "Stock Update",
        href: "/dashboard/products/stocks-update",
        icon: Edit,
      },
      { title: "All Products", href: "/dashboard/products", icon: List },
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    children: [
      {
        title: "Create Order",
        href: "/dashboard/orders/create-order",
        icon: PlusCircle,
      },
      {
        title: "All Orders",
        href: "/dashboard/orders/view-order",
        icon: Clipboard,
      },
    ],
  },

  {
    title: "Financial",
    icon: DollarSign,
    children: [
      { title: "Billing", href: "/financial/billing", icon: CreditCard },
      { title: "Cost", href: "/financial/cost", icon: BarChart2 },
    ],
  },
];
