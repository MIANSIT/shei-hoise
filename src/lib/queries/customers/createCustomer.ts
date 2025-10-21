/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/createCustomer.ts
import { supabaseAdmin } from "../../../lib/supabase";

export interface CreateCustomerData {
  store_id: string;
  email: string;
  first_name: string;
  phone?: string;
  password: string;
  address_line_1?: string;
  city?: string;
  country?: string;
}

export async function createCustomer(customerData: CreateCustomerData) {
  try {
    console.log('Creating customer with data:', customerData);

    // Generate a unique email if not provided
    let customerEmail = customerData.email;
    if (!customerEmail || customerEmail.includes('@temp.com')) {
      customerEmail = `customer_${Date.now()}@${customerData.store_id}.com`;
    }

    // Use the provided password
    const customerPassword = customerData.password;

    // Create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: customerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: customerData.first_name,
        user_type: 'customer'
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw new Error(`Failed to create customer account: ${authError.message}`);
    }

    console.log('Auth user created:', authData.user.id);

    // Create user record in users table with ALL required fields
    const userInsertData = {
      id: authData.user.id,
      email: customerEmail,
      first_name: customerData.first_name,
      last_name: 'Customer',
      password_hash: 'auth_user_password_set',
      user_type: 'customer',
      phone: customerData.phone || null,
      store_id: customerData.store_id,
      email_verified: true,
      is_active: true
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

    // Create profile in user_profiles table if address data is provided
    if (customerData.address_line_1 || customerData.city) {
      try {
        console.log('Creating profile in user_profiles table with data:', {
          user_id: authData.user.id,
          address_line_1: customerData.address_line_1,
          city: customerData.city,
          country: customerData.country || 'Bangladesh'
        });

        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('user_profiles') // Using the correct table name
          .insert({
            user_id: authData.user.id,
            address_line_1: customerData.address_line_1,
            city: customerData.city,
            country: customerData.country || 'Bangladesh'
          })
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error details:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          });
          
          // Check if it's a "table not found" error
          if (profileError.message?.includes('Could not find the table') || profileError.code === 'PGRST204') {
            console.warn('user_profiles table not found. Profile creation skipped.');
          } else {
            console.error('Unexpected profile creation error:', profileError);
          }
          // Don't throw here - profile is optional
        } else {
          console.log('Profile created successfully in user_profiles:', profileData);
        }
      } catch (profileError: any) {
        console.error('Unexpected error during profile creation:', {
          message: profileError.message,
          stack: profileError.stack
        });
        // Continue without profile
      }
    } else {
      console.log('No address data provided, skipping profile creation');
    }

    return userData;
  } catch (error) {
    console.error('Complete customer creation error:', error);
    throw error;
  }
}