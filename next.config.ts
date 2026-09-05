import type { NextConfig } from "next";

// Only true for local docker dev, where SUPABASE_PUBLIC_URL points at Kong
// on localhost — never in production, where it's the real api.sheihoise.com
// host. Used below to skip server-side image optimization there, for two
// independent reasons that both land on the same fix:
//  1. Next.js 16 has a confirmed regression (vercel/next.js#88873) where the
//     optimizer's remotePatterns check rejects valid matches — verified here:
//     the config is correct and the matching logic passes in isolation, but
//     the live /_next/image route still 400s with '"url" parameter is not
//     allowed'.
//  2. Even without that bug, the optimizer fetches the source image
//     server-side from *inside* the app container, where "localhost:8000" is
//     the container's own loopback, not the host's Kong — it could never
//     actually reach it. The browser, by contrast, loads that same URL
//     directly just fine (it's on the host).
// Production is unaffected (a normal HTTPS custom domain, reachable the same
// way for both the browser and the server). Unoptimized mode — a plain <img>
// pointed at the original URL, fetched by the browser instead of the server —
// sidesteps both problems at once.
const isLocalDev = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes("localhost");

const nextConfig: NextConfig = {
  output: "standalone", // ✅ produces a minimal .next/standalone bundle for Docker

  // sharp ships prebuilt native binaries per platform/libc. Bundling it would
  // break the native require; keep it external so it's resolved from
  // node_modules at runtime and traced into .next/standalone intact.
  serverExternalPackages: ["sharp"],

  images: {
    // See isLocalDev comment above — the optimizer's remotePatterns check is
    // broken against localhost in this Next.js version, so skip it entirely
    // in local dev rather than serve broken images.
    unoptimized: isLocalDev,

    // Optimization is ON. 810 of 818 catalogue images are still full-size PNGs
    // (some over 1.5 MB) uploaded before uploads started converting to WebP,
    // and most of the storefront renders them far smaller than their intrinsic
    // size. Optimising on demand converts and right-sizes them; results are
    // cached on disk (see the next-image-cache volume in docker-compose.yml —
    // without it every deploy would re-encode the whole catalogue).

    // WebP only, deliberately. AVIF compresses a little better but costs
    // roughly an order of magnitude more CPU per image, and this box has no
    // CDN in front of it — every transform is paid for locally.
    formats: ["image/webp"],

    // Stored filenames carry a timestamp, so a given URL's bytes never change.
    // 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,

    // Each distinct width/quality combination is a separate encode. The
    // defaults span 8 device widths and 8 image widths; these cover the
    // storefront's actual breakpoints with less than half the variants.
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [96, 256, 384],
    qualities: [75],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.sheihoise.com", // Self-hosted storage (Kong via Caddy)
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000", // Local dev's Kong — storage URLs point here before Caddy/DNS exist
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "sqvvtaejcfarmxcdvgrz.supabase.co", // Old hosted project
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tzmrxxtrkwehdgzeyhgq.supabase.co", // Old project (kept in case any stored image URLs still reference it)
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lizjlqgrurjegmjeujki.supabase.co", // Old project (kept in case any stored image URLs still reference it)
        pathname: "/**",
      },
      // Add any other Supabase project URLs you might use
    ],
  },

  async headers() {
    return [
      {
        // Static assets have content hashes — cache them forever
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // API routes — never cache
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      // Product images travel to createProduct/updateProduct as base64 data
      // URLs inside the Server Action body — up to 5 images at the 3MB
      // client-side cap each, plus ~37% base64 overhead, tops out near 21mb.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
