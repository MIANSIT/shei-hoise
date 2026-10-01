import {
  Home,
  Package,
  ShoppingCart,
  UserPlus,
  User,
  PlusCircle,
  List,
  Clipboard,
  Edit,
  FolderPlus,
  Link2,
  Settings,
  Truck,
  // UserCircle,
  // Store,
  DollarSign,
  CreditCard,
  BarChart2,
  TrendingUp,
  BadgeCheck,
  PackageCheck,
  Warehouse,
  Boxes,
  Sparkles,
  Tag,
  HandCoins,
  Star,
  Zap,
  Wallet,
  Calculator,
  Receipt,
  Palette,
  Images,
  GalleryHorizontal,
  Megaphone,
  Store,
  Share2,
  Layers,
  Search,
  UserCog,
  Users,
  History,
} from "lucide-react";
import React from "react";
import type { translations } from "@/lib/i18n/translations";

/** Sidebar labels live in translations.admin as menu* keys (English + Bangla). */
export type MenuLabelKey = Extract<keyof (typeof translations)["en"]["admin"], `menu${string}`>;

export interface MenuItem {
  // Stable English id for the item, used as its menu key and as the label
  // fallback. Renaming what the user sees only changes labelKey's text.
  title: string;
  labelKey?: MenuLabelKey;
  href?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: MenuItem[];
  // Plan feature-flag key (see src/lib/utils/planFeatures.ts). When set,
  // SidebarMenu hides this node entirely unless the store's plan has this
  // feature enabled — unlike every other gated feature in this app, which
  // keeps its nav link visible and only locks the page itself.
  requiredFeature?: string;
  // When true, SidebarMenu hides this node once stores.setup_completed_at
  // is set (post-signup "finish setting up your store" nudge).
  hideWhenSetupComplete?: boolean;
  // Never shown to staff, whatever their role (see src/lib/permissions/routes.ts
  // for the per-page permission each other link needs).
  ownerOnly?: boolean;
}

