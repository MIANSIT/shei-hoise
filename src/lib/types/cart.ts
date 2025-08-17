import { Product } from "./product";

export interface CartItem extends Product {
  quantity: number;
}

export interface CartState {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, "quantity">) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}
