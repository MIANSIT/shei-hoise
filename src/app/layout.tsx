
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "./components/ui/sheiSonner/sonner"; // your custom Toaster
import { CartProvider } from "@/lib/context/CartContext";

// 🧩 Import Ant Design providers
import { App as AntdApp, ConfigProvider } from "antd";
import "antd/dist/reset.css"; // optional but recommended to avoid style conflicts

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#1677ff", // optional, customize if you want
            },
          }}
        >
          {/* ✅ Ant Design context provider */}
          <AntdApp>
            <CartProvider>
              {children}
              <Toaster position="top-right" />
            </CartProvider>
          </AntdApp>
        </ConfigProvider>
      </body>
    </html>
  );
}
