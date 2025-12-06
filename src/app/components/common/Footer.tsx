"use client";

import FooterMobile from "../layout/footer/FooterMobile";
import FooterDesktop from "../layout/footer/FooterDesktop";
import { footerContent } from "../../../lib/store/footerContent";
import FooterBottom from "./FooterBottom";

export default function Footer() {
  return (
    <footer className="bg-background text-muted-foreground  w-full mt-auto border-t border-border">
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
        isStore={false}
      />
    </footer>
  );
}
