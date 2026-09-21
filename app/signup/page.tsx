"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { addCompanyHref, SETUP_STEP } from "@/lib/company-pickup";
import { validateSignup } from "@/lib/auth";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { LOGIN_FOR_TRIAL, wantsTrialCheckout } from "@/lib/trial-next";
import { markTrialIntent } from "@/lib/start-trial";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupShell />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupShell({
  children,
  loginHref = "/login",
}: {
  children?: React.ReactNode;
  loginHref?: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          <Link href={loginHref} className="hover:text-white hover:underline">
            Log in
          </Link>
        </nav>
      </div>
      {children ?? (
        <div className="card p-6">
          <p className="text-sm text-slate-300">Loading…</p>
        </div>
      )}
    </div>
  );
}

function SignupForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialNext = wantsTrialCheckout(searchParams.get("next"));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local = validateSignup({ fullName, email, password });
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setError(null);
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
    markTrialIntent();
    setBusy(false);
    router.push(addCompanyHref("/onboarding"));
  }

  return (
    <SignupShell loginHref={trialNext ? LOGIN_FOR_TRIAL : "/login"}>
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">{SETUP_STEP.account}</p>
        <h1 className="mt-1 text-xl font-bold text-white">Create your account</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your name, email, and password. Next you will add your company.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className="input"
              required
              autoComplete="name"
              placeholder="Alex Nguyen"
              value={fullName}
              aria-invalid={Boolean(fieldErrors.fullName)}
              onChange={(e) => setFullName(e.target.value)}
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-sm text-rose-300" role="alert">
                {fieldErrors.fullName}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              autoComplete="email"
              placeholder="you@business.com.au"
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-rose-300" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              aria-invalid={Boolean(fieldErrors.password)}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">Use at least 8 characters.</p>
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-rose-300" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy
              ? trialNext
                ? "Creating account…"
                : "Creating…"
              : trialNext
                ? "Create account and start trial"
                : "Next: add your company"}
          </button>
          <p className="text-center text-xs text-slate-400">
            14-day trial on{" "}
            <Link href="/pricing" className="text-brand-300 hover:underline">
              Pricing
            </Link>
            , then $69 AUD a month.
          </p>
          <GuestOnly>
            <p className="text-center text-xs text-slate-400">
              Prefer to look first?{" "}
              <TryDemoLink className="font-semibold text-brand-300 hover:underline">
                Look at the sample
              </TryDemoLink>
              .
            </p>
          </GuestOnly>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link
            href={trialNext ? LOGIN_FOR_TRIAL : "/login"}
            className="font-semibold text-brand-300 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </SignupShell>
  );
}
