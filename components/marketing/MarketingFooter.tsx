"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";

export function MarketingFooter() {
  return (
    <footer className="no-print mt-4 border-t border-white/15">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <BrandLogo />
          <p className="mt-4 text-base leading-7 text-slate-50">
            HyperionInvoices keeps the books for a small Australian business. $69 a month after 14 days free.
            We do not send forms to the tax office.
          </p>
        </div>
        <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Explore</p>
            <div className="mt-3 flex flex-col gap-2.5 text-base text-slate-50">
              <Link href="/pricing" className="hover:text-white hover:underline">Pricing</Link>
              <Link href="/product" className="hover:text-white hover:underline">Product</Link>
              <Link href="/try" className="hover:text-white hover:underline">How it works</Link>
              <Link href="/downloads" className="hover:text-white hover:underline">Downloads</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Account</p>
            <div className="mt-3 flex flex-col gap-2.5 text-base text-slate-50">
              <Link href="/signup" className="hover:text-white hover:underline">Sign up</Link>
              <Link href="/about" className="hover:text-white hover:underline">About</Link>
              <Link href="/contact" className="hover:text-white hover:underline">Contact</Link>
              <TryDemoLink className="hover:text-white hover:underline" />
            </div>
          </div>
        </nav>
      </div>
    </footer>
  );
}
