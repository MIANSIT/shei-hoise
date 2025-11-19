/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/createCheckoutCustomer.ts
import { supabaseAdmin } from "@/lib/supabase";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";

interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  country: string;
  city: string;
  postCode: string;
  shippingAddress: string;
  store_slug: string;
}

export async function createCheckoutCustomer(customerData: CreateCustomerData) {
  try {
    const {
      name,
      email,
      phone,
      password,
      country,
      city,
      postCode,
      shippingAddress,
      store_slug,
    } = customerData;

    console.log("🔄 Creating checkout customer:", {
      email,
      hasPassword: !!password,
      store_slug,
    });

    let authUserId: string | null = null;

    // ✅ STEP 1: Create auth user if password provided
    if (password && password.length > 0) {
      console.log("🔐 Creating auth user account");
      const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
        email: email.toLowerCase(),
        password: password,
        options: {
          data: {
            first_name: name.split(" ")[0] || name,
            last_name: name.split(" ").slice(1).join(" ") || "",
            phone: phone,
          },
        },
      });

      if (authError) {
        console.error("❌ Auth user creation failed:", authError);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (authData.user) {
        authUserId = authData.user.id;
        console.log("✅ Auth user created:", authUserId);
      }
    }

    // ✅ STEP 2: Get store ID
    console.log("🏪 Getting store ID for:", store_slug);
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("store_slug", store_slug)
      .single();

    if (storeError) {
      console.error("❌ Store not found:", storeError);
      throw new Error(`Store not found: ${storeError.message}`);
    }

    const storeId = store.id;
    console.log("✅ Store found:", storeId);

    // ✅ STEP 3: Check if customer already exists (by email) - FIXED: Include profile_id
    console.log("🔍 Checking if customer already exists...");
    const { data: existingCustomer, error: existingCustomerError } = await supabaseAdmin
      .from("store_customers")
      .select("id, auth_user_id, email, profile_id") // ✅ ADDED profile_id here
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let customerId: string;
    let existingProfileId: string | null = null;

    if (existingCustomer) {
      console.log("📧 Customer already exists:", {
        id: existingCustomer.id,
        auth_user_id: existingCustomer.auth_user_id,
        profile_id: existingCustomer.profile_id
      });
      customerId = existingCustomer.id;
      existingProfileId = existingCustomer.profile_id;

      // ✅ If customer exists but no auth account AND password is provided, upgrade to auth account
      if (!existingCustomer.auth_user_id && password && password.length > 0) {
        console.log("🔐 Upgrading existing customer to authenticated account");
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email: email.toLowerCase(),
          password: password,
          options: {
            data: {
              first_name: name.split(" ")[0] || name,
              last_name: name.split(" ").slice(1).join(" ") || "",
              phone: phone,
            },
          },
        });

        if (authError) {
          console.error("❌ Auth account creation failed:", authError);
          // Continue without auth upgrade
        } else if (authData.user) {
          authUserId = authData.user.id;
          console.log("✅ Auth account created for existing customer:", authUserId);

          // Update store_customer with auth_user_id
          await supabaseAdmin
            .from("store_customers")
            .update({ 
              auth_user_id: authUserId,
              updated_at: new Date().toISOString()
            })
            .eq("id", customerId);
          
          console.log("✅ Store customer updated with auth_user_id");
        }
      }
    } else {
      // ✅ STEP 4: Create user profile for NEW customers
      console.log("📝 Creating user profile for new customer");
      const profileData = {
        user_id: authUserId, // Will be null for guest customers
        address_line_1: shippingAddress,
        city: city,
        postal_code: postCode,
        country: country,
      };

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .insert([profileData])
        .select("id")
        .single();

      if (profileError) {
        console.error("❌ User profile creation failed:", profileError);
        
        // Clean up auth user if created
        if (authUserId) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }
        
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log("✅ User profile created:", profile.id);
      existingProfileId = profile.id;

      // ✅ STEP 5: Create store customer with profile_id linked
      console.log("👤 Creating store customer with profile link");
      const customerDataToInsert = {
        name: name,
        email: email.toLowerCase(),
        phone: phone,
        auth_user_id: authUserId,
        profile_id: profile.id, // ✅ LINKED to user_profiles
      };

      const { data: customer, error: customerError } = await supabaseAdmin
        .from("store_customers")
        .insert([customerDataToInsert])
        .select("id, auth_user_id, profile_id, name, email")
        .single();

      if (customerError) {
        console.error("❌ Store customer creation failed:", customerError);
        
        // Clean up: Delete the profile we created
        await supabaseAdmin.from("user_profiles").delete().eq("id", profile.id);
        
        // Also delete auth user if created
        if (authUserId) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }
        
        throw new Error(`Failed to create customer record: ${customerError.message}`);
      }

      customerId = customer.id;
      console.log("✅ Store customer created successfully:", {
        customerId: customer.id,
        authUserId: customer.auth_user_id,
        profileId: customer.profile_id,
        email: customer.email
      });
    }

    // ✅ STEP 6: Create store_customer_links entry
    console.log("🔗 Creating store customer link");
    const { error: linkError } = await supabaseAdmin
      .from("store_customer_links")
      .insert([
        {
          customer_id: customerId,
          store_id: storeId,
        },
      ])
      .select()
      .single();

    if (linkError) {
      // If it's a unique constraint violation, that's fine - the link already exists
      if (linkError.code === '23505') {
        console.log("✅ Store customer link already exists");
      } else {
        console.error("❌ Store customer link creation failed:", linkError);
        throw new Error(`Failed to create store customer link: ${linkError.message}`);
      }
    } else {
      console.log("✅ Store customer link created successfully");
    }

    // ✅ STEP 7: Update user profile with address for existing customers
    if (existingCustomer && existingProfileId) {
      console.log("📝 Updating user profile for existing customer");
      const { error: profileUpdateError } = await supabaseAdmin
        .from("user_profiles")
        .update({
          address_line_1: shippingAddress,
          city: city,
          postal_code: postCode,
          country: country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfileId); // ✅ Use the existingProfileId variable

      if (profileUpdateError) {
        console.error("❌ Profile update failed:", profileUpdateError);
      } else {
        console.log("✅ User profile updated with new address");
      }
    }

    return {
      success: true,
      customerId: customerId,
      authUserId: authUserId,
      storeId: storeId,
      profileId: existingProfileId,
      message: password 
        ? "Customer account created successfully with auth, profile, and store link" 
        : "Guest customer created successfully with profile and store link",
    };
  } catch (error: any) {
    console.error("❌ Error in createCheckoutCustomer:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}