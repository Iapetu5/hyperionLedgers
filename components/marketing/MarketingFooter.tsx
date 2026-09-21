"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { GoToAppLink, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";

const EXPLORE = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/downloads", label: "Downloads" },
  { href: "/try", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MarketingFooter() {
  return (
    <footer className="no-print mt-4 border-t border-white/15">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <BrandLogo />
          <p className="mt-4 text-base leading-7 text-slate-50">
            HyperionInvoices keeps the books for a small Australian business. $69 a month after 14 days free.
            {` ${MARKETING_LIMITS}`}
          </p>
        </div>
        <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Explore</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {EXPLORE.map((item) => (
                <Link key={item.href} href={item.href} className="link-quiet w-fit">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Account</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/signup" className="link-quiet w-fit">
                Sign up
              </Link>
              <Link href="/login" className="link-quiet w-fit">
                Log in
              </Link>
              <TryDemoLink className="link-quiet w-fit" />
              <GoToAppLink className="link-quiet w-fit" />
            </div>
          </div>
        </nav>
      </div>
    </footer>
  );
}
