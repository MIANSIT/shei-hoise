// components/cart/CartSidebar.tsx
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import useCartStore from "@/lib/store/cartStore";
import { CartItem } from "../../../lib/types/cart";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cart, totalPrice, totalItems, removeItem, updateQuantity } = useCartStore();

  // Prevent background scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(item.id, newQuantity);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md text-white bg-black shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className='flex flex-col h-full'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b'>
            <h2 className='text-lg font-semibold'>Your Cart ({totalItems()})</h2>
            <button
              onClick={onClose}
              className='p-1 rounded-md hover:bg-gray-800 cursor-pointer'
              aria-label='Close cart'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {/* Cart Content */}
          <div className='flex-1 p-4 overflow-y-auto'>
            {cart.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-gray-500'>Your cart is empty</p>
                <button
                  onClick={onClose}
                  className='mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className='space-y-4'>
                {cart.map((item: CartItem) => (
                  <div
                    key={item.id}
                    className='flex items-start justify-between border-b border-gray-700 pb-4'
                  >
                    {/* Product Image and Info */}
                    <div className='flex items-start gap-4 flex-1'>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className='w-16 h-16 object-cover rounded'
                      />
                      <div className='flex-1'>
                        <h3 className='font-semibold'>{item.title}</h3>
                        <p className='text-sm text-gray-400'>{item.category}</p>
                        <p className='text-sm text-gray-300 mt-1'>
                          ${item.currentPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className='flex flex-col items-end gap-2'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                          className='w-6 h-6 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600'
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className='w-6 text-center'>{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          className='w-6 h-6 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600'
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className='text-xs text-red-400 hover:text-red-300'
                      >
                        Remove
                      </button>
                      <p className='text-sm font-medium'>
                        ${(item.currentPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className='p-4 border-t border-gray-700'>
              <div className='flex justify-between mb-2'>
                <span>Subtotal:</span>
                <span className='font-medium'>${totalPrice().toFixed(2)}</span>
              </div>
              <button
                className='w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                onClick={() => {
                  // Add your checkout logic here
                  console.log('Proceeding to checkout');
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}