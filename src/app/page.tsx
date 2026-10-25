import type { Metadata } from "next";
import HeroSection from "@/app/components/landing/HeroSection";
import FeaturesSection from "@/app/components/landing/FeaturesSection";
import StatsSection from "@/app/components/landing/StatsSection";
import HowItWorksSection from "@/app/components/landing/HowItWorksSection";
// import PricingSection from "@/app/components/landing/PricingSection";
import CTASection from "@/app/components/landing/CTASection";
import { FaqSection } from "@/app/components/landing/FaqSection";
import { getPublishedFaqs } from "@/lib/queries/faqs/getPublishedFaqs";
import Header from "@/app/components/common/Header";
import Footer from "@/app/components/common/Footer";
// import StoresSection from "@/app/components/landing/StoresSection"

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Shei Hoise — Create, Manage and Grow Your Online Store",
  description:
    "Shei Hoise is a multi-vendor e-commerce platform where independent stores in Bangladesh sell directly to shoppers. Discover and shop from verified local stores.",
  metadataBase: new URL(baseUrl),
  alternates: { canonical: baseUrl },
  openGraph: {
    title: "Shei Hoise — Create, Manage and Grow Your Online Store",
    description:
      "Discover and shop from verified local stores on Shei Hoise, a multi-vendor e-commerce platform in Bangladesh.",
    url: baseUrl,
    siteName: "Shei Hoise",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shei Hoise — Create, Manage and Grow Your Online Store",
    description:
      "Discover and shop from verified local stores on Shei Hoise, a multi-vendor e-commerce platform in Bangladesh.",
  },
};

// Re-read the FAQ table on each request so edits in the database show up
// immediately; the query is one small indexed read.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const faqs = await getPublishedFaqs();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        {/* Proof after the pitch: the reader now knows what it does, so scale
            is the next question they ask. */}
        <StatsSection />
        <HowItWorksSection />
        {/* <PricingSection />   */}
        {/* <StoresSection /> */}
        <FaqSection faqs={faqs} />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
