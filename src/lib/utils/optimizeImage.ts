import sharp from "sharp";

/**
 * Longest edge (px) a stored image is resized down to. Storefront layouts never
 * render wider than this, so anything larger is bytes the customer pays for and
 * never sees.
 */
const MAX_DIMENSION = 1600;

/** WebP quality. 82 is visually lossless for product photography. */
const WEBP_QUALITY = 82;

/**
 * Re-encodes an uploaded image as a size-capped WebP.
 *
 * Uploads currently store camera-resolution PNGs, which are the single largest
 * contributor to storefront load time — a 4MB PNG typically lands under 200KB
 * as WebP with no visible difference. Doing this once at upload costs nothing
 * per request, unlike optimizing on read.
 *
 * @param input Raw bytes of the uploaded file
 * @returns WebP-encoded bytes, resized so neither edge exceeds MAX_DIMENSION
 */
export async function optimizeImage(
  input: ArrayBuffer | Uint8Array,
): Promise<Buffer> {
  const buffer =
    input instanceof Uint8Array
      ? Buffer.from(input)
      : Buffer.from(new Uint8Array(input));

  return sharp(buffer)
    // Apply EXIF orientation before metadata is stripped, or phone photos
    // come out rotated.
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
