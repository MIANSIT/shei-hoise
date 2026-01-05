"use client";

import FooterBrand from "../../common/FooterBrand";
import FooterLinks from "../../common/FooterLinks";
import { footerContent } from "../../../../lib/store/footerContent";

export default function FooterDesktop() {
  return (
    <div  className="hidden md:flex flex-col items-center  w-full">
      {/* Main content grid - centered */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full items-start justify-items-center">
        <FooterBrand brand={footerContent.brand} />
        <FooterLinks title="Company" links={footerContent.links.company} />
        <FooterLinks title="Support" links={footerContent.links.support} />
      </div>
    </div>
  );
}
