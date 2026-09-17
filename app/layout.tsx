import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "HyperionLedgers — Australian bookkeeping demo",
  description:
    "HyperionLedgers demo: invoicing, quotes, GST/BAS and cash insights for Australian small business. Sample data only.",
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
