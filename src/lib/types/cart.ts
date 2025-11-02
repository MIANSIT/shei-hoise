import { AddToCartType } from "../schema/checkoutSchema";

export type CartItem = AddToCartType;

export interface CartState {
  cart: CartItem[];
  addToCart: (product: AddToCartType) => Promise<void>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  clearCart: () => void;
  clearStoreCart: (store_slug: string) => void;
  totalItems: () => number;
  totalItemsByStore: (store_slug: string) => number;
  getCartByStore: (store_slug: string) => CartItem[];
}

export interface CartProductWithDetails {
  productId: string;
  variantId: string | null | undefined;
  quantity: number;
  storeSlug: string;
  
  // Freshly fetched data
  product?: {
    id: string;
    name: string;
    slug: string;
    base_price: number | null;
    discounted_price: number | null;
    category?: {
      id: string;
      name: string;
    } | null;
    product_images: Array<{
      id: string;
      image_url: string;
      is_primary: boolean;
    }>;
  };
  
  // Allow null for variant to explicitly indicate no variant
  variant?: {
    id: string;
    variant_name: string | null;
    base_price: number | null;
    discounted_price: number | null;
    discount_amount: number | null;
    color: string | null;
    product_images: Array<{
      id: string;
      image_url: string;
      is_primary: boolean;
    }>;
    product_inventory: Array<{
      quantity_available: number;
      quantity_reserved: number;
    }>;
  } | null; // Added null here
  
  // Calculated fields
  displayPrice: number;
  originalPrice: number;
  discountPercentage: number;
  stock: number;
  isOutOfStock: boolean;
  imageUrl: string;
  productName: string;
}

export interface CartCalculations {
  items: CartProductWithDetails[];
  totalItems: number;
  totalPrice: number;
  totalDiscount: number;
  subtotal: number;
}