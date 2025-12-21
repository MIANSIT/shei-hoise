"use client";

import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { CONTACT_INFO } from "@/lib/store/contact";
import BusinessHours from "@/app/components/contactUs/BusinessHours";

export default function HelpCenterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <section className="w-full bg-linear-to-r from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 py-16 sm:py-20 flex flex-col items-center text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 sm:mb-4">
          Help Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg sm:text-xl max-w-2xl">
          We’re here to help you. Reach out through any of the channels below or
          explore our resources.
        </p>
      </section>

      {/* Info Section */}
      <section className="w-full py-16 px-4 lg:px-20 flex flex-col lg:flex-row gap-10 lg:gap-12 items-stretch">
        {/* Left Side */}
        <div className="flex-1 flex flex-col gap-6 justify-start h-full">
          {/* Phone */}
          <div className="rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-zinc-700 p-6 flex items-center gap-4 hover:shadow-xl transition bg-white dark:bg-zinc-800">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Phone</h3>
              <Link
                href={CONTACT_INFO.phoneHref}
                className="text-gray-500 dark:text-gray-400 hover:text-ring hover:underline"
              >
                {CONTACT_INFO.phone}
              </Link>
            </div>
          </div>

          {/* Email */}
          <div className="rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-zinc-700 p-6 flex items-center gap-4 hover:shadow-xl transition bg-white dark:bg-zinc-800">
            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Email</h3>
              <Link
                href={CONTACT_INFO.emailHref}
                className="text-gray-500 dark:text-ring hover:text-ring hover:underline"
              >
                {CONTACT_INFO.email}
              </Link>
            </div>
          </div>

          {/* Business Hours Component */}
          <BusinessHours businessHours={CONTACT_INFO.businessHours} />

          {/* Address */}
          <div className="rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-zinc-700 p-6 flex items-center gap-4 hover:shadow-xl transition bg-white dark:bg-zinc-800">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
              <MapPin className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Address</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {CONTACT_INFO.address}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Link href="/contact-us">
            <Button className="mt-4 sm:mt-6 bg-linear-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition shadow-md">
              Contact Us
            </Button>
          </Link>
        </div>

        {/* Right Side Map */}
        <div className="flex-1 w-full h-full lg:h-96 rounded-2xl overflow-hidden shadow-lg">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1130.1391971382473!2d90.38423166963015!3d23.794746225771597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c761c206d7e5%3A0xf2cea179c77992bf!2sMIANS%20-%20IT%20FARM%20AND%20EVENT%20MANAGEMENT%20COMPANY!5e1!3m2!1sen!2sbd!4v1765372179308!5m2!1sen!2sbd"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
