"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface FacebookPixelScriptProps {
  pixelId: string;
}

// Fires PageView on every client-side navigation automatically
export function FacebookPixelScript({ pixelId }: FacebookPixelScriptProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname]);

  // Pixel IDs are numeric — strip anything non-numeric as a safety measure
  const safePixelId = pixelId.replace(/\D/g, "");
  if (!safePixelId) return null;

  return (
    <Script
      id={`fb-pixel-${safePixelId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${safePixelId}');
          fbq('track','PageView');
        `,
      }}
    />
  );
}
