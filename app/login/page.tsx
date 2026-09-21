"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/components/auth/AuthProvider";
import { nextSetupPath } from "@/lib/auth";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";

export default function LoginPage() {
  const { logIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await logIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(nextSetupPath(res.account));
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <p className="marketing-kicker">Australian bookkeeping · log in</p>
            <h1 className="marketing-title">Log in to HyperionInvoices</h1>
            <p className="marketing-lead">
              Use the email and password you created. If you have not added a company or finished
              setup, HyperionInvoices will take you there first.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/signup" className="link-quiet">
                Sign up
              </Link>
              <Link href="/pricing" className="link-quiet">
                Pricing
              </Link>
              <TryDemoLink className="link-quiet" />
            </div>
            <GuestOnly>
              <p className="mt-10 marketing-copy">
                Prefer to look first? See pricing, or try a demo with sample data — not your real
                account.
              </p>
            </GuestOnly>
            <p className="mt-10 marketing-copy">{MARKETING_LIMITS}</p>
            <p className="mt-3 marketing-copy">Your session stays in this browser.</p>
          </div>

          <div className="card h-fit p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Your account</p>
            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-rose-300" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Signing in…" : "Log in"}
              </button>
            </form>
            <p className="mt-4 text-center text-base text-slate-50">
              New here?{" "}
              <Link href="/signup" className="link-quiet">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
