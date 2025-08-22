"use client";

import FooterBrand from "../../common/FooterBrand";
import FooterLinks from "../../common/FooterLinks";
import { footerContent } from "../../../../lib/store/footerContent";


export default function FooterMobile() {
  return (
    <div className="grid grid-cols-1 gap-8 md:hidden">
      <FooterBrand brand={footerContent.brand} />
      <FooterLinks title="Shop" links={footerContent.links.shop} />
      <FooterLinks title="Company" links={footerContent.links.company} />
      <FooterLinks title="Support" links={footerContent.links.support} />
    </div>
  );
}
