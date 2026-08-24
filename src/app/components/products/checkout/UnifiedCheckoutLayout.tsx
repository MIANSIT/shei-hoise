"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, ChevronRight, ChevronLeft, ChevronDown, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import CartItemsList from "../../cart/CartItemList";
import CheckoutForm from "./UserCheckoutForm";
import ShippingMethod from "./ShippingMethod";
import { CartProductWithDetails, CartCalculations } from "@/lib/types/cart";
import useCartStore from "@/lib/store/cartStore";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { CouponValidationResult } from "@/lib/types/coupon";

interface UnifiedCheckoutLayoutProps {
  storeSlug: string;
  cartItems: CartProductWithDetails[];
  calculations: CartCalculations;
  loading: boolean;
  error: string | null;
  onCheckout: (values: CustomerCheckoutFormValues) => void;
  onShippingChange: (method: string, fee: number) => void;
  selectedShipping: string;
  shippingFee: number;
  taxAmount: number;
  minOrderAmount?: number;
  isProcessing: boolean;
  mode?: "checkout" | "confirm";
  couponCode?: string;
  onCouponCodeChange?: (code: string) => void;
  onApplyCoupon?: () => void;
  onRemoveCoupon?: () => void;
  appliedCoupon?: CouponValidationResult | null;
  couponValidating?: boolean;
  onQuantityChange?: (
    productId: string,
    variantId: string | null,
    newQuantity: number,
    bundleSelections?: Record<string, string> | null
  ) => void;
  onRemoveItem?: (
    productId: string,
    variantId: string | null,
    bundleSelections?: Record<string, string> | null
  ) => void;
}

