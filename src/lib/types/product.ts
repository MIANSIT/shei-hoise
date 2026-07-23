// types/product.ts
export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
}

export interface ProductStock {
  quantity_available: number;
  quantity_reserved: number;
}

export interface ProductInventory {
  quantity_available: number;
  quantity_reserved: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  base_price: number;
  discounted_price?: number | null;
  tp_price?: number | null;
  color?: string | null;
  stock: ProductStock;
  product_inventory?: ProductInventory[]; // Added this
  primary_image: ProductImage | null;
  product_images?: ProductImage[];
}

export interface Product {
  description?: string;
  id: string;
  name: string;
  slug: string;
  base_price: number;
  discounted_price?: number | null;
  featured?: boolean;
  category?: Category | null;
  primary_image?: ProductImage | null;
  images?: string[];
  stock?: ProductStock | null;
  product_inventory?: ProductInventory[];
  variants?: ProductVariant[];
  /** 'bundle' products have no product_inventory row of their own — see BundleItem. */
  product_type?: "simple" | "bundle";
  /** 'bundle' products only — what the components would cost bought separately. */
  component_value?: number;
}

/** One recipe line of a bundle product: how many of a real product/variant it takes. */
export interface BundleItem {
  id: string;
  bundle_product_id: string;
  component_product_id: string;
  component_variant_id: string | null;
  quantity_needed: number;
  /** Rows sharing this id are alternatives for one slot — the customer picks one. */
  option_group_id: string | null;
  /** Shared across every row in a group; the label shown to the customer. */
  option_group_label: string | null;
  component?: {
    id: string;
    name: string;
    base_price: number;
    primary_image?: ProductImage | null;
    available_stock?: number;
  };
}