/* eslint-disable @typescript-eslint/no-explicit-any */
import { Product } from "./product";

export interface CartItem extends Product {
  quantity: number;
  currentPrice?: number; 
  discounted_price?: number;
  imageUrl?: string;
  store_slug: string;
  variant_id?: string; // ✅ ADD: Store variant ID separately
  variant_data?: any; // ✅ ADD: Store complete variant data
}

export interface CartProductInput {
  id: string; // ✅ This should always be the MAIN product ID
  slug: string;
  name: string;
  base_price: number;
  discounted_price?: number;
  variants?: any[];
  images?: string[];
  quantity?: number;
  store_slug: string;
  category?: {
    id: string;
    name: string;
  };
  imageUrl?: string;
  currentPrice?: number;
  primary_image?: {
    image_url: string;
  };
  product_images?: Array<{
    image_url: string;
  }>;
  variant_id?: string; // ✅ ADD: Variant ID if applicable
  variant_data?: any; // ✅ ADD: Complete variant data
}

export interface CartState {
  cart: CartItem[];
  addToCart: (product: CartProductInput) => void;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  clearStoreCart: (store_slug: string) => void;
  totalItems: () => number;
  totalItemsByStore: (store_slug: string) => number;
  totalPrice: () => number;
  totalPriceByStore: (store_slug: string) => number;
  getCartByStore: (store_slug: string) => CartItem[];
}