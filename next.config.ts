import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // ✅ produces a minimal .next/standalone bundle for Docker

  // sharp ships prebuilt native binaries per platform/libc. Bundling it would
  // break the native require; keep it external so it's resolved from
  // node_modules at runtime and traced into .next/standalone intact.
  serverExternalPackages: ["sharp"],

  images: {
    unoptimized: true, // ✅ disable image optimization
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
