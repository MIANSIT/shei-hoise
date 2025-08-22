"use client";

import FooterBrand from "../../common/FooterBrand";
import FooterLinks from "../../common/FooterLinks";
import { footerContent } from "../../../../lib/store/footerContent";

export default function FooterDesktop() {
  return (
    <div className="hidden md:grid grid-cols-4 gap-8">
      <FooterBrand brand={footerContent.brand} />
      <FooterLinks title="Shop" links={footerContent.links.shop} />
      <FooterLinks title="Company" links={footerContent.links.company} />
      <FooterLinks title="Support" links={footerContent.links.support} />
    </div>
  );
}
