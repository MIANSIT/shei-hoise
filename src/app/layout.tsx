import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "./components/ui/sheiSonner/sonner"; // Import your custom Toaster
import { CartProvider } from "@/lib/context/CartContext";
import MotionProvider from "./components/motion/MotionProvider";
import { AntdRegistry } from "@ant-design/nextjs-registry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shei Hoise",
  description: "Shei Hoise is an e-commerce powered by MIANS",
  verification: {
    google: "696SaU0FXmEwqbLTAV6wbTuBrFDJc0dfnJrjF3Hi9Kg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<html lang='en' suppressHydrationWarning>
  <head>
    <Script
      src='https://www.googletagmanager.com/gtag/js?id=GT-TXB8WH4D'
      strategy='afterInteractive'
    />
    <Script id='google-analytics' strategy='afterInteractive'>
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          window.dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', 'GT-TXB8WH4D');
      `}
    </Script>
  </head>
  <body
    suppressHydrationWarning
    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
  >
          <AntdRegistry>
          <MotionProvider>
            <CartProvider>
              {children}
              <Toaster position='top-right' />
            </CartProvider>
          </MotionProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
