"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { nextSetupPath } from "@/lib/auth";
import { beginHostedCheckout } from "@/lib/begin-checkout";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { SIGNUP_FOR_TRIAL, wantsTrialCheckout } from "@/lib/trial-next";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <BrandLogo className="mb-8 justify-center" />
      {children ?? (
        <div className="card p-6">
          <p className="text-sm text-slate-300">Loading…</p>
        </div>
      )}
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
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await logIn(email, password);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    if (trialNext) {
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
      <div className="card p-6">
        <h1 className="text-xl font-bold text-white">Log in</h1>
        <p className="mt-2 text-sm text-slate-300">
          {trialNext
            ? "Use the email and password you created. Next you will start the 14-day trial on Stripe."
            : "Use the email and password you created. If you have not added a company or finished setup, HyperionInvoices will take you there first."}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Prefer to look first?{" "}
          <Link href="/pricing" className="font-semibold text-brand-300 hover:underline">
            See pricing
          </Link>
          <GuestOnly>
            {" "}or{" "}
            <TryDemoLink className="font-semibold text-brand-300 hover:underline" />
          </GuestOnly>
          .
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : trialNext ? "Log in and start trial" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          New here?{" "}
          <Link
            href={trialNext ? SIGNUP_FOR_TRIAL : "/signup"}
            className="font-semibold text-brand-300 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </LoginShell>
  );
}
