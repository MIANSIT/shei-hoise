import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          process.env.NEXT_PUBLIC_SERVER === "PROD"
            ? "tzmrxxtrkwehdgzeyhgq.supabase.co"
            : "lizjlqgrurjegmjeujki.supabase.co", // your Supabase bucket domain
        pathname: "/**", // allow all paths under this domain
      },
    ],
  },
};

export default nextConfig;
