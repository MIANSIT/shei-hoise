import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // ✅ disable image optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sqvvtaejcfarmxcdvgrz.supabase.co", // Current active project
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
