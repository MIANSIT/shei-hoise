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
  FolderPlus,
  Link2, // 👈 Add Link2 import
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
      {
        title: "All Categories",
        href: "/dashboard/products/view-category",
        icon: FolderPlus,
      },
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
        href: "/dashboard/orders",
        icon: Clipboard,
      },
      // 👇 Add Generate Order Link directly in the menu structure
      {
        title: "Generate Order Link",
        href: "/generate-orders-link",
        icon: Link2,
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
