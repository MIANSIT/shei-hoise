// queries/shipping/createShippingFees.ts
import { supabase } from '@/lib/supabase';
import { ShippingOption } from './getShippingFees';

export async function createShippingFees(
  storeId: string,
  config: {
    currency: string;
    shipping_options: ShippingOption[];
    free_shipping_threshold?: number;
    processing_time_days?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('store_settings')
      .insert({
        store_id: storeId,
        currency: config.currency,
        shipping_fees: config.shipping_options,
        free_shipping_threshold: config.free_shipping_threshold,
        processing_time_days: config.processing_time_days,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error creating shipping fees:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}