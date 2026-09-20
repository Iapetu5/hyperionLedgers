import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "HyperionLedgers — Australian bookkeeping",
  description:
    "Australian bookkeeping: invoices, GST/BAS and cash in plain English. $69 a month after a 14-day free trial. No ATO lodgement.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.hyperioninvoices.com.au"
  ),
  icons: {
    icon: "/black-hole-logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="nebula-surface antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
