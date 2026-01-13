// app/privacy-policy/page.tsx
import React from "react";
import PageHeader from "@/app/components/websiteDetialsSection/PageHeader";
import ContentSection from "@/app/components/websiteDetialsSection/ContentSection";
import { Section } from "@/lib/types/content.types";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { CONTACT_INFO } from "@/lib/store/contact";
import Link from "next/link";
const privacySections: Section[] = [
  {
    id: "information-collection",
    title: "Information We Collect",
    content:
      "Shei Hoise collects information to provide exceptional services to our users. We are transparent about our data practices and committed to protecting your privacy.",
    items: [
      "Personal information (name, email, contact details)",
      "Business information (products, pricing, store details)",
      "Secure payment information through trusted partners",
      "Store content, product images, and business data",
      "Usage analytics and platform interaction data",
      "Facebook business page information (with explicit consent)",
    ],
  },
  {
    id: "information-usage",
    title: "How We Use Your Information",
    content:
      "We use collected information exclusively to enhance your Shei Hoise experience and provide our services:",
    items: [
      "Provide, maintain, and continuously improve our platform",
      "Process transactions and manage subscription services",
      "Deliver important service updates and communications",
      "Offer personalized customer support and assistance",
      "Monitor platform performance and user experience",
      "Develop new features and services based on user needs",
    ],
  },
  {
    id: "information-sharing",
    title: "Information Sharing & Disclosure",
    content:
      "We respect your privacy and do not sell your personal information. We may share data only under these specific circumstances:",
    items: [
      "With your explicit consent for specific purposes",
      "With trusted service providers who assist our operations",
      "To comply with legal obligations and regulations",
      "To protect Shei Hoise rights and prevent fraud",
      "In connection with business transfers or acquisitions",
    ],
  },
  {
    id: "data-security",
    title: "Data Security & Protection",
    content:
      "We implement enterprise-grade security measures to protect your information:",
    items: [
      "End-to-end encryption for sensitive data transmission",
      "Regular security audits and vulnerability assessments",
      "Secure data storage with redundant backups",
      "Access controls and authentication protocols",
      "Continuous monitoring for suspicious activities",
    ],
  },
  {
    id: "user-rights",
    title: "Your Privacy Rights",
    content:
      "You maintain control over your personal information with these rights:",
    items: [
      "Access and download your personal data",
      "Correct inaccurate or incomplete information",
      "Request deletion of your personal data",
      "Object to specific data processing activities",
      "Data portability between services",
      "Withdraw consent at any time",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="bg-background ">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          title="Privacy Policy"
          description="We are committed to protecting your privacy and being transparent about our data practices. This policy explains how we collect, use, and safeguard your information."
        />

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 mb-8">
          <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
            {privacySections.map((section, index) => (
              <ContentSection
                key={section.id}
                section={section}
                index={index}
              />
            ))}

            <section className="mt-12 pt-8 border-t border-border">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Contact Our Privacy Team
              </h3>
              <div className="bg-muted rounded-xl p-6">
                <p className="text-muted-foreground mb-4">
                  If you have questions about this Privacy Policy or our data
                  practices, please contact our privacy team:
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
                    🕒 Response Time:{" "}
                    <strong className="text-foreground">
                   {  CONTACT_INFO.support.responseTime}
                    </strong>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
