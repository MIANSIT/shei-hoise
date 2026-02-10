"use client";

import HeroSection from "@/app/components/landing/HeroSection";
import FeaturesSection from "@/app/components/landing/FeaturesSection";
import HowItWorksSection from "@/app/components/landing/HowItWorksSection";
// import PricingSection from "@/app/components/landing/PricingSection";
import CTASection from "@/app/components/landing/CTASection";
import Header from "@/app/components/common/Header";
import Footer from "@/app/components/common/Footer";
// import StoresSection from "@/app/components/landing/StoresSection"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        {/* <PricingSection /> */}
        {/* <StoresSection /> */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
