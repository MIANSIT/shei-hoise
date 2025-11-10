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
  id: string;
  name: string;
  slug: string;
  base_price: number;
  discounted_price?: number;
  category?: Category | null;
  primary_image?: ProductImage | null;
  images?: string[];
  stock?: ProductStock | null;
  product_inventory?: ProductInventory[]; // Added this
  variants?: ProductVariant[];
}