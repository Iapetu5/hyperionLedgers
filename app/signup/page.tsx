"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateSignup } from "@/lib/auth";
import { EasyStepBar } from "@/components/easy/EasyStepBar";
import { PLAN } from "@/lib/billing";

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
    // Company name and ABN are collected on Add company during onboarding.
    const local = validateSignup({
      fullName,
      email,
      password,
      businessName: "Your organisation",
    });
    delete local.businessName;
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signUp({
      fullName,
      email,
      password,
      businessName: "Your organisation",
    });
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
    router.push("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <BrandLogo className="mb-8 justify-center" />
      <div className="card easy-form p-6">
        <EasyStepBar current={1} total={2} label="Your details" />
        <h1 className="mt-4 text-xl font-bold text-white">Create your HyperionInvoices account</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Enter your name, email, and password. Next we will add your company.
        </p>
        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" required autoComplete="name" placeholder="Alex Nguyen" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            {fieldErrors.fullName && <p className="mt-1 text-sm text-rose-300">{fieldErrors.fullName}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required autoComplete="email" placeholder="you@business.com.au" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldErrors.email && <p className="mt-1 text-sm text-rose-300">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-sm text-slate-400">At least 8 characters. Stored only in this browser.</p>
            {fieldErrors.password && <p className="mt-1 text-sm text-rose-300">{fieldErrors.password}</p>}
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating…" : "Next: set up your business"}
          </button>
          <p className="text-center text-sm text-slate-400">
            {PLAN.trialDays} days free. Then ${PLAN.amountAud} {PLAN.intervalLabel}. Cancel anytime.
          </p>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-300 hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-400">
          Prefer to look first?{" "}
          <Link href="/demo" className="font-semibold text-brand-300 hover:underline">
            Browse the sample
          </Link>
          {" "}— no account needed.
        </p>
      </div>
    </div>
  );
}
