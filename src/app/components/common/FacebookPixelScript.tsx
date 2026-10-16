"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/utils/fbPixel";

interface FacebookPixelScriptProps {
  pixelId: string;
  storeSlug: string;
}

// Fires PageView on every page load and client-side navigation. The inline
// snippet below only loads and initialises the pixel — PageView itself goes
// through trackPageView so the browser and server copies share one event id.
export function FacebookPixelScript({ pixelId, storeSlug }: FacebookPixelScriptProps) {
  const pathname = usePathname();

  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const urlSearch = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const utm: Record<string, string> = {};
    if (urlSearch) {
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      utmKeys.forEach((k) => {
        const v = urlSearch.get(k);
        if (v) utm[k] = v;
      });
      // Also capture fbclid so we can identify Facebook ad traffic even without UTM params
      const fbclid = urlSearch.get("fbclid");
      if (fbclid) utm.fbclid = fbclid;

      try {
        if (Object.keys(utm).length > 0) {
          localStorage.setItem("sh_utm", JSON.stringify(utm));
        }
      } catch {
        // ignore
      }
    }

    // Same path twice in a row (React strict-mode re-run) is one page view.
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    trackPageView(storeSlug, { path: pathname, ...utm });
  }, [pathname, storeSlug]);

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
        `,
      }}
    />
  );
}