// Ordered by how often a shop uses each area: daily selling first, setup
// last. Labels (translations.admin.menu*) are short, unique across the whole
// menu, and named the way a shop owner says them.
export const sideMenu: MenuItem[] = [
  { title: "Dashboard", labelKey: "menuDashboard", href: "/dashboard", icon: Home },
  {
    // Hidden once the store's setup_completed_at is set — see the
    // useEffect in SidebarMenu.tsx that filters this out, mirroring the
    // requiredFeature filter below.
    title: "Complete Setup",
    labelKey: "menuCompleteSetup",
    href: "/dashboard/complete-setup",
    icon: Sparkles,
    hideWhenSetupComplete: true,
  },
  {
    title: "Orders",
    labelKey: "menuOrders",
    icon: ShoppingCart,
    children: [
      { title: "Create Order", labelKey: "menuCreateOrder", href: "/dashboard/orders/create-order", icon: PlusCircle },
      { title: "All Orders", labelKey: "menuAllOrders", href: "/dashboard/orders", icon: Clipboard },
      { title: "Generate Order Link", labelKey: "menuGenerateOrderLink", href: "/generate-orders-link", icon: Link2 },
    ],
  },
  {
    title: "POS",
    labelKey: "menuPos",
    icon: Receipt,
    requiredFeature: "pos",
    children: [
      { title: "Quick Sale", labelKey: "menuQuickSale", href: "/dashboard/orders/quick-sale", icon: Zap },
      { title: "Register Audit", labelKey: "menuRegisterAudit", href: "/dashboard/orders/quick-sale/audit", icon: Calculator },
    ],
  },
  {
    title: "Products",
    labelKey: "menuProducts",
    icon: Package,
    children: [
      { title: "Add Product", labelKey: "menuAddProduct", href: "/dashboard/products/add-product", icon: PlusCircle },
      { title: "All Products", labelKey: "menuAllProducts", href: "/dashboard/products", icon: List },
      { title: "Stock Update", labelKey: "menuStockUpdate", href: "/dashboard/products/stocks-update", icon: Edit },
      { title: "Bundles", labelKey: "menuBundles", href: "/dashboard/products/bundles", icon: Boxes },
      { title: "All Categories", labelKey: "menuAllCategories", href: "/dashboard/products/category", icon: FolderPlus },
    ],
  },
  {
    title: "Users",
    labelKey: "menuUsers",
    icon: User,
    children: [
      { title: "All Users", labelKey: "menuAllUsers", href: "/dashboard/customers", icon: User },
      { title: "Create Users", labelKey: "menuCreateUsers", href: "/dashboard/customers/create-customer", icon: UserPlus },
    ],
  },
  {
    // Children are entirely DB-driven (Pathao, Steadfast, and any custom
    // couriers) — see SidebarMenu.tsx, which builds them from
    // getDeliveryCouriers() rather than hardcoding courier names here.
    title: "Courier",
    labelKey: "menuCourier",
    icon: PackageCheck,
    children: [
      { title: "Delivery Courier", labelKey: "menuCourierAccounts", href: "/dashboard/courier/manage", icon: PackageCheck },
    ],
  },
  {
    // Every page about money in and out: what customers owe, what couriers
    // paid over, and what the shop spent.
    title: "Financial",
    labelKey: "menuFinancial",
    icon: DollarSign,
    children: [
      { title: "Customer Dues", labelKey: "menuCustomerDues", href: "/dashboard/customers/dues", icon: Wallet },
      { title: "COD Settlements", labelKey: "menuCodSettlements", href: "/dashboard/cod-settlements", icon: HandCoins },
      { title: "Expense", labelKey: "menuExpense", href: "/dashboard/expense", icon: CreditCard },
      { title: "Category", labelKey: "menuCategory", href: "/dashboard/expense/category", icon: BarChart2 },
    ],
  },
  {
    // Grouped together since both are report pages an owner checks side by
    // side. Neither child carries requiredFeature — both stay visible in the
    // nav regardless of plan; entitlement is enforced by each page itself
    // (FeatureLocked), gated by advanced_reports and profit_loss respectively.
    title: "Reports",
    labelKey: "menuReports",
    icon: BarChart2,
    children: [
      { title: "Sales Report", labelKey: "menuSalesReport", href: "/dashboard/reports/sales", icon: BarChart2 },
      { title: "Profit & Loss", labelKey: "menuProfitLoss", href: "/dashboard/reports/profit-loss", icon: TrendingUp },
    ],
  },
  {
    title: "Vendors",
    labelKey: "menuVendors",
    icon: Warehouse,
    requiredFeature: "vendor_flow",
    children: [
      { title: "All Vendors", labelKey: "menuAllVendors", href: "/dashboard/vendors", icon: User },
      { title: "New Vendor Order", labelKey: "menuNewVendorOrder", href: "/dashboard/vendor-orders/create", icon: PlusCircle },
      { title: "All Vendor Orders", labelKey: "menuAllVendorOrders", href: "/dashboard/vendor-orders", icon: Clipboard },
      { title: "Vendor Settlements", labelKey: "menuVendorSettlements", href: "/dashboard/vendor-settlements", icon: HandCoins },
    ],
  },
  {
    title: "Marketing",
    labelKey: "menuMarketing",
    icon: Tag,
    children: [
      { title: "Coupons", labelKey: "menuCoupons", href: "/dashboard/marketing/coupons", icon: Tag },
      { title: "Pixel Analytics", labelKey: "menuPixelAnalytics", href: "/dashboard/pixel-analytics", icon: TrendingUp },
    ],
  },
  {
    title: "Storefront",
    labelKey: "menuStorefront",
    icon: Layers,
    children: [
      { title: "Storefront Design", labelKey: "menuStorefrontDesign", href: "/dashboard/storefront-design", icon: Palette },
      { title: "Hero Slider", labelKey: "menuHeroSlider", href: "/dashboard/hero-slides", icon: GalleryHorizontal },
      { title: "Promo Banners", labelKey: "menuPromoBanners", href: "/dashboard/promo-banners", icon: Images },
      { title: "Announcements", labelKey: "menuAnnouncements", href: "/dashboard/announcements", icon: Megaphone },
    ],
  },
  { title: "Reviews", labelKey: "menuReviews", href: "/dashboard/reviews", icon: Star },
  {
    // Hidden unless the store's plan has staff_accounts. Staff & Roles is
    // owner-only; Activity Log is visible to staff given activity.view.
    title: "Staff",
    labelKey: "menuStaff",
    icon: UserCog,
    requiredFeature: "staff_accounts",
    children: [
      { title: "Staff & Roles", labelKey: "menuStaffAndRoles", href: "/dashboard/staff", icon: Users, ownerOnly: true },
      { title: "Activity Log", labelKey: "menuActivityLog", href: "/dashboard/activity", icon: History },
    ],
  },
  {
    title: "Setting",
    labelKey: "menuSetting",
    icon: Settings,
    children: [
      { title: "Store Management", labelKey: "menuStoreManagement", href: "/dashboard/store-management", icon: Store },
      { title: "Store SEO", labelKey: "menuStoreSeo", href: "/dashboard/store-seo", icon: Search },
      { title: "Social Platform", labelKey: "menuSocialPlatform", href: "/dashboard/social-media", icon: Share2 },
      { title: "Shipping", labelKey: "menuShipping", href: "/dashboard/shipping-Management", icon: Truck },
    ],
  },
  {
    title: "Subscription",
    labelKey: "menuSubscription",
    href: "/dashboard/subscription",
    icon: BadgeCheck,
    ownerOnly: true,
  },
];
