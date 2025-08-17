"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import useCartStore from "@/lib/store/cartStore";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cart, totalPrice, totalItems } = useCartStore();
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
            <h2 className='text-lg font-semibold'>Your Cart</h2>
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
            <h2 className='text-xl font-bold mb-4'>Your Cart</h2>

            {cart.length === 0 ? (
              <p className='text-gray-500'>Your cart is empty.</p>
            ) : (
              <div className='space-y-4'>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center justify-between border-b pb-4'
                  >
                    {/* Product Image */}
                    <div className='flex items-center gap-4'>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className='w-16 h-16 object-cover rounded'
                      />
                      <div>
                        <h3 className='font-semibold'>{item.title}</h3>
                        <p className='text-sm text-gray-500'>{item.category}</p>
                        <p className='text-sm text-gray-700'>
                          Price:{" "}
                          <span className='font-medium'>
                            ${item.currentPrice}
                          </span>
                        </p>
                        <p className='text-sm text-gray-700'>
                          Quantity:{" "}
                          <span className='font-medium'>{item.quantity}</span>
                        </p>
                        <p className='text-sm text-gray-700'>
                          Subtotal:{" "}
                          <span className='font-bold'>
                            ${(item.currentPrice * item.quantity).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='flex items-center gap-2'>
                      <button
                        className='px-2 py-1 bg-gray-200 rounded hover:bg-gray-300'
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button className='px-2 py-1 bg-gray-200 rounded hover:bg-gray-300'>
                        +
                      </button>
                      <button className='px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600'>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cart Summary */}
                <div className='mt-6 border-t pt-4'>
                  <h3 className='text-lg font-semibold'>Cart Summary</h3>
                  <p className='text-white'>
                    Total Items:{" "}
                    <span className='font-medium'>{totalItems()}</span>
                  </p>
                  <p className='text-white'>
                    Total Price:{" "}
                    <span className='font-bold'>
                      ${totalPrice().toFixed(2)}
                    </span>
                  </p>
                  <button className='mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700'>
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
