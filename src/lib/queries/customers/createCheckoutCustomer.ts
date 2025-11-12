/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/createCheckoutCustomer.ts
import { supabaseAdmin } from "@/lib/supabase";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";

export interface CreateCheckoutCustomerData extends CustomerCheckoutFormValues {
  store_slug: string;
}

export async function createCheckoutCustomer(customerData: CreateCheckoutCustomerData) {
  try {
    console.log('🔄 Creating checkout customer with data:', {
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      store_slug: customerData.store_slug
    });

    // Split full name into first and last name
    const nameParts = customerData.name.trim().split(' ');
    const first_name = nameParts[0] || customerData.name;
    const last_name = nameParts.slice(1).join(' ') || '';

    // ✅ FIX: Create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerData.email,
      password: customerData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
        user_type: 'customer',
        store_slug: customerData.store_slug
      }
    });

    if (authError) {
      console.error('❌ Auth creation error:', authError);
      
      // ✅ FIX: Handle specific error cases
      if (authError.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please login instead.');
      }
      
      throw new Error(`Failed to create customer account: ${authError.message}`);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // ✅ FIX: Create user record in users table
    const userInsertData = {
      id: authData.user.id,
      email: customerData.email,
      first_name: first_name,
      last_name: last_name,
      password_hash: 'auth_user_password_set', // Placeholder as auth is handled by Supabase Auth
      user_type: 'customer',
      phone: customerData.phone,
      email_verified: true,
      is_active: true
      // store_id is omitted for customers
    };

    console.log('📝 Inserting user with data:', userInsertData);

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert([userInsertData])
      .select()
      .single();

    if (userError) {
      console.error('❌ User creation error:', userError);
      
      // ✅ FIX: If user creation fails, delete the auth user to maintain consistency
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('❌ Failed to cleanup auth user:', deleteError);
      }
      
      throw new Error(`Failed to create customer record: ${userError.message}`);
    }

    console.log('✅ User record created:', userData);

    // ✅ FIX: Create profile in user_profiles table (optional but recommended)
    try {
      console.log('🏠 Creating user profile...');

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
        console.warn('⚠️ Profile creation warning (non-critical):', profileError);
        // Don't throw here - profile is optional
      } else {
        console.log('✅ Profile created successfully:', profileData);
      }
    } catch (profileError: any) {
      console.warn('⚠️ Unexpected error during profile creation (non-critical):', profileError);
      // Continue without profile - this is not critical
    }

    console.log('🎉 Customer creation completed successfully');

    return {
      user: userData,
      authUser: authData.user,
      success: true
    };
  } catch (error: any) {
    console.error('❌ Complete checkout customer creation error:', error);
    
    // ✅ FIX: Provide more user-friendly error messages
    if (error.message.includes('already exists')) {
      throw new Error('An account with this email already exists. Please login instead.');
    }
    
    if (error.message.includes('password')) {
      throw new Error('Password requirements not met. Please use a stronger password.');
    }
    
    throw new Error(error.message || 'Failed to create account. Please try again.');
  }
}