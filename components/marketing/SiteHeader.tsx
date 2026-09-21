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
  { href: "/downloads", label: "Downloads" },
  { href: "/try", label: "How it works" },
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <BrandLogo hideWordmarkOnMobile />
        <nav className="hidden items-center gap-5 text-base text-slate-100 md:flex">
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
          <Link href="/login" className="link-quiet hidden sm:inline">
            Log in
          </Link>
          <Link href="/signup" className="link-quiet hidden sm:inline">
            Sign up
          </Link>
          <StartTrialButton className="btn-marketing-primary" showArrow={false} />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 p-2 text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-3 md:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-base text-white hover:bg-white/10"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="rounded-lg px-3 py-2 text-base text-white hover:bg-white/10">
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/10">
              Sign up
            </Link>
            {variant === "marketing" ? (
              <Link href="/demo" className="rounded-lg px-3 py-2 text-base text-slate-100 hover:bg-white/10 hover:text-white">
                Open Harbour &amp; Co
              </Link>
            ) : null}
            <div className="px-3 pt-2">
              <StartTrialButton className="btn-marketing-primary w-full" />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
