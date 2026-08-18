"use server";
// File: productImage/uploadProductImage.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicStorageUrl } from "@/lib/supabase/publicUrl";
import { optimizeImage } from "@/lib/utils/optimizeImage";

export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string> {
  try {
    // Filenames carry a timestamp, so a given URL's bytes never change — safe
    // to cache in the browser for a year.
    const baseName = file.name.replace(/\.[^./]+$/, "");
    const fileName = `${productId}/${Date.now()}-${baseName}.webp`;

    const optimized = await optimizeImage(await file.arrayBuffer());

    // Upload file to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("shei-hoise-product")
      .upload(fileName, optimized, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabaseAdmin.storage
      .from("shei-hoise-product")
      .getPublicUrl(fileName);

    return toPublicStorageUrl(data.publicUrl);
  } catch (err) {
    console.error("uploadProductImage error:", err);
    throw err;
  }
}
