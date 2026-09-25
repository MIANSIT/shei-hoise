"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/hook/useTranslation";
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
  /** When set, social links are refetched live in the browser instead of trusting cached props. */
  storeId?: string;
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
        className="text-primary underline hover:opacity-80 transition-opacity"
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
  socialLinks: initialSocialLinks,
  storeId,
  bottomLinks,
  //   newsletterCTA,
}: StoreFooterProps) {
  const t = useTranslation();

  // The storefront layout is cached, so the server-rendered links can be stale.
  // Refetch them live in the browser; the cached props are just the first paint.
  const [liveLinks, setLiveLinks] = useState<StoreFooterProps["socialLinks"]>();
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    supabase
      .from("store_social_media")
      .select("facebook_link, instagram_link, twitter_link, youtube_link")
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setLiveLinks({
          facebook: data?.facebook_link?.trim() || undefined,
          instagram: data?.instagram_link?.trim() || undefined,
          twitter: data?.twitter_link?.trim() || undefined,
          youtube: data?.youtube_link?.trim() || undefined,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const socialLinks = liveLinks ?? initialSocialLinks;
  const hasSocialLinks = !!socialLinks && Object.values(socialLinks).some(Boolean);
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
            <FaLinkedinIn className="text-footer-foreground/70 group-hover:text-[#0077B5] dark:group-hover:text-[#0077B5]" />
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
            <FaTiktok className="text-primary group-hover:text-[#000000] dark:group-hover:text-[#000000]" />
          </span>
        </Link>
      )}
    </div>
  );

  return (
    <footer className="bg-footer text-footer-foreground border-t border-footer-foreground/10">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Desktop Layout - Cleaner 4-column layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-10">
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-sm">
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
                  <span className="text-foreground font-bold text-lg">
                    {storeName?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              <div>
                {storeName && (
                  <Link
                    href={`/${storeSlug}`}
                    className="text-xl font-bold text-footer-foreground hover:text-primary transition-colors"
                  >
                    {storeName}
                  </Link>
                )}
              </div>
            </div>

            {storeDescription && (
              <p className="text-footer-foreground/70 leading-relaxed text-sm">
                {linkify(storeDescription)}
              </p>
            )}
            {hasSocialLinks && (
              <div className="pt-4">
                <p className="text-sm font-semibold text-footer-foreground mb-3">
                  {t.nav.footerConnect}
                </p>
                {renderSocialIcons()}
              </div>
            )}
          </div>

          {/* Column 2: Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider mb-4">
              {t.nav.footerCompany}
            </h4>
            <ul className="space-y-3">
              {aboutLink && (
                <li>
                  <Link
                    href={aboutLink}
                    className="text-footer-foreground/70 hover:text-primary hover:translate-x-1 transition-all duration-300 inline-block py-1"
                  >
                    {t.nav.footerAbout}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider mb-4">
              {t.nav.footerContact}
            </h4>
            <ul className="space-y-4">
              {contactEmail && (
                <li className="flex items-start gap-3">
                  <FiMail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-footer-foreground/70 hover:text-primary transition-colors"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-3">
                  <FiPhone className="w-5 h-5 text-primary shrink-0" />
                  <a
                    href={`tel:${contactPhone}`}
                    className="text-footer-foreground/70 hover:text-primary transition-colors"
                  >
                    {contactPhone}
                  </a>
                </li>
              )}
              {contactAddress && (
                <li className="flex items-start gap-3">
                  <FiMapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-footer-foreground/70">
                    {contactAddress}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider mb-4">
              {t.nav.footerLegal}
            </h4>
            <ul className="space-y-3">
              {bottomLinks.map((link) => {
                const label = link.href.includes("privacy")
                  ? t.nav.footerPrivacy
                  : link.href.includes("terms")
                    ? t.nav.footerTerms
                    : link.label;
                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-footer-foreground/70 hover:text-primary hover:translate-x-1 transition-all duration-300 inline-block py-1"
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-10">
          {/* Brand & Description */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {storeLogo && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shadow-sm">
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
                    className="text-xl font-bold text-footer-foreground hover:text-primary transition-colors"
                  >
                    {storeName}
                  </Link>
                )}
              </div>
            </div>

            {storeDescription && (
              <p className="text-footer-foreground/70 leading-relaxed text-sm">
                {linkify(storeDescription)}
              </p>
            )}
          </div>

          {/* Links Grid - 2 columns for mobile */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider">
                {t.nav.footerCompany}
              </h4>
              <ul className="space-y-3">
                {aboutLink && (
                  <li>
                    <Link
                      href={aboutLink}
                      className="text-sm text-footer-foreground/70 hover:text-primary transition-colors"
                    >
                      {t.nav.footerAbout}
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider">
                {t.nav.footerLegal}
              </h4>
              <ul className="space-y-3">
                {bottomLinks.slice(0, 3).map((link) => {
                  const label = link.href.includes("privacy")
                    ? t.nav.footerPrivacy
                    : link.href.includes("terms")
                      ? t.nav.footerTerms
                      : link.label;
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-footer-foreground/70 hover:text-primary transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Contact Section */}
          {(contactEmail || contactPhone || contactAddress) && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider">
                {t.nav.footerContact}
              </h4>
              <ul className="space-y-3">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-sm text-footer-foreground/70 hover:text-primary transition-colors flex items-center gap-2"
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
                      className="text-sm text-footer-foreground/70 hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <FiPhone className="w-4 h-4" />
                      {contactPhone}
                    </a>
                  </li>
                )}
                {contactAddress && (
                  <li className="flex items-start gap-2">
                    <FiMapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm text-footer-foreground/70">
                      {contactAddress}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Media */}
          {hasSocialLinks && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-footer-foreground uppercase tracking-wider">
                {t.nav.footerFollow}
              </h4>
              {renderSocialIcons()}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-footer-foreground/10">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <div className="text-sm text-footer-foreground/70 text-center md:text-left">
              © {new Date().getFullYear()}{" "}
              <Link
                href="/"
                className="text-footer-foreground font-semibold hover:text-primary transition-colors"
              >
                {brandName}
              </Link>
              . {t.nav.footerRights}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
