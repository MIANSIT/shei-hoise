/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/createCustomer.ts
import { supabaseAdmin } from "../../../lib/supabase";

export interface CreateCustomerData {
  store_id: string;
  email: string;
  first_name: string;
  phone?: string;
  address_line_1?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  // REMOVED: password field since we're not creating auth users
}

export async function createCustomer(customerData: CreateCustomerData) {
  try {
    console.log('Creating customer in store_customers table with data:', customerData);

    // Generate a unique email if not provided
    let customerEmail = customerData.email;
    if (!customerEmail || customerEmail.trim() === '') {
      customerEmail = `customer_${Date.now()}@${customerData.store_id}.com`;
    }

    // Create customer in store_customers table
    const customerInsertData = {
      name: customerData.first_name,
      email: customerEmail,
      phone: customerData.phone || null,
      // auth_user_id: null, // No auth user created
      // profile_id: null, // Will be set after profile creation
    };

    console.log('Inserting customer into store_customers:', customerInsertData);

    const { data: customerDataResult, error: customerError } = await supabaseAdmin
      .from('store_customers')
      .insert([customerInsertData])
      .select()
      .single();

    if (customerError) {
      console.error('Store customer creation error:', customerError);
      throw new Error(`Failed to create customer record: ${customerError.message}`);
    }

    console.log('Store customer created:', customerDataResult);

    // Create customer profile if address data is provided
    let profileData = null;
    if (customerData.address_line_1 || customerData.city || customerData.postal_code) {
      try {
        console.log('Creating customer profile with data:', {
          store_customer_id: customerDataResult.id,
          address: customerData.address_line_1,
          city: customerData.city,
          postal_code: customerData.postal_code,
          country: customerData.country || 'Bangladesh'
        });

        const { data: profileResult, error: profileError } = await supabaseAdmin
          .from('customer_profiles')
          .insert({
            store_customer_id: customerDataResult.id,
            address: customerData.address_line_1,
            city: customerData.city,
            postal_code: customerData.postal_code,
            country: customerData.country || 'Bangladesh'
          })
          .select()
          .single();

        if (profileError) {
          console.error('Customer profile creation error:', profileError);
          // Don't throw - profile is optional
        } else {
          console.log('Customer profile created:', profileResult);
          profileData = profileResult;

          // Update store_customer with profile_id
          const { error: updateError } = await supabaseAdmin
            .from('store_customers')
            .update({ profile_id: profileResult.id })
            .eq('id', customerDataResult.id);

          if (updateError) {
            console.error('Error updating store_customer with profile_id:', updateError);
          } else {
            console.log('Store customer updated with profile_id');
          }
        }
      } catch (profileError: any) {
        console.error('Unexpected error during customer profile creation:', profileError);
        // Continue without profile
      }
    } else {
      console.log('No address data provided, skipping customer profile creation');
    }

    // Link customer to store via store_customer_links
    try {
      console.log('Linking customer to store via store_customer_links:', {
        store_id: customerData.store_id,
        customer_id: customerDataResult.id
      });

      const { error: linkError } = await supabaseAdmin
        .from('store_customer_links')
        .insert({
          store_id: customerData.store_id,
          customer_id: customerDataResult.id
        });

      if (linkError) {
        console.error('Store customer link creation error:', linkError);
        // Don't throw - this is important but shouldn't block the whole process
      } else {
        console.log('Customer linked to store successfully');
      }
    } catch (linkError: any) {
      console.error('Unexpected error during store linking:', linkError);
    }

    // Return the complete customer data
    return {
      id: customerDataResult.id,
      name: customerDataResult.name,
      email: customerDataResult.email,
      phone: customerDataResult.phone,
      profile_id: profileData?.id || null,
      profile: profileData
    };

  } catch (error) {
    console.error('Complete customer creation error:', error);
    throw error;
  }
}