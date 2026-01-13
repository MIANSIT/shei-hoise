"use client";

import ContactUSForm from "@/app/components/contactUs/ContactUsForm";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { Phone, Mail } from "lucide-react";
import Link from "next/link";
import { CONTACT_INFO } from "@/lib/store/contact";

export default function ContactUSPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <section className="w-full bg-linear-to-r from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 py-16 sm:py-20 flex flex-col items-center text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 sm:mb-4">
          Contact Us
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg sm:text-xl max-w-2xl">
          Need assistance? Connect with us using any of the channels below or
          browse our helpful resources.
        </p>
      </section>

      <main className="grow flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="rounded-3xl shadow-xl p-10 border flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold mb-6 text-center lg:text-left">
              Other Ways to Reach Us
            </h2>
            <p className="mb-8 text-center lg:text-left">
              Prefer calling or emailing? Our dedicated support team is ready to
              assist you with any queries or concerns.
            </p>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 dark:bg-zinc-800 p-3 rounded-full">
                  <Phone className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                </div>
                <Link
                  href={CONTACT_INFO.phoneHref}
                  className="font-medium hover:text-ring hover:underline text-lg"
                >
                  {CONTACT_INFO.phone}
                </Link>
              </div>

              <div className="flex items-center space-x-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <Mail className="text-green-600 dark:text-green-400 w-6 h-6" />
                </div>
                <Link
                  href={CONTACT_INFO.emailHref}
                  className="font-medium hover:text-ring hover:underline text-lg"
                >
                  {CONTACT_INFO.email}
                </Link>
              </div>
            </div>

            <div className="mt-6 flex justify-center lg:justify-start">
              <span className="inline-flex items-center bg-border px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                <span className="w-3 h-3 bg-chart-2 rounded-full mr-2 inline-block"></span>
                We Are Open 24/7
              </span>
            </div>

            <div className="mt-10 text-gray-400 text-sm text-center lg:text-left">
              We aim to respond to all inquiries
              <span className="font-bold text-chart-2">
                {" "}
                {CONTACT_INFO.support.responseDay}
              </span>{" "}
            </div>
          </div>

          <div className="rounded-3xl shadow-2xl p-10 sm:p-12 border">
            <ContactUSForm
              source="contact_us"
              title="Contact Our Team"
              subtitle="Have questions or need assistance? Fill out the form below, and one of our specialists will reach out promptly to guide you."
              buttonText="Submit Request"
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
