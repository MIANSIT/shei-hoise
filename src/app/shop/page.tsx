"use client";
import React, { useState } from "react";
import MobileHeader from "../components/common/MobileHeader";
import DesktopHeader from "../components/common/DesktopHeader";
import ProductCard from "../components/shop/ProductCard";
import { SheiAlert, SheiAlertTitle } from "../components/ui/sheiAlert/SheiAlert";
import { FaCheck } from "react-icons/fa";
import { dummyProducts } from "../../lib/store/dummyProducts"; // ✅ imported product list

const Shop = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertProduct, setAlertProduct] = useState("");
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});

  const handleAddToCart = async (productId: number, productTitle: string) => {
    setLoadingStates((prev) => ({ ...prev, [productId]: true }));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setAlertProduct(productTitle);
    setShowAlert(true);
    setLoadingStates((prev) => ({ ...prev, [productId]: false }));
    setTimeout(() => setShowAlert(false), 3000);
  };

  return (
    <>
      <MobileHeader />
      <DesktopHeader />

      {/* ✅ Alert Notification */}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <SheiAlert variant="default" className="w-64">
            <FaCheck className="text-green-500" />
            <SheiAlertTitle>{alertProduct} added to cart</SheiAlertTitle>
          </SheiAlert>
        </div>
      )}

      {/* ✅ Product Grid */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {dummyProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product} // ⬅️ spread props (title, category, etc.)
              productLink={`/products/${product.id}`} // ⬅️ still override link
              onAddToCart={() => handleAddToCart(product.id, product.title)} // ⬅️ custom handler
              isLoading={loadingStates[product.id] || false} // ⬅️ loading state
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Shop;
