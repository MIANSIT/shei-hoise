import { Product } from "./product";

export interface CartItem extends Product {
  quantity: number;
}

// If you have a separate CartState interface, make sure it uses the updated CartItem
export interface CartState {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, "quantity">) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
}