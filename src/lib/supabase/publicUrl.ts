/**
 * Rewrites a Supabase Storage URL onto the browser-facing origin.
 *
 * `supabaseAdmin` is built with SUPABASE_INTERNAL_URL (http://kong:8000) so
 * server code can reach Kong over the compose network — see the comment in
 * admin.ts. But `getPublicUrl()` is pure string concatenation against whatever
 * base its client was constructed with, so on the VPS it hands back
 * http://kong:8000/storage/v1/object/public/... — a hostname that only
 * resolves inside Docker. Those URLs get persisted and later served to
 * browsers, so the origin has to be swapped for the public one *before* the
 * value reaches the database.
 *
 * @param url A storage URL as returned by `getPublicUrl().data.publicUrl`
 * @returns The same path on NEXT_PUBLIC_SUPABASE_URL's origin
 */
export function toPublicStorageUrl(url: string): string {
  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicBase) return url;

  try {
    const target = new URL(url);
    const base = new URL(publicBase);
    target.protocol = base.protocol;
    // hostname + port, not host: the `host` setter leaves an existing port in
    // place when the value it's given has none, so assigning "api.sheihoise.com"
    // to a URL of http://kong:8000/... yields https://api.sheihoise.com:8000/...
    target.hostname = base.hostname;
    target.port = base.port;
    return target.toString();
  } catch {
    // Not a parseable absolute URL — leave it alone rather than corrupt it.
    return url;
  }
}
