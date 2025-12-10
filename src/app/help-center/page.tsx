"use client";

import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export default function HelpCenterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Full-width Hero */}
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
      <section className="w-full py-16 px-4 lg:px-20 flex flex-col lg:flex-row gap-10 lg:gap-12">
        {/* Left Side */}
        <div className="flex-1 flex flex-col gap-6">
          {[
            {
              title: "Phone",
              info: "+1 (555) 123-4567",
              bg: "bg-blue-100 dark:bg-blue-900/30",
              icon: (
                <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ),
            },
            {
              title: "Email",
              info: "support@example.com",
              bg: "bg-green-100 dark:bg-green-900/30",
              icon: (
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              ),
            },
            {
              title: "Address",
              info: "106, Ibrahimpur Primary School Road, Kafrul, Dhaka-1206",
              bg: "bg-red-100 dark:bg-red-900/30",
              icon: (
                <MapPin className="w-6 h-6 text-red-600 dark:text-red-400" />
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-zinc-700 p-6 flex items-center gap-4 hover:shadow-xl transition bg-white dark:bg-zinc-800"
            >
              <div className={`p-4 rounded-full ${item.bg}`}>{item.icon}</div>
              <div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-gray-500 dark:text-gray-400">{item.info}</p>
              </div>
            </div>
          ))}

          <Link href="/contact-us">
            <Button className="mt-4 sm:mt-6 bg-linear-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition shadow-md">
              Contact Us
            </Button>
          </Link>
        </div>

        {/* Right Side Map */}
        <div className="flex-1 w-full h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-lg">
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
