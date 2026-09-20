"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateSignup } from "@/lib/auth";
import { AbnField } from "@/components/abn/AbnField";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [abn, setAbn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local = validateSignup({ fullName, email, password, businessName, abn });
    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signUp({ fullName, email, password, businessName, abn });
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
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Step 1 of 2 · Account</p>
        <h1 className="mt-1 text-xl font-bold text-white">Start your free trial</h1>
        <p className="mt-1 text-sm text-slate-300">
          14 days of full HyperionLedgers for your organisation — then $69 a month. When Postgres is attached on Vercel, this account is stored on the server and works on phone and desktop. Next: a short setup, then your first invoice, quote, or bill. Prefer to look first?{" "}
          <Link href="/demo" className="font-semibold text-brand-300 hover:underline">
            Browse the sample
          </Link>
          {" "}— no account needed.
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
            <p className="mt-1 text-xs text-slate-400">At least 8 characters. Stored only in this browser.</p>
            {fieldErrors.password && <p className="mt-1 text-xs text-rose-300">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="label" htmlFor="businessName">Business name</label>
            <input id="businessName" className="input" required autoComplete="organization" placeholder="Harbour Cafe Pty Ltd" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            {fieldErrors.businessName && <p className="mt-1 text-xs text-rose-300">{fieldErrors.businessName}</p>}
          </div>
          <AbnField value={abn} onChange={setAbn} />
          {fieldErrors.abn && <p className="text-xs text-rose-300">{fieldErrors.abn}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating…" : "Continue to setup"}
          </button>
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
