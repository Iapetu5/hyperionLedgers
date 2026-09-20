"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

const LINKS = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/try", label: "How to try" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  variant = "marketing",
}: {
  variant?: "marketing" | "compact";
}) {
  const pathname = usePathname();
  return (
    <header className="page-hero no-print">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <BrandLogo />
        <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                    active
                      ? "font-semibold text-white underline decoration-brand-400 decoration-2 underline-offset-8"
                      : "hover:text-white"
                  }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {variant === "marketing" ? (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
                Log in
              </Link>
              <Link href="/signup" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
                Sign up
              </Link>
              <StartTrialButton className="btn-primary !px-3" showArrow={false} />
            </>
          ) : (
            <>
              <Link href="/signup" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
                Sign up
              </Link>
              <StartTrialButton className="btn-primary !px-3" showArrow={false} />
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-3 overflow-x-auto border-t border-white/10 px-4 py-2 text-xs text-white/70 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-white">
            {l.label}
          </Link>
        ))}
        <Link href="/signup" className="whitespace-nowrap font-semibold text-white hover:text-white">
          Sign up
        </Link>
      </nav>
    </header>
  );
}
