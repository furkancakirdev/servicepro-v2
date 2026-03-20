import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";

import RouteToastListener from "@/components/layout/RouteToastListener";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ServicePRO",
    template: "%s | ServicePRO",
  },
  description:
    "Marlin Yachting icin operasyon, servis ve personel performans yonetim sistemi.",
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
