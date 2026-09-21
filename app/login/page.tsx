"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/components/auth/AuthProvider";
import { nextSetupPath, validateLogin } from "@/lib/auth";
import { beginHostedCheckout } from "@/lib/begin-checkout";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";
import { SIGNUP_FOR_TRIAL, wantsTrialCheckout } from "@/lib/trial-next";
import { markTrialIntent } from "@/lib/start-trial";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        {children ?? (
          <div className="card max-w-lg p-6">
            <p className="text-sm text-slate-300">Loading…</p>
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}

function LoginForm() {
  const { logIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialNext = wantsTrialCheckout(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local = validateLogin(email, password);
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setError(null);
      const first = (["email", "password"] as const).find((key) => local[key]);
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await logIn(email, password);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      document.getElementById("email")?.focus();
      return;
    }
    if (trialNext) {
      const dest = nextSetupPath(res.account);
      if (dest !== "/demo") {
        markTrialIntent();
        setBusy(false);
        router.push(dest);
        return;
      }
      const checkout = await beginHostedCheckout(email);
      if (checkout.kind === "stripe") return;
      setBusy(false);
      router.push(checkout.path);
      return;
    }
    setBusy(false);
    router.push(nextSetupPath(res.account));
  }

  return (
    <LoginShell>
      <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div>
          <p className="marketing-kicker">Australian bookkeeping · log in</p>
          <h1 className="marketing-title">Log in to HyperionInvoices</h1>
          <p className="marketing-lead">
            {trialNext
              ? "Use the email and password you created. Next you will start the 14-day trial on Stripe."
              : "Use the email and password you created. If you have not added a company or finished setup, HyperionInvoices will take you there first."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={trialNext ? SIGNUP_FOR_TRIAL : "/signup"} className="link-quiet">
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
          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                  if (error) setError(null);
                }}
              />
              {fieldErrors.email && (
                <p id="login-email-error" className="mt-1 text-sm text-rose-300" role="alert">
                  {fieldErrors.email}
                </p>
              )}
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
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                  if (error) setError(null);
                }}
              />
              {fieldErrors.password && (
                <p id="login-password-error" className="mt-1 text-sm text-rose-300" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
              {busy ? "Signing in…" : trialNext ? "Log in and start trial" : "Log in"}
            </button>
          </form>
          <p className="mt-4 text-center text-base text-slate-50">
            New here?{" "}
            <Link href={trialNext ? SIGNUP_FOR_TRIAL : "/signup"} className="link-quiet">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </LoginShell>
  );
}
