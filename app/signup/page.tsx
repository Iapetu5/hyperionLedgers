"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateSignup } from "@/lib/auth";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { addCompanyHref, SETUP_STEP } from "@/lib/company-pickup";
import { MARKETING_LIMITS } from "@/lib/brand";

const NEXT_STEPS = [
  "Name, email, and password only on this page",
  "Next you add your company — that does not register you with the tax office",
  "The plan is 14 days free, then $69 a month. You can stop anytime",
];

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
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
    const local = validateSignup({ fullName, email, password });
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setError(null);
      const first = (["fullName", "email", "password"] as const).find((key) => local[key]);
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signUp({ fullName, email, password });
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    // Books setup first — Stripe trial checkout stays on Pricing / Downloads.
    router.push(addCompanyHref("/onboarding"));
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <p className="marketing-kicker">Australian bookkeeping · your account</p>
            <h1 className="marketing-title">Create your account</h1>
            <p className="marketing-lead">
              Enter your name, email, and password. Next you will add your company.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/login" className="link-quiet">
                Log in
              </Link>
              <Link href="/pricing" className="link-quiet">
                Pricing
              </Link>
              <TryDemoLink className="link-quiet" />
            </div>
            <aside className="card mt-10 h-fit p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">What happens next</p>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-50">
                {NEXT_STEPS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-brand-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <GuestOnly>
                <p className="mt-6 marketing-copy">
                  Prefer to look first?{" "}
                  <TryDemoLink className="link-quiet" />
                  {" "}
                  with sample data, not your real account.
                </p>
              </GuestOnly>
              <Link href="/pricing" className="link-quiet mt-4 block">
                See the $69 plan
              </Link>
            </aside>
            <p className="mt-10 marketing-copy">{MARKETING_LIMITS}</p>
          </div>

          <form className="card h-fit space-y-4 p-6 sm:p-8" onSubmit={onSubmit} noValidate>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              {SETUP_STEP.account}
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                className="input"
                required
                autoComplete="name"
                placeholder="Alex Nguyen"
                value={fullName}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError("fullName");
                }}
              />
              {fieldErrors.fullName && (
                <p id="fullName-error" className="mt-1 text-sm text-rose-300" role="alert">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                required
                autoComplete="email"
                placeholder="you@business.com.au"
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                  if (error) setError(null);
                }}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-rose-300" role="alert">
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
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "password-error" : "password-hint"
                }
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
              />
              {!fieldErrors.password && (
                <p id="password-hint" className="mt-1 text-sm leading-7 text-slate-200">
                  Use at least 8 characters.
                </p>
              )}
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-rose-300" role="alert">
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
              {busy ? "Creating…" : "Next: add your company"}
            </button>
            <p className="text-center text-sm leading-7 text-slate-200">
              14-day trial, then $69 a month.
            </p>
            <p className="text-center text-base text-slate-50">
              Already have an account?{" "}
              <Link href="/login" className="link-quiet">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
