import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";

import RouteToastListener from "@/components/layout/RouteToastListener";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ServicePro",
  title: {
    default: "ServicePRO",
    template: "%s | ServicePRO",
  },
  description:
    "Marlin Yachting icin operasyon, servis ve personel performans yonetim sistemi.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ServicePRO",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      {
        url: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e3152",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Suspense fallback={null}>
          <RouteToastListener />
        </Suspense>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
