"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="page-hero no-print">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
          <Link href="/login" className="hidden min-h-11 items-center text-sm font-medium text-white/80 hover:text-white sm:inline-flex">
            Log in
          </Link>
          <Link href="/signup" className="hidden min-h-11 items-center text-sm font-medium text-white/80 hover:text-white sm:inline-flex">
            Sign up
          </Link>
          <StartTrialButton className="btn-primary !px-3" showArrow={false} />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/20 text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex min-h-11 items-center rounded-lg px-3 text-base text-white/85 hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="flex min-h-11 items-center rounded-lg px-3 text-base text-white/85 hover:bg-white/10 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex min-h-11 items-center rounded-lg px-3 text-base font-semibold text-white hover:bg-white/10"
            >
              Sign up
            </Link>
            {variant === "marketing" ? (
              <Link
                href="/demo"
                className="flex min-h-11 items-center rounded-lg px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                Sample data
              </Link>
            ) : null}
            <div className="pt-2">
              <StartTrialButton className="btn-primary w-full" />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
