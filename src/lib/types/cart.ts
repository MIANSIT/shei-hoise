import { Product } from "./product";

export interface CartItem extends Product {
  quantity: number;
  currentPrice?: number; 
  imageUrl?: string;
}

export interface CartState {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, "quantity"> & { imageUrl?: string; currentPrice?: number }) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
}

