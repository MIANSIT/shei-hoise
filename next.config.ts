import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["lizjlqgrurjegmjeujki.supabase.co"], // <- add your Supabase bucket domain
  },
};

export default nextConfig;
