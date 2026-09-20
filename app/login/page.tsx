"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { needsOnboarding } from "@/lib/auth";

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
    router.push(needsOnboarding(res.account) ? "/onboarding" : "/demo");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <BrandLogo className="mb-8 justify-center" />
      <div className="card p-6">
        <h1 className="text-xl font-bold text-white">Log in</h1>
        <p className="mt-1 text-sm text-slate-300">
          Prefer to look first?{" "}
          <Link href="/pricing" className="font-semibold text-brand-300 hover:underline">
            See pricing
          </Link>
          {" "}or{" "}
          <Link href="/demo" className="font-semibold text-brand-300 hover:underline">
            browse sample data
          </Link>
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
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-brand-300 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
