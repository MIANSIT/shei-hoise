// app/about/page.tsx
import React from "react";
import PageHeader from "@/app/components/websiteDetialsSection/PageHeader";
import FeatureGrid from "@/app/components/websiteDetialsSection/FeatureGrid";
import CTASection from "@/app/components/websiteDetialsSection/CTASection";
import { Feature } from "@/lib/types/content.types";
import Header from "../components/common/Header";
import {
  Store,
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
} from "lucide-react";
import Footer from "../components/common/Footer";

const features: Feature[] = [
  {
    id: "store-creation",
    icon: <Store className="w-7 h-7" />,
    title: "Instant Store Creation",
    description:
      "Launch your professional online store in minutes. No technical skills required - just focus on your products and customers.",
  },
  {
    id: "dashboard",
    icon: <BarChart3 className="w-7 h-7" />,
    title: "Advanced Dashboard",
    description:
      "Complete business overview with real-time analytics, order tracking, and performance metrics in one intuitive interface.",
  },
  {
    id: "product-management",
    icon: <ShoppingCart className="w-7 h-7" />,
    title: "Smart Product Management",
    description:
      "Easily manage inventory, bulk operations, and product variations with automated stock tracking and alerts.",
  },
  {
    id: "customer-insights",
    icon: <Users className="w-7 h-7" />,
    title: "Customer Intelligence",
    description:
      "Deep insights into customer behavior, purchase patterns, and preferences to drive your business growth.",
  },
  {
    id: "order-management",
    icon: <Package className="w-7 h-7" />,
    title: "Streamlined Order Processing",
    description:
      "Automated order workflows, status updates, and customer notifications to ensure smooth operations.",
  },
  {
    id: "flexible-pricing",
    icon: <CreditCard className="w-7 h-7" />,
    title: "Scalable Pricing",
    description:
      "Choose from flexible monthly or annual plans designed to grow with your business success.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          subtitle="About Shei Hoise"
          title="Revolutionizing Facebook Commerce"
          description="We provide enterprise-grade e-commerce tools for Facebook entrepreneurs, making professional online selling accessible to everyone."
        />

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Empowering Digital Entrepreneurs
              </h2>
              <div className="space-y-5 text-muted-foreground text-lg leading-relaxed">
                <p>
                  Shei Hoise was founded on a simple yet powerful insight:
                  brilliant entrepreneurs were building successful businesses on
                  Facebook but lacked the technical infrastructure to scale
                  their operations efficiently.
                </p>
                <p>
                  We bridge the crucial gap between social media commerce and
                  professional e-commerce by delivering enterprise-level tools
                  through an intuitive, user-friendly platform.
                </p>
                <p>
                  Our platform transforms your Facebook presence into a
                  fully-functional online store with inventory management, order
                  processing, and customer analytics - all without requiring
                  technical expertise.
                </p>
              </div>
            </div>
            <div className="bg-linear-to-br from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground">
              <div className="bg-primary-foreground/10 rounded-xl p-6 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-4">
                  Why Choose Shei Hoise?
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center mr-3">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    No technical skills required
                  </li>
                  <li className="flex items-center">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center mr-3">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    1-month full-featured free trial
                  </li>
                  <li className="flex items-center">
                    <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center mr-3">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    Enterprise features at startup prices
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <FeatureGrid
          features={features}
          title="Everything You Need to Succeed"
          description="Our comprehensive platform provides all the tools to manage and grow your Facebook business efficiently"
        />

        <CTASection
          title="Start Your Shei Hoise Journey Today"
          description="Join thousands of successful entrepreneurs and transform your Facebook business with our 1-month free trial"
          buttonText="Schedule Free Trial"
          buttonHref="/demo-request"
          variant="primary"
        />
      </main>
      <Footer />
    </div>
  );
}
