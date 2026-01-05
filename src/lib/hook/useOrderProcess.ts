/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hook/useOrderProcess.ts - FIXED VERSION
import { useState } from 'react';
import { createCustomerOrder, generateCustomerOrderNumber } from '../queries/orders/orderService';
import { CustomerCheckoutFormValues } from '../schema/checkoutSchema';
import { getStoreIdBySlug } from '../queries/stores/getStoreIdBySlug';
import useCartStore from '../store/cartStore';
import { CartProductWithDetails, CartCalculations } from '../types/cart';
import { OrderStatus, PaymentStatus } from '../types/enums';

export function useOrderProcess(store_slug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearStoreCart } = useCartStore();

  const processOrder = async (
    formData: CustomerCheckoutFormValues,
    storeCustomerId?: string,
    paymentMethod: string = 'cod',
    deliveryOption: string = 'standard',
    shippingFee: number = 0,
    cartItems?: CartProductWithDetails[],
    calculations?: CartCalculations,
    taxAmount: number = 0
  ) => {
    setLoading(true);
    setError(null);

    try {
     

      // Validate store slug first
      if (!store_slug || store_slug === "undefined") {
        throw new Error('Store slug is invalid or undefined');
      }

      // Get store ID first
      const storeId = await getStoreIdBySlug(store_slug);
      if (!storeId) {
        throw new Error(`Store not found for slug: ${store_slug}`);
      }

      // Check if cart has items
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');

      // Check for out of stock items
      const outOfStockItems = cartItems.filter(item => item.isOutOfStock);
      if (outOfStockItems.length > 0) {
        const itemNames = outOfStockItems.map(item => item.productName).join(', ');
        throw new Error(`Some items are out of stock: ${itemNames}. Please update your cart.`);
      }

      // ✅ Calculate total with tax
      const subtotal = calculations?.subtotal || 0;
      const totalWithTax = subtotal + shippingFee + taxAmount;

      // Prepare order data with enum values
      const orderData = {
        storeId: storeId,
        orderNumber: generateCustomerOrderNumber(store_slug),
        customerInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.shippingAddress,
          city: formData.city,
          country: formData.country,
          customer_id: storeCustomerId, // This should come from the checkout page
        },
        orderProducts: cartItems.map(item => {
          return {
            product_id: item.productId,
            variant_id: item.variantId || null,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.displayPrice,
            total_price: item.displayPrice * item.quantity,
            variant_details: item.variant ? {
              variant_name: item.variant.variant_name,
              color: item.variant.color,
              base_price: item.variant.base_price,
              discounted_price: item.variant.discounted_price,
            } : null,
          };
        }),
        subtotal: subtotal,
        taxAmount: taxAmount,
        discount: 0, // ✅ FIXED: Always 0 for customer orders - product price differences are not order discounts
        additionalCharges: 0, // Default to 0 for customer orders
        deliveryCost: shippingFee,
        totalAmount: totalWithTax,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod,
        currency: 'BDT',
        deliveryOption,
      };

      

      // Create the order
      const result = await createCustomerOrder(orderData);

      if (result.success && result.orderId) {
        // Only clear cart if we're in checkout mode (not confirm mode)
        if (cartItems && cartItems.length > 0) {
          clearStoreCart(store_slug);
        }

        return {
          success: true,
          orderId: result.orderId,
          orderNumber: orderData.orderNumber,
          message: 'Order placed successfully! Your cart has been cleared.'
        };
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err: any) {
      console.error('❌ Order process error:', err);
      setError(err.message || 'Failed to process order');
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    processOrder,
    loading,
    error,
  };
}