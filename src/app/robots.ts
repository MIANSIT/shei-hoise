import { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/stores",
          "/contact-us",
          "/help-center",
          "/privacy-policy",
          "/terms-and-conditions",
        ],
        disallow: [
          "/dashboard/",
          "/admin-login/",
          "/api/",
          "/auth/",
          "/onboarding/",
          "/_next/",
          "/health-check/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
