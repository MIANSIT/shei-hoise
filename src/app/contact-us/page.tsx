import ContactUSForm from "@/app/components/contactUs/ContactUsForm";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { Phone, Mail } from "lucide-react";
import Link from "next/link";

export default function ContactUSPage() {
  return (
    <div className="flex flex-col min-h-screen ">
      <Header />

      <main className="grow flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left side: Contact Info */}
          <div className="rounded-3xl shadow-xl p-10 border  flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold mb-6 text-center lg:text-left ">
              Other Ways to Reach Us
            </h2>
            <p className="mb-8 text-center lg:text-left ">
              Prefer calling or emailing? Our dedicated support team is ready to
              assist you with any queries or concerns.
            </p>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <Phone className="text-blue-600 w-6 h-6" />
                </div>
                <Link
                  href="tel:+1234567890"
                  className="font-medium hover:text-blue-600 hover:underline text-lg "
                >
                  +1 (234) 567-890
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <Mail className="text-blue-600 w-6 h-6" />
                </div>
                <Link
                  href="mailto:support@example.com"
                  className="font-medium hover:text-blue-600 hover:underline text-lg "
                >
                  support@example.com
                </Link>
              </div>
            </div>

            <div className="mt-10 text-gray-400 text-sm text-center lg:text-left">
              We strive to respond to all inquiries within 24 hours on business
              days.
            </div>
          </div>

          {/* Right side: Contact Form */}
          <div className="rounded-3xl shadow-2xl p-10 sm:p-12 border ">
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
