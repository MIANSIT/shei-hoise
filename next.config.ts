import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // ✅ disable image optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tzmrxxtrkwehdgzeyhgq.supabase.co", // Production
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lizjlqgrurjegmjeujki.supabase.co", // Development
        pathname: "/**",
      },
      // Add any other Supabase project URLs you might use
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // ✅ increase this depending on max file size
    },
  },
};

export default nextConfig;
