"use client";

import FooterBrand from "../../common/FooterBrand";
import FooterLinks from "../../common/FooterLinks";
import { footerContent } from "../../../../lib/store/footerContent";
import { useTranslation } from "@/lib/hook/useTranslation";

export default function FooterDesktop() {
  const t = useTranslation();

  const companyLinks = footerContent.links.company.map((link) => {
    const label = link.href === "/about" ? t.landing.footerAbout : link.href === "/contact-us" ? t.landing.footerContact : link.label;
    return { ...link, label };
  });

  const supportLinks = footerContent.links.support.map((link) => {
    const label = link.href === "/help-center" ? t.landing.footerHelpCenter : link.label;
    return { ...link, label };
  });

  return (
    <div className="hidden md:flex flex-col items-center w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full items-start justify-items-center">
        <FooterBrand brand={footerContent.brand} />
        <FooterLinks title={t.landing.footerCompany} links={companyLinks} />
        <FooterLinks title={t.landing.footerSupport} links={supportLinks} />
      </div>
    </div>
  );
}
