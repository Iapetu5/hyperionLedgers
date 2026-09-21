"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateSignup } from "@/lib/auth";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { addCompanyHref, SETUP_STEP } from "@/lib/company-pickup";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
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
    try {
      const checkout = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await checkout.json()) as { configured?: boolean; url?: string };
      if (data.configured && data.url) {
        window.location.assign(data.url);
        return;
      }
    } catch {
      // Local sign-up already succeeded — continue without Stripe.
    }
    setBusy(false);
    router.push(addCompanyHref("/onboarding"));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          <Link href="/login" className="hover:text-white hover:underline">
            Log in
          </Link>
        </nav>
      </div>
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">{SETUP_STEP.account}</p>
        <h1 className="mt-1 text-xl font-bold text-white">Start your free trial</h1>
        <p className="mt-1 text-sm text-slate-300">
          Name, email, and password only. Next you add your company on the HyperionInvoices Add company
          page. You get 14 days free. Then $69 a month.
          <GuestOnly>
            {" "}
            <TryDemoLink className="font-semibold text-brand-300 hover:underline">
              Want to try a demo first?
            </TryDemoLink>
            .
          </GuestOnly>
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" required autoComplete="name" placeholder="Alex Nguyen" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            {fieldErrors.fullName && <p className="mt-1 text-xs text-rose-300">{fieldErrors.fullName}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required autoComplete="email" placeholder="you@business.com.au" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldErrors.email && <p className="mt-1 text-xs text-rose-300">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
            {fieldErrors.password && <p className="mt-1 text-xs text-rose-300">{fieldErrors.password}</p>}
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating…" : "Continue"}
          </button>
          <p className="text-center text-xs text-slate-400">Then add your company. Then $69 a month.</p>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-300 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
