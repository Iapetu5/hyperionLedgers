"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { GoToAppLink, TryDemoLink } from "@/components/marketing/TryDemoCta";

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <BrandLogo hideWordmarkOnMobile />
        <nav aria-label="Main" className="hidden items-center gap-5 text-base text-slate-50 xl:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "shrink-0 whitespace-nowrap font-semibold text-white underline decoration-brand-300 decoration-2 underline-offset-8"
                    : "shrink-0 whitespace-nowrap hover:text-white hover:underline hover:decoration-white/50 hover:underline-offset-8"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 2xl:flex">
            <TryDemoLink className="link-quiet whitespace-nowrap" />
            <GoToAppLink className="link-quiet whitespace-nowrap" />
            <Link href="/login" className="link-quiet whitespace-nowrap">
              Log in
            </Link>
            <Link href="/signup" className="link-quiet whitespace-nowrap">
              Sign up
            </Link>
          </div>
          <StartTrialButton className="btn-marketing-primary shrink-0 whitespace-nowrap" showArrow={false} />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-white/25 p-2.5 text-white 2xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 2xl:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2.5 text-base text-white hover:bg-white/10"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="rounded-lg px-3 py-2.5 text-base text-white hover:bg-white/10">
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg px-3 py-2.5 text-base font-semibold text-white hover:bg-white/10">
              Sign up
            </Link>
            <TryDemoLink className="rounded-lg px-3 py-2.5 text-base text-slate-50 hover:bg-white/10 hover:text-white" />
            <GoToAppLink className="rounded-lg px-3 py-2.5 text-base text-slate-50 hover:bg-white/10 hover:text-white">
              {variant === "compact" ? "Open your ledger" : "Go to app"}
            </GoToAppLink>
            <div className="px-3 pt-3">
              <StartTrialButton className="btn-marketing-primary w-full" />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
