/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hook/useOrderProcess.ts
import { useState } from 'react';
import { createCustomerOrder, generateCustomerOrderNumber } from '../queries/orders/orderService';
import { CustomerCheckoutFormValues } from '../schema/checkoutSchema';
import { getStoreIdBySlug } from '../queries/stores/getStoreIdBySlug';
import useCartStore from '../store/cartStore';
import { CartProductWithDetails, CartCalculations } from '../types/cart';

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
    taxAmount: number = 0 // ✅ ADD THIS: Accept tax amount parameter
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Processing order with data:", {
        store_slug,
        storeCustomerId,
        storeCustomerIdType: storeCustomerId ? 'store_customer_id' : 'guest',
        paymentMethod,
        deliveryOption,
        shippingFee,
        taxAmount, // ✅ Include tax amount in logs
        cartItems: cartItems?.length,
        calculations: calculations?.totalPrice
      });

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

      // Prepare order data
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
          customer_id: storeCustomerId,
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
        taxAmount: taxAmount, // ✅ Include tax amount
        discount: calculations?.totalDiscount || 0,
        deliveryCost: shippingFee,
        totalAmount: totalWithTax, // ✅ Use total with tax
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        paymentMethod,
        currency: 'BDT',
        deliveryOption,
      };

      console.log("📦 Creating order with data:", {
        ...orderData,
        customerInfo: {
          ...orderData.customerInfo,
          customer_id: storeCustomerId
        },
        taxAmount,
        totalAmount: totalWithTax
      });

      // Create the order
      const result = await createCustomerOrder(orderData);
      console.log("📝 Order creation result:", result);

      if (result.success && result.orderId) {
        // Only clear cart if we're in checkout mode (not confirm mode)
        if (cartItems && cartItems.length > 0) {
          console.log("🧹 Clearing cart for store:", store_slug);
          clearStoreCart(store_slug);
        }

        return {
          success: true,
          orderId: result.orderId,
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