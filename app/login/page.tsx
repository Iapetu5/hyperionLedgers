"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { nextSetupPath, validateLogin } from "@/lib/auth";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";

export default function LoginPage() {
  const { logIn } = useAuth();
  const router = useRouter();
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
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      document.getElementById("email")?.focus();
      return;
    }
    router.push(nextSetupPath(res.account));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          <Link href="/signup" className="hover:text-white hover:underline">
            Sign up
          </Link>
        </nav>
      </div>
      <div className="card p-6">
        <h1 className="text-xl font-bold text-white">Log in</h1>
        <p className="mt-2 text-sm text-slate-300">
          Use the email and password you created. If you have not added a company or finished
          setup, HyperionInvoices will take you there first.
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
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="label" htmlFor="email">Email</label>
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
            <label className="label" htmlFor="password">Password</label>
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
