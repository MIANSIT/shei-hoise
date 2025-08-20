// app/checkout/page.tsx
"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "../components/cart/CartItemList";
import CartCheckoutLayout from "../components/cart/CartCheckoutLayout";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function CheckoutPage() {
  const { cart, totalPrice, totalItems } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMakePayment = () => {
    console.log("Proceeding Payment");
  };

  const displayCount = isMounted ? totalItems() : 0;

  return (
    <>
      <Header />

      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Your Cart ({displayCount} items)
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white">Your cart is empty</p>
                </div>
              ) : (
                <CartItemsList />
              )}
            </div>

            {cart.length > 0 && (
              <div className="bg-gray-900 rounded-lg shadow-md p-6">
                <CartCheckoutLayout
                  subtotal={totalPrice()}
                  onCheckout={handleMakePayment}
                  buttonText="Make Payment"
                />
              </div>
            )}
          </div>
          <div>
            <div className="bg-gray-900 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Customer Information
              </h2>
              <p className="text-white">Form will be placed here later</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
