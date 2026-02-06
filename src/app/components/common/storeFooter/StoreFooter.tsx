"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaLinkedinIn,
  FaTiktok,
} from "react-icons/fa";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";

export type StoreFooterProps = {
  brandName: string | React.ReactNode;
  storeSlug: string;
  storeLogo?: string | null;
  storeName?: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  aboutLink?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    tiktok?: string;
  };
  bottomLinks: { label: string; href: string }[];
  newsletterCTA?: {
    title: string;
    description: string;
    buttonText: string;
    placeholder: string;
  };
};

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, idx) =>
    part.match(urlRegex) ? (
      <a
        key={idx}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:opacity-80 transition-opacity dark:text-primary-400"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export default function StoreFooter({
  brandName,
  storeSlug,
  storeLogo,
  storeName,
  storeDescription,
  contactEmail,
  contactPhone,
  contactAddress,
  aboutLink,
  socialLinks,
  bottomLinks,
  //   newsletterCTA,
}: StoreFooterProps) {
  const renderSocialIcons = () => (
    <div className="flex gap-3">
      {socialLinks?.facebook && (
        <Link
          href={socialLinks.facebook}
          target="_blank"
          aria-label="Facebook"
          className="group relative"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-100 to-white border border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
            <FaFacebookF className="text-primary group-hover:text-[#1877F2]  dark:group-hover:text-[#1877F2]" />
          </span>
        </Link>
      )}
      {socialLinks?.instagram && (
        <Link
          href={socialLinks.instagram}
          target="_blank"
          aria-label="Instagram"
          className="group relative"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-100 to-white border border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
            <FaInstagram className="text-primary group-hover:text-[#E4405F]  dark:group-hover:text-[#E4405F]" />
          </span>
        </Link>
      )}
      {socialLinks?.twitter && (
        <Link
          href={socialLinks.twitter}
          target="_blank"
          aria-label="Twitter"
          className="group relative"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-100 to-white border border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
            <FaTwitter className="text-primary group-hover:text-[#1DA1F2]  dark:group-hover:text-[#1DA1F2]" />
          </span>
        </Link>
      )}
      {socialLinks?.youtube && (
        <Link
          href={socialLinks.youtube}
          target="_blank"
          aria-label="YouTube"
          className="group relative"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-100 to-white border border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
            <FaYoutube className="text-primary group-hover:text-[#FF0000]  dark:group-hover:text-[#FF0000]" />
          </span>
        </Link>
      )}
      {socialLinks?.linkedin && (
        <Link
          href={socialLinks.linkedin}
          target="_blank"
          aria-label="LinkedIn"
          className="group relative"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-100 to-white border border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
            <FaLinkedinIn className="text-gray-600 group-hover:text-[#0077B5] dark:text-gray-400 dark:group-hover:text-[#0077B5]" />
          </span>
        </Link>
      )}
      {socialLinks?.tiktok && (
        <Link
          href={socialLinks.tiktok}
          target="_blank"
          aria-label="TikTok"
          className="group relative"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-100 to-white border border-gray-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
            <FaTiktok className="text-primary group-hover:text-[#000000] dark:text-gray-400 dark:group-hover:text-[#000000]" />
          </span>
        </Link>
      )}
    </div>
  );

  return (
    <footer className="bg-linear-to-b from-gray-50 to-white border-t border-gray-200 dark:from-black dark:to-black dark:border-gray-800">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Desktop Layout - Cleaner 4-column layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-10">
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center shadow-sm">
                {storeLogo ? (
                  <Image
                    src={storeLogo}
                    alt={
                      storeName ||
                      (typeof brandName === "string" ? brandName : "Brand")
                    }
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-gray-700 dark:text-gray-300 font-bold text-lg">
                    {storeName?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <div>
                {storeName && (
                  <Link
                    href={`/${storeSlug}`}
                    className="text-xl font-bold text-gray-900 hover:text-primary transition-colors dark:text-white dark:hover:text-primary-400"
                  >
                    {storeName}
                  </Link>
                )}
              </div>
            </div>

            {storeDescription && (
              <p className="text-gray-600 leading-relaxed text-sm dark:text-gray-300">
                {linkify(storeDescription)}
              </p>
            )}
            {socialLinks && (
              <div className="pt-4">
                <p className="text-sm font-semibold text-gray-900 mb-3 dark:text-white">
                  Connect with us
                </p>
                {renderSocialIcons()}
              </div>
            )}
          </div>

          {/* Column 2: Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 dark:text-white">
              Company
            </h4>
            <ul className="space-y-3">
              {aboutLink && (
                <li>
                  <Link
                    href={aboutLink}
                    className="text-gray-600 hover:text-primary hover:translate-x-1 transition-all duration-300 inline-block py-1 dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    About Us
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 dark:text-white">
              Contact
            </h4>
            <ul className="space-y-4">
              {contactEmail && (
                <li className="flex items-start gap-3">
                  <FiMail className="w-5 h-5 text-primary mt-0.5 shrink-0 dark:text-primary-400" />
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-3">
                  <FiPhone className="w-5 h-5 text-primary shrink-0 dark:text-primary-400" />
                  <a
                    href={`tel:${contactPhone}`}
                    className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    {contactPhone}
                  </a>
                </li>
              )}
              {contactAddress && (
                <li className="flex items-start gap-3">
                  <FiMapPin className="w-5 h-5 text-primary mt-0.5 shrink-0 dark:text-primary-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {contactAddress}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 dark:text-white">
              Legal
            </h4>
            <ul className="space-y-3">
              {bottomLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-primary hover:translate-x-1 transition-all duration-300 inline-block py-1 dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-10">
          {/* Brand & Description */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {storeLogo && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm dark:bg-gray-800">
                  <Image
                    src={storeLogo}
                    alt={
                      storeName ||
                      (typeof brandName === "string" ? brandName : "Brand")
                    }
                    fill
                    className="object-contain p-2"
                  />
                </div>
              )}
              <div>
                {storeName && (
                  <Link
                    href={`/${storeSlug}`}
                    className="text-xl font-bold text-gray-900 hover:text-primary transition-colors dark:text-white dark:hover:text-primary-400"
                  >
                    {storeName}
                  </Link>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Premium E-commerce Solutions
                </p>
              </div>
            </div>

            {storeDescription && (
              <p className="text-gray-600 leading-relaxed text-sm dark:text-gray-300">
                {linkify(storeDescription)}
              </p>
            )}
          </div>

          {/* Links Grid - 2 columns for mobile */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider dark:text-white">
                Company
              </h4>
              <ul className="space-y-3">
                {aboutLink && (
                  <li>
                    <Link
                      href={aboutLink}
                      className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-400"
                    >
                      About Us
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider dark:text-white">
                Legal
              </h4>
              <ul className="space-y-3">
                {bottomLinks.slice(0, 3).map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Section */}
          {(contactEmail || contactPhone || contactAddress) && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider dark:text-white">
                Contact
              </h4>
              <ul className="space-y-3">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-400 flex items-center gap-2"
                    >
                      <FiMail className="w-4 h-4" />
                      {contactEmail}
                    </a>
                  </li>
                )}
                {contactPhone && (
                  <li>
                    <a
                      href={`tel:${contactPhone}`}
                      className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-400 flex items-center gap-2"
                    >
                      <FiPhone className="w-4 h-4" />
                      {contactPhone}
                    </a>
                  </li>
                )}
                {contactAddress && (
                  <li className="flex items-start gap-2">
                    <FiMapPin className="w-4 h-4 text-primary mt-1 shrink-0 dark:text-primary-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {contactAddress}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Media */}
          {socialLinks && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider dark:text-white">
                Follow Us
              </h4>
              {renderSocialIcons()}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <div className="text-sm text-gray-500 text-center md:text-left dark:text-gray-400">
              © {new Date().getFullYear()}{" "}
              <Link
                href="/"
                className="text-gray-900 font-semibold hover:text-primary transition-colors dark:text-white dark:hover:text-primary-400"
              >
                {brandName}
              </Link>
              . All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
