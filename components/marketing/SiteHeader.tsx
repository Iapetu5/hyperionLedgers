"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
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

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="marketing-header no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-4 2xl:flex">
              <TryDemoLink className="link-quiet marketing-tap-link whitespace-nowrap" />
              <GoToAppLink className="link-quiet marketing-tap-link whitespace-nowrap" />
              <Link href="/login" className="link-quiet marketing-tap-link whitespace-nowrap">
                Log in
              </Link>
              <Link href="/signup" className="link-quiet marketing-tap-link whitespace-nowrap">
                Sign up
              </Link>
            </div>
            <StartTrialButton
              className="btn-marketing-primary shrink-0 whitespace-nowrap px-3.5 py-2 text-sm sm:px-5 sm:py-3 sm:text-base"
              showArrow={false}
            />
            <button
              type="button"
              className="marketing-icon-button 2xl:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id={menuId}
            className="border-t border-white/10 bg-slate-950/95 2xl:hidden"
          >
            <nav
              aria-label="Mobile"
              className="mx-auto flex max-h-[min(36rem,calc(100dvh-4.5rem))] max-w-6xl flex-col gap-0.5 overflow-y-auto px-4 py-3 sm:px-6"
            >
              {LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={
                      active
                        ? "marketing-nav-link font-semibold text-white"
                        : "marketing-nav-link"
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
              <Link href="/login" className="marketing-nav-link">
                Log in
              </Link>
              <Link href="/signup" className="marketing-nav-link font-semibold">
                Sign up
              </Link>
              <TryDemoLink className="marketing-nav-link" />
              <GoToAppLink className="marketing-nav-link" />
              <div className="px-3 pt-3">
                <StartTrialButton className="btn-marketing-primary w-full" />
              </div>
            </nav>
          </div>
        ) : null}
      </header>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 2xl:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