export default function UnifiedCheckoutLayout({
  storeSlug,
  cartItems,
  calculations,
  loading,
  error,
  onCheckout,
  onShippingChange,
  selectedShipping,
  shippingFee,
  taxAmount,
  minOrderAmount = 0,
  isProcessing,
  mode = "checkout",
  onQuantityChange,
  onRemoveItem,
  couponCode = "",
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  appliedCoupon,
  couponValidating = false,
}: UnifiedCheckoutLayoutProps) {
  const [activeSection, setActiveSection] = useState<"cart" | "customer">(
    "cart"
  );
  const [isClearing, setIsClearing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const {
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const { removeItem, updateQuantity, clearStoreCart } = useCartStore();
  const t = useTranslation();
  const n = useLocalNum();

  // One free-delivery product in the cart waives the fee for the whole order,
  // no matter how many other items or quantities are in it.
  const hasFreeDeliveryProduct = cartItems.some(
    (item) => item.product?.free_delivery === true
  );

  const couponDiscountAmount =
    appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;

  const totalWithShippingAndTax =
    calculations.totalPrice -
    couponDiscountAmount +
    shippingFee +
    (taxAmount > 0 ? taxAmount : 0);

  const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳";

  const handleQuantityChange = (
    productId: string,
    variantId: string | null,
    newQuantity: number,
    bundleSelections?: Record<string, string> | null
  ) => {
    if (mode === "checkout") {
      updateQuantity(productId, variantId, newQuantity, bundleSelections);
    } else if (mode === "confirm" && onQuantityChange) {
      onQuantityChange(productId, variantId, newQuantity, bundleSelections);
    }
  };

  const handleRemoveItem = (
    productId: string,
    variantId: string | null,
    bundleSelections?: Record<string, string> | null
  ) => {
    if (mode === "checkout") {
      removeItem(productId, variantId, bundleSelections);
    } else if (mode === "confirm" && onRemoveItem) {
      onRemoveItem(productId, variantId, bundleSelections);
    }
  };

  const handleClearCart = () => {
    if (mode === "checkout") {
      setIsClearing(true);
      clearStoreCart(storeSlug);
      setTimeout(() => setIsClearing(false), 300);
    }
  };

  // Check if order meets minimum amount
  const meetsMinOrderAmount = minOrderAmount <= 0 || calculations.subtotal >= minOrderAmount;
  
  // Calculate shortfall if any
  const shortfallAmount = minOrderAmount > 0 ? minOrderAmount - calculations.subtotal : 0;

  if (error) {
    return (
      <div className='container mx-auto p-4 lg:p-8'>
        <div className='text-center py-12'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto'>
            <div className='text-red-500 text-6xl mb-4'>⚠️</div>
            <h2 className='text-xl font-bold text-red-800 mb-2'>
              {t.checkout.invalidOrderData}
            </h2>
            <p className='text-red-600 mb-4'>{error}</p>
            <p className='text-sm text-muted-foreground'>
              {t.checkout.checkOrderLink}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && cartItems.length === 0) {
    return (
      <div className='container mx-auto p-4 lg:p-8'>
        <div className='text-center py-12'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-64 mx-auto mb-6'></div>
            <div className='h-4 bg-gray-200 rounded w-48 mx-auto mb-8'></div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <div className='bg-gray-100 rounded-lg h-96'></div>
              <div className='bg-gray-100 rounded-lg h-96'></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4 lg:p-8 pb-20 lg:pb-8'>
      <div className='text-center lg:text-left mb-6 lg:mb-8'>
        <h1 className='text-2xl lg:text-3xl font-bold text-foreground'>
          {mode === "confirm" ? t.checkout.confirmTitle : t.checkout.title}
        </h1>
        <p className='text-sm lg:text-base text-muted-foreground mt-2'>
          {mode === "confirm"
            ? t.checkout.reviewAndDetails
            : t.checkout.completePurchase}
        </p>

        {/* Minimum Order Amount Warning */}
        {minOrderAmount > 0 && !meetsMinOrderAmount && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">
              {t.checkout.minOrderWarningPrefix} {displayCurrencyIconSafe}{n(minOrderAmount.toFixed(2))}
            </p>
            <p className="text-yellow-600 text-sm mt-1">
              {t.checkout.addMoreToProceed} {displayCurrencyIconSafe}{n(shortfallAmount.toFixed(2))} {t.checkout.addMoreToProceedSuffix}
            </p>
          </div>
        )}
      </div>

      <div className='lg:hidden mb-6'>
        <div className='flex items-center justify-between text-sm mb-2'>
          <button
            onClick={() => setActiveSection("cart")}
            className={`flex items-center gap-1 ${
              activeSection === "cart"
                ? "text-yellow-600 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeSection === "customer" && (
              <ChevronLeft className='h-4 w-4' />
            )}
            {t.checkout.cartTab}
          </button>
          <button
            onClick={() => setActiveSection("customer")}
            className={`flex items-center gap-1 ${
              activeSection === "customer"
                ? "text-yellow-600 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.checkout.detailsTab}
            {activeSection === "cart" && <ChevronRight className='h-4 w-4' />}
          </button>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div
            className='bg-yellow-500 h-2 rounded-full transition-all duration-300'
            style={{ width: activeSection === "cart" ? "50%" : "100%" }}
          ></div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8'>
        <div
          className={`${
            activeSection === "customer" ? "hidden lg:block" : "block"
          }`}
        >
          <Card className='bg-card lg:sticky lg:top-8'>
            <CardHeader className='pb-4'>
              <div className='flex items-center gap-3'>
                <div className='bg-yellow-100 p-2 rounded-full'>
                  <ShoppingBag className='h-5 w-5 text-yellow-600' />
                </div>
                <div>
                  <CardTitle className='text-lg lg:text-xl font-semibold text-card-foreground'>
                    {t.checkout.yourOrder}
                  </CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    {n(calculations.totalItems)}{" "}
                    {calculations.totalItems === 1 ? t.checkout.item : t.checkout.items}
                  </p>
                </div>
              </div>
              <div className='h-1 bg-linear-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30 mt-2'></div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {cartItems.length === 0 ? (
                <div className='text-center py-8'>
                  <ShoppingBag className='h-12 w-12 text-muted-foreground mx-auto mb-3' />
                  <p className='text-muted-foreground'>
                    {t.checkout.noProductsInOrder}
                  </p>
                </div>
              ) : (
                <div className='max-h-100 lg:max-h-125 overflow-y-auto'>
                  <CartItemsList
                    items={cartItems}
                    onQuantityChange={handleQuantityChange}
                    onRemoveItem={handleRemoveItem}
                    onClearCart={mode === "checkout" ? handleClearCart : undefined}
                    isClearing={isClearing}
                    showStoreInfo={mode === "checkout"}
                    storeSlug={storeSlug}
                  />
                </div>
              )}

              {cartItems.length > 0 && (
                <div className='space-y-3 pt-4 border-t border-border'>
                  {mode === "checkout" && onApplyCoupon && onCouponCodeChange && (
                    <div className='pt-1'>
                      {appliedCoupon?.valid ? (
                        <div className='flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md px-3 py-2 text-sm'>
                          <span className='flex items-center gap-1.5 text-green-700 dark:text-green-400'>
                            <Tag className='h-3.5 w-3.5' />
                            {t.checkout.couponAppliedPrefix} &quot;{couponCode.toUpperCase()}&quot; {t.checkout.couponAppliedSuffix}
                          </span>
                          <button
                            type='button'
                            onClick={onRemoveCoupon}
                            className='text-muted-foreground hover:text-foreground'
                            aria-label={t.checkout.couponRemove}
                          >
                            <X className='h-4 w-4' />
                          </button>
                        </div>
                      ) : (
                        <div className='space-y-1.5'>
                          <div className='flex gap-2'>
                            <Input
                              placeholder={t.checkout.couponPlaceholder}
                              value={couponCode}
                              onChange={(e) => onCouponCodeChange(e.target.value)}
                              disabled={couponValidating}
                              className='h-9 text-sm'
                            />
                            <Button
                              type='button'
                              variant='outline'
                              className='h-9 shrink-0'
                              onClick={onApplyCoupon}
                              disabled={couponValidating || !couponCode.trim()}
                            >
                              {couponValidating ? t.checkout.couponApplying : t.checkout.couponApply}
                            </Button>
                          </div>
                          {appliedCoupon && appliedCoupon.valid === false && appliedCoupon.error && (
                            <p className='text-sm text-red-600'>{appliedCoupon.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className='border-t border-border pt-3'>
                    <ShippingMethod
                      storeSlug={storeSlug}
                      subtotal={calculations.subtotal}
                      selectedShipping={selectedShipping}
                      onShippingChange={onShippingChange}
                      hasFreeDeliveryProduct={hasFreeDeliveryProduct}
                    />
                  </div>

                  <div className='pt-3 border-t border-border'>
                    <div className='flex justify-between font-bold text-foreground text-lg'>
                      <span>{t.checkout.totalLabel}</span>
                      <motion.span
                        key={`total-${totalWithShippingAndTax}`}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {displayCurrencyIconSafe}
                        {n(totalWithShippingAndTax.toFixed(2))}
                      </motion.span>
                    </div>

                    <button
                      type='button'
                      onClick={() => setShowDetails((v) => !v)}
                      className='mt-1.5 flex w-full items-center justify-end gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors'
                    >
                      {t.checkout.viewDetailsLabel}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showDetails && (
                      <div className='mt-2.5 space-y-2 text-sm'>
                        <div className='flex justify-between text-foreground'>
                          <span>{t.checkout.subtotalLabel}</span>
                          <span>
                            {displayCurrencyIconSafe}
                            {n(calculations.subtotal.toFixed(2))}
                          </span>
                        </div>

                        {couponDiscountAmount > 0 && (
                          <div className='flex justify-between text-green-700 dark:text-green-400'>
                            <span>{t.checkout.couponDiscountLabel}</span>
                            <span>
                              -{displayCurrencyIconSafe}
                              {n(couponDiscountAmount.toFixed(2))}
                            </span>
                          </div>
                        )}

                        {selectedShipping && (
                          <div className='flex justify-between text-foreground'>
                            <span>{t.checkout.deliveryChargeLabel}</span>
                            <span>
                              {shippingFee > 0 ? (
                                <>
                                  {displayCurrencyIconSafe}
                                  {n(shippingFee.toFixed(2))}
                                </>
                              ) : (
                                t.checkout.freeShippingLabel
                              )}
                            </span>
                          </div>
                        )}

                        {taxAmount > 0 && (
                          <div className='flex justify-between text-foreground'>
                            <span>{t.checkout.taxAmount}</span>
                            <span>
                              {displayCurrencyIconSafe}
                              {n(taxAmount.toFixed(2))}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    className='w-full lg:hidden bg-yellow-500 hover:bg-yellow-600 text-white mt-4'
                    onClick={() => setActiveSection("customer")}
                    disabled={!meetsMinOrderAmount}
                  >
                    {meetsMinOrderAmount ? (
                      <>
                        {t.checkout.continueToDetails}
                        <ChevronRight className='h-4 w-4 ml-2' />
                      </>
                    ) : (
                      `${t.checkout.addPrefix} ${displayCurrencyIconSafe}${n(shortfallAmount.toFixed(2))} ${t.checkout.moreSuffix}`
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div
          className={`${
            activeSection === "cart" ? "hidden lg:block" : "block"
          }`}
        >
          <div className='space-y-6'>
            <Card className='bg-card'>
              <CardHeader className='pb-4'>
                <div className='flex items-center gap-3'>
                  <div className='bg-blue-100 p-2 rounded-full'>
                    <User className='h-5 w-5 text-blue-600' />
                  </div>
                  <div>
                    <CardTitle className='text-lg lg:text-xl font-semibold text-card-foreground'>
                      {t.checkout.customerInformation}
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      {t.checkout.shippingAndContactDetails}
                    </p>
                  </div>
                </div>
                <div className='h-1 bg-linear-to-r from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-500/30 mt-2'></div>
              </CardHeader>
              <CardContent>
                <CheckoutForm
                  onSubmit={onCheckout}
                  isLoading={isProcessing || !meetsMinOrderAmount}
                  shippingMethod={selectedShipping}
                  shippingFee={shippingFee}
                  taxAmount={taxAmount > 0 ? taxAmount : undefined}
                  totalAmount={totalWithShippingAndTax}
                  mode={mode}
                />

                <Button
                  variant='outline'
                  className='w-full lg:hidden mt-4'
                  onClick={() => setActiveSection("cart")}
                >
                  <ChevronLeft className='h-4 w-4 mr-2' />
                  {t.checkout.backToCart}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}