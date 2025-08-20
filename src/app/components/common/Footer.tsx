"use client";

import FooterMobile from "../layout/footer/FooterMobile";
import FooterDesktop from "../layout/footer/FooterDesktop";
import FooterBottom from "../footer/FooterBottom";
import { footerContent } from "../../../lib/store/footerContent";

export default function Footer() {
  return (
    <footer className="bg-black text-gray-300 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="block md:hidden">
          <FooterMobile />
        </div>
        <div className="hidden md:block">
          <FooterDesktop />
        </div>
      </div>
      <FooterBottom
        links={footerContent.bottomLinks}
        brandName={footerContent.brand.name}
      />
    </footer>
  );
}
