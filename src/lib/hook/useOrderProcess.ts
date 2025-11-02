/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { createCustomerOrder, generateCustomerOrderNumber } from '../../lib/queries/orders/orderService';
import useCartStore from '../../lib/store/cartStore';
import { CustomerCheckoutFormValues } from '../../lib/schema/checkoutSchema';
import { getStoreIdBySlug } from '../../lib/queries/stores/getStoreIdBySlug';

export function useOrderProcess(store_slug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getCartByStore, 
    totalPriceByStore, 
    clearStoreCart 
  } = useCartStore();

  const processOrder = async (
    formData: CustomerCheckoutFormValues, 
    customerId?: string,
    paymentMethod: string = 'cod',
    deliveryOption: string = 'standard'
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Get store ID first
      const storeId = await getStoreIdBySlug(store_slug);
      if (!storeId) throw new Error('Store not found');

      // Get cart items for this store
      const cartItems = getCartByStore(store_slug);
      if (cartItems.length === 0) throw new Error('Cart is empty');

      // Calculate totals
      const subtotal = totalPriceByStore(store_slug);
      const taxAmount = 0;
      const discount = 0;
      const deliveryCost = 0;
      const totalAmount = subtotal + taxAmount + deliveryCost - discount;

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
          customer_id: customerId,
        },
        orderProducts: cartItems.map(item => {
          const unitPrice = item.currentPrice ?? item.base_price;
          const totalPrice = unitPrice * item.quantity;
          
          console.log('📦 Order product:', {
            product_id: item.id,
            variant_id: item.variant_id,
            name: item.name,
            quantity: item.quantity
          });
          
          return {
            product_id: item.id,
            variant_id: item.variant_id || null,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            variant_details: item.variant_data || null,
          };
        }),
        subtotal,
        taxAmount,
        discount,
        deliveryCost,
        totalAmount,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        paymentMethod,
        currency: 'BDT',
        deliveryOption,
      };

      console.log('🔄 Creating order with products:', orderData.orderProducts);

      // Create the order
      const result = await createCustomerOrder(orderData);

      if (result.success && result.orderId) {
        console.log('✅ Order created successfully, clearing cart...');
        
        // Clear the cart for this store after successful order
        clearStoreCart(store_slug);
        
        console.log('🎉 Order completed successfully! Order ID:', result.orderId);
        
        // ✅ NO REDIRECT - just return success
        return { 
          success: true, 
          orderId: result.orderId,
          message: 'Order placed successfully!' 
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