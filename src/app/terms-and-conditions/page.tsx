// app/terms-and-conditions/page.tsx
import React from "react";
import PageHeader from "@/app/components/websiteDetialsSection/PageHeader";
import ContentSection from "@/app/components/websiteDetialsSection/ContentSection";
import CTASection from "@/app/components/websiteDetialsSection/CTASection";
import { Section } from "@/lib/types/content.types";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { CONTACT_INFO } from "@/lib/store/contact";
import Link from "next/link";

const termsSections: Section[] = [
  {
    id: "agreement-terms",
    title: "Agreement to Terms",
    content:
      "By accessing and using Shei Hoise services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.",
  },
  {
    id: "free-trial",
    title: "Free Trial Period",
    content:
      "We offer a comprehensive 1-month free trial to help you experience Shei Hoise fully:",
    items: [
      "Full access to all platform features and capabilities",
      "No payment information required to start your trial",
      "Flexible cancellation at any time during trial period",
      "Automatic transition to paid subscription after trial",
      "Reminder notifications before trial period ends",
    ],
  },
  {
    id: "subscription-plans",
    title: "Subscription Plans & Billing",
    content:
      "After your free trial, choose the plan that best fits your business needs:",
    items: [
      "Monthly Plan: Flexible billing, cancel anytime",
      "Annual Plan: Cost-effective with significant savings",
      "Automatic renewal for uninterrupted service",
      "30-day notice for plan changes or price adjustments",
      "Pro-rated refunds for annual plans under specific conditions",
    ],
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    content: "As a valued Shei Hoise user, you agree to:",
    items: [
      "Provide accurate and current registration information",
      "Maintain account security and confidentiality",
      "Use services in compliance with applicable laws",
      "Respect intellectual property rights",
      "Not engage in fraudulent or harmful activities",
      "Promptly update business and contact information",
    ],
  },
  {
    id: "content-ownership",
    title: "Content Ownership & Licensing",
    content:
      "You retain full ownership of your business content while granting us necessary usage rights:",
    items: [
      "You own all store content, products, and business data",
      "We require license to display and process your content",
      "License is limited to service provision purposes",
      "You are responsible for content accuracy and legality",
      "We may remove content violating our policies",
    ],
  },
  {
    id: "service-availability",
    title: "Service Availability & Support",
    content: "We are committed to providing reliable service and support:",
    items: [
      "99.9% scheduled service availability target",
      "Advance notice for planned maintenance windows",
      "24/7 monitoring and rapid incident response",
      "Comprehensive customer support during business hours",
      "Regular platform updates and feature enhancements",
    ],
  },
];

export default function TermsAndConditions() {
  return (
    <div className="bg-background ">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          title="Terms & Conditions"
          subtitle="Legal Agreement"
          description="Please read these terms carefully before using Shei Hoise services. They outline your rights and responsibilities as a valued user of our platform."
        />

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 mb-8">
          <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
            {termsSections.map((section, index) => (
              <ContentSection
                key={section.id}
                section={section}
                index={index}
              />
            ))}

            <section className="mt-12 pt-8 border-t border-border">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Need Legal Assistance?
              </h3>
              <div className="bg-muted rounded-xl p-6">
                <p className="text-muted-foreground mb-4">
                  For questions about these Terms and Conditions or legal
                  inquiries:
                </p>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    📧 Email:{" "}
                    <Link
                      href={CONTACT_INFO.emailHref}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {CONTACT_INFO.email}
                    </Link>
                  </p>
                  <p>
                    📞 Phone:{" "}
                    <Link
                      href={CONTACT_INFO.phoneHref}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {CONTACT_INFO.phone}
                    </Link>
                  </p>
                  <p>
                    📍 Address:{" "}
                    <strong className="text-foreground">
                      {CONTACT_INFO.address}
                    </strong>
                  </p>

                  <p>
                    ⚖️ Dispute Resolution:{" "}
                    <strong className="text-foreground">
                      {CONTACT_INFO.support.disputeResolution}
                    </strong>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <CTASection
          title="Ready to Get Started?"
          description="Join thousands of successful entrepreneurs and begin your Shei Hoise journey with our 1-month free trial"
          buttonText="Schedule Free Trial"
          buttonHref="/demo-request"
          variant="secondary"
        />
      </main>
      <Footer />
    </div>
  );
}
