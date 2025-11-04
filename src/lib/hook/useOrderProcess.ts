/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { createCustomerOrder, generateCustomerOrderNumber } from '../queries/orders/orderService';
import { useCartItems } from './useCartItems';
import { CustomerCheckoutFormValues } from '../schema/checkoutSchema';
import { getStoreIdBySlug } from '../queries/stores/getStoreIdBySlug';
import useCartStore from '../store/cartStore'; // Import cart store

export function useOrderProcess(store_slug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearStoreCart } = useCartStore(); // Get cart clearing function
  
  // Use the cart items hook to get fresh product data
  const { items: cartItems, calculations, refresh } = useCartItems(store_slug);

  const processOrder = async (
    formData: CustomerCheckoutFormValues, 
    customerId?: string,
    paymentMethod: string = 'cod',
    deliveryOption: string = 'standard',
    shippingFee: number = 0
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Get store ID first
      const storeId = await getStoreIdBySlug(store_slug);
      if (!storeId) throw new Error('Store not found');

      // Check if cart has items
      if (cartItems.length === 0) throw new Error('Cart is empty');

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
        subtotal: calculations.subtotal,
        taxAmount: 0, // You can calculate this based on your business logic
        discount: calculations.totalDiscount,
        deliveryCost: shippingFee, // You can calculate this based on delivery option
        totalAmount: calculations.totalPrice + shippingFee,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        paymentMethod,
        currency: 'BDT',
        deliveryOption,
      };

      // Create the order
      const result = await createCustomerOrder(orderData);

      if (result.success && result.orderId) {
        clearStoreCart(store_slug);
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
    cartItems,
    calculations,
  };
}