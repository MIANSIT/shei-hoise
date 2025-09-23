// File: productImage/uploadProductImage.ts
import { supabaseAdmin } from "@/lib/supabase";

export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string> {
  try {
    const fileName = `${productId}/${Date.now()}-${file.name}`;

    // Upload file to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("shei-hoise-product")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabaseAdmin.storage
      .from("shei-hoise-product")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error("uploadProductImage error:", err);
    throw err;
  }
}
