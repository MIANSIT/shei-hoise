/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/createCheckoutCustomer.ts
import { supabaseAdmin } from "@/lib/supabase";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";

export interface CreateCheckoutCustomerData extends CustomerCheckoutFormValues {
  store_slug: string;
}

export async function createCheckoutCustomer(customerData: CreateCheckoutCustomerData) {
  try {
    console.log('Creating checkout customer with data:', {
      ...customerData,
      password: '***' // Don't log actual password
    });

    // Split full name into first and last name
    const nameParts = customerData.name.trim().split(' ');
    const first_name = nameParts[0] || customerData.name;
    const last_name = nameParts.slice(1).join(' ') || 'Customer';

    // Create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerData.email,
      password: customerData.password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
        user_type: 'customer',
        store_slug: customerData.store_slug
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw new Error(`Failed to create customer account: ${authError.message}`);
    }

    console.log('Auth user created:', authData.user.id);

    // Create user record in users table (without store_id for customers)
    const userInsertData = {
      id: authData.user.id,
      email: customerData.email,
      first_name: first_name,
      last_name: last_name,
      password_hash: 'auth_user_password_set', // This is required by your schema
      user_type: 'customer',
      phone: customerData.phone,
      email_verified: true,
      is_active: true
      // store_id is omitted for customers
    };

    console.log('Inserting user with data:', userInsertData);

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert([userInsertData])
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      
      // If user creation fails, delete the auth user to maintain consistency
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      throw new Error(`Failed to create customer record: ${userError.message}`);
    }

    console.log('User record created:', userData);

    // Create profile in user_profiles table with shipping address
    try {
      console.log('Creating profile in user_profiles table with data:', {
        user_id: authData.user.id,
        address_line_1: customerData.shippingAddress,
        city: customerData.city,
        postal_code: customerData.postCode,
        country: customerData.country
      });

      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          address_line_1: customerData.shippingAddress,
          city: customerData.city,
          postal_code: customerData.postCode,
          country: customerData.country
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw here - profile is optional, continue without it
      } else {
        console.log('Profile created successfully:', profileData);
      }
    } catch (profileError: any) {
      console.error('Unexpected error during profile creation:', profileError);
      // Continue without profile
    }

    return {
      user: userData,
      authUser: authData.user
    };
  } catch (error) {
    console.error('Complete checkout customer creation error:', error);
    throw error;
  }
}