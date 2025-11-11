// lib/hook/useOrderProcess.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { createCustomerOrder, generateCustomerOrderNumber } from '../queries/orders/orderService';
import { CustomerCheckoutFormValues } from '../schema/checkoutSchema';
import { getStoreIdBySlug } from '../queries/stores/getStoreIdBySlug';
import useCartStore from '../store/cartStore'; // Import cart store
import { CartProductWithDetails, CartCalculations } from '../types/cart';

export function useOrderProcess(store_slug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearStoreCart } = useCartStore(); // Get cart clearing function
  
  const processOrder = async (
    formData: CustomerCheckoutFormValues, 
    customerId?: string,
    paymentMethod: string = 'cod',
    deliveryOption: string = 'standard',
    shippingFee: number = 0,
    cartItems?: CartProductWithDetails[],
    calculations?: CartCalculations
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Processing order with data:", {
        store_slug,
        customerId,
        paymentMethod,
        deliveryOption,
        shippingFee,
        cartItems: cartItems?.length,
        calculations: calculations?.totalPrice
      });

      // Get store ID first
      const storeId = await getStoreIdBySlug(store_slug);
      if (!storeId) throw new Error('Store not found');

      // Check if cart has items
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');

      // Check for out of stock items
      const outOfStockItems = cartItems.filter(item => item.isOutOfStock);
      if (outOfStockItems.length > 0) {
        const itemNames = outOfStockItems.map(item => item.productName).join(', ');
        throw new Error(`Some items are out of stock: ${itemNames}. Please update your cart.`);
      }

      // Prepare order data using fresh product data from useCartItems
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
          customer_id: customerId,
        },
        orderProducts: cartItems.map(item => {
          return {
            product_id: item.productId, // Main product ID
            variant_id: item.variantId || null, // Variant ID if exists
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.displayPrice, // Use the calculated display price
            total_price: item.displayPrice * item.quantity,
            variant_details: item.variant ? {
              variant_name: item.variant.variant_name,
              color: item.variant.color,
              base_price: item.variant.base_price,
              discounted_price: item.variant.discounted_price,
            } : null,
          };
        }),
        subtotal: calculations?.subtotal || 0,
        taxAmount: 0, // You can calculate this based on your business logic
        discount: calculations?.totalDiscount || 0,
        deliveryCost: shippingFee, // You can calculate this based on delivery option
        totalAmount: (calculations?.totalPrice || 0) + shippingFee,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        paymentMethod,
        currency: 'BDT',
        deliveryOption,
      };

      console.log("📦 Creating order with data:", orderData);

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