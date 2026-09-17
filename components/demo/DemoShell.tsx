"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { DEMO_ORG } from "@/lib/sample-data";
import { AiAssistant } from "@/components/demo/AiAssistant";
import { ExploreSampleButton } from "@/components/demo/ExploreSampleButton";

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
  const { user, loading, logOut, needsOnboarding, usesSampleData } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState<string | undefined>();
  const [aiSeedKey, setAiSeedKey] = useState(0);

  // Soft gate: only signed-in users with incomplete onboarding leave the demo.
  // Guests keep browsing Harbour & Co.
  useEffect(() => {
    if (loading) return;
    if (user && needsOnboarding) {
      router.replace("/onboarding");
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

  const orgName = user?.businessName || DEMO_ORG.name;
  const demoBanner = usesSampleData;

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
            <BrandLogo href="/" size={32} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAiSeed(undefined);
                setAiOpen(true);
              }}
            >
              <Sparkles size={16} />
              Ask AI
            </button>
            {user ? (
              <>
                <span className="hidden text-sm text-white/80 sm:inline">{user.fullName}</span>
                <button
                  type="button"
                  className="btn-secondary !px-3"
                  onClick={() => {
                    logOut();
                    router.push("/");
                  }}
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary !px-3">
                  <LogIn size={16} />
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary !px-3">
                  <UserPlus size={16} />
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
              <strong className="text-white">Demo organisation</strong>
              <span className="text-white/50"> — </span>
              viewing {orgName} sample data. No live bank feeds, payments, or ATO lodgement.
            </p>
            {!user && (
              <Link
                href="/signup"
                className="font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline"
              >
                Create your own org
              </Link>
            )}
          </div>
        </div>
      )}

      {!demoBanner && user && (
        <div data-demo-banner className="demo-banner no-print border-amber-400/25 bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-transparent">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm sm:px-6">
            <p className="text-white/85">
              <strong className="text-white">Blank ledger</strong>
              <span className="text-white/50"> — </span>
              {orgName} has no sample activity yet. Browse Harbour &amp; Co as a guest anytime.
            </p>
            <ExploreSampleButton
              primary={false}
              className="!px-3 !py-1.5 text-xs"
              label="Open Harbour & Co sample"
            />
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside
          className={`no-print ${mobileOpen ? "block" : "hidden"} w-full shrink-0 lg:block lg:w-56`}
        >
          <nav className="card sticky top-4 space-y-1 border-white/10 bg-black/35 p-2 shadow-soft backdrop-blur-xl">
            <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-300/80">
              {orgName}
            </p>
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
        blankLedger={!usesSampleData}
        orgName={user?.businessName || orgName}
      />
    </div>
  );
}
