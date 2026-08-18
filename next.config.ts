import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // ✅ produces a minimal .next/standalone bundle for Docker

  // sharp ships prebuilt native binaries per platform/libc. Bundling it would
  // break the native require; keep it external so it's resolved from
  // node_modules at runtime and traced into .next/standalone intact.
  serverExternalPackages: ["sharp"],

  images: {
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
      bodySizeLimit: "10mb", // ✅ increase this depending on max file size
    },
  },
};

export default nextConfig;
