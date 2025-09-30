import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lizjlqgrurjegmjeujki.supabase.co", // your Supabase bucket domain
        pathname: "/**", // allow all paths under this domain
      },
    ],
  },
};

export default nextConfig;
