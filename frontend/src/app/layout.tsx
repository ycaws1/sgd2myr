import type { Metadata, Viewport } from "next";
import { StandaloneInputFix } from "@/components/StandaloneInputFix";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGD to MYR Tracker",
  description: "Track SGD to MYR exchange rates from multiple sources",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Note: Removed maximumScale: 1 as it causes input fields to be unresponsive
  // in iOS PWA standalone mode (Add to Home Screen)
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-bg text-white min-h-screen">
        <StandaloneInputFix />
        {children}
      </body>
    </html>
  );
}
