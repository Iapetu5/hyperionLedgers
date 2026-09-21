"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Landmark,
  FileText,
  FileSignature,
  Receipt,
  Calculator,
  BarChart3,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Sparkles,
  Package,
} from "lucide-react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEMO_BANNER, DEMO_CTA, DEMO_ORG_SHORT } from "@/lib/brand";
import { nextSetupPath } from "@/lib/auth";
import { AiAssistant } from "@/components/demo/AiAssistant";
import { ExploreSampleButton } from "@/components/demo/ExploreSampleButton";
import { loadBills, loadInvoices, loadQuotes } from "@/lib/books-client";
import { booksLedgerBanner, usesServerBooksUi } from "@/lib/books-copy";
import { SIGNUP_FOR_TRIAL } from "@/lib/trial-next";
import { useBlankBooksReload } from "@/components/demo/useBlankBooksReload";

const NAV = [
  { href: "/demo", label: "Overview", icon: LayoutDashboard },
  { href: "/demo/banking", label: "Banking", icon: Landmark },
  { href: "/demo/invoices", label: "Invoices", icon: FileText },
  { href: "/demo/quotes", label: "Quotes", icon: FileSignature },
  { href: "/demo/bills", label: "Bills", icon: Receipt },
  { href: "/demo/products", label: "Products", icon: Package },
  { href: "/demo/tax/gst-bas", label: "GST & BAS", icon: Calculator },
  { href: "/demo/reports", label: "Reports", icon: BarChart3 },
  { href: "/demo/account", label: "Account", icon: Settings },
];

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logOut, needsOnboarding, usesSampleData, persistence } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState<string | undefined>();
  const [aiSeedKey, setAiSeedKey] = useState(0);
  const [hasUserDocs, setHasUserDocs] = useState(false);

  // Soft gate: only signed-in users with incomplete onboarding leave the demo.
  // Guests keep browsing the sample.
  useEffect(() => {
    if (loading) return;
    if (user && needsOnboarding) {
      router.replace(nextSetupPath(user));
    }
  }, [user, needsOnboarding, loading, router]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      setAiSeed(detail?.prompt);
      setAiSeedKey((k) => k + 1);
      setAiOpen(true);
    };
    window.addEventListener("hl-open-assistant", handler);
    return () => window.removeEventListener("hl-open-assistant", handler);
  }, []);

  const reloadDocs = useCallback(async () => {
    const [invoices, quotes, bills] = await Promise.all([loadInvoices(), loadQuotes(), loadBills()]);
    setHasUserDocs(invoices.length + quotes.length + bills.length > 0);
  }, []);

  useBlankBooksReload(reloadDocs);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sampleNav = !loading && usesSampleData;
  const orgName = sampleNav ? DEMO_ORG_SHORT : user?.businessName || "Your organisation";
  const demoBanner = sampleNav;

  const navLinks = (
    <>
      <div className="px-3 py-2">
        {sampleNav ? (
          <>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300/80">
                Demo
              </p>
              <span className="rounded-full border border-white/20 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white/70">
                Sample data
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-white/45">Harbour & Co Studio</p>
          </>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300/80">
            {orgName}
          </p>
        )}
      </div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/demo" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-500/20 text-brand-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={16} className={active ? "text-brand-300" : "text-slate-400"} />
            {label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen text-slate-100">
      <div className="page-hero no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-white/20 p-2 text-white lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <BrandLogo href="/" size={32} hideWordmarkOnMobile />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary !px-3"
              onClick={() => {
                setAiSeed(undefined);
                setAiOpen(true);
              }}
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
            {user ? (
              <>
                <span className="hidden text-sm text-white/80 sm:inline">{user.fullName}</span>
                <button
                  type="button"
                  className="btn-secondary !px-3"
                  onClick={() => {
                    void logOut().then(() => router.push("/"));
                  }}
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary !px-3">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {demoBanner && (
        <div data-demo-banner className="demo-banner no-print">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm sm:px-6">
            <p className="text-white/85">
              <strong className="text-white">{DEMO_BANNER}</strong>
              <span className="text-white/50"> — </span>
              No live bank feeds, payments, or ATO lodgement.
            </p>
            {!user && (
              <Link
                href="/signup"
                className="font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline"
              >
                Start free trial
              </Link>
            )}
          </div>
        </div>
      )}

      {!demoBanner && !loading && user && (
        <div data-demo-banner className="demo-banner no-print">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm sm:px-6">
            <p className="text-white/85">
              <strong className="text-white">
                {hasUserDocs ? "Your ledger" : "Blank ledger"}
              </strong>
              <span className="text-white/50"> — </span>
              {hasUserDocs
                ? booksLedgerBanner(usesServerBooksUi(persistence, user))
                : `${orgName} has no documents yet. Create an invoice, quote, or bill to get started.`}
            </p>
            {!user ? (
              <ExploreSampleButton
                primary={false}
                className="!px-3 !py-1.5 text-xs"
                label={DEMO_CTA}
              />
            ) : null}
          </div>
        </div>
      )}

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-white/10 bg-slate-950 p-3">
            {navLinks}
            <div className="mt-2 border-t border-white/10 pt-2">
              <Link href="/product" onClick={() => setMobileOpen(false)} className="flex items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                Product
              </Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="flex items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                Pricing
              </Link>
              <Link href="/try" onClick={() => setMobileOpen(false)} className="flex items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                How it works
              </Link>
              {!user ? (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    <LogIn size={16} className="mr-2" />
                    Log in
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    <UserPlus size={16} className="mr-2" />
                    Sign up
                  </Link>
                </>
              ) : null}
              <Link href={SIGNUP_FOR_TRIAL} onClick={() => setMobileOpen(false)} className="flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/5">
                Start free trial
              </Link>
            </div>
          </nav>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="no-print hidden w-56 shrink-0 lg:block">
          <nav className="card sticky top-4 space-y-1 border-white/10 bg-black/35 p-2 shadow-soft backdrop-blur-xl">
            {navLinks}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <AiAssistant
        open={aiOpen}
        onClose={() => {
          setAiOpen(false);
          setAiSeed(undefined);
        }}
        seedPrompt={aiSeed}
        seedKey={aiSeedKey}
        blankLedger={!loading && !usesSampleData}
        orgName={user?.businessName || orgName}
      />
    </div>
  );
}
