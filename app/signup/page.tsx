"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { validateSignup } from "@/lib/auth";
import { AbnField } from "@/components/abn/AbnField";
import { BusinessNameTypeahead } from "@/components/company/BusinessNameTypeahead";
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { ABR_ENTITY_TYPES, type AbrCompany, type AbrEntityType } from "@/lib/abn";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [abn, setAbn] = useState("");
  const [entityType, setEntityType] = useState<AbrEntityType | "">("");
  const [address, setAddress] = useState("");
  const [gstRegistered, setGstRegistered] = useState<boolean | undefined>(undefined);
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
    const res = await signUp({
      fullName,
      email,
      password,
      businessName,
      abn,
      entityType: entityType || undefined,
      businessAddress: address || undefined,
      gstRegistered,
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
    router.push("/add-company");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          <Link href="/add-company" className="hover:text-white hover:underline">
            Add company
          </Link>
          <Link href="/login" className="hover:text-white hover:underline">
            Log in
          </Link>
        </nav>
      </div>
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Step 1 of 3 · Account</p>
        <h1 className="mt-1 text-xl font-bold text-white">Start your free trial</h1>
        <p className="mt-1 text-sm text-slate-300">
          You get 14 days free. Then $69 a month. Next we ask a few setup questions. Then you can make
          your first invoice.
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
          <BusinessNameTypeahead
            value={businessName}
            onChange={setBusinessName}
            onSelect={(company: AbrCompany) => {
              setBusinessName(company.legalName);
              setAbn(company.abn);
              setEntityType(company.entityType);
              setAddress(company.address ?? "");
              setGstRegistered(company.gstRegistered);
            }}
          />
          {fieldErrors.businessName && <p className="mt-1 text-xs text-rose-300">{fieldErrors.businessName}</p>}
          <AbnField
            value={abn}
            onChange={setAbn}
            onLookup={(company) => {
              if (!company) return;
              if (!businessName.trim()) setBusinessName(company.legalName);
              if (!entityType) setEntityType(company.entityType);
              if (!address && company.address) setAddress(company.address);
              if (gstRegistered === undefined) setGstRegistered(company.gstRegistered);
            }}
          />
          {(entityType || address) && (
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="entityType">Entity type</label>
                <select
                  id="entityType"
                  className="input"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as AbrEntityType)}
                >
                  <option value="">Choose if you know it</option>
                  {ABR_ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="signupAddress">Address</label>
                <input
                  id="signupAddress"
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, suburb, state and postcode"
                  autoComplete="street-address"
                />
              </div>
            </div>
          )}
          {fieldErrors.abn && <p className="text-xs text-rose-300">{fieldErrors.abn}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating…" : "Continue"}
          </button>
          <p className="text-center text-xs text-slate-400">Then $69 a month.</p>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-300 hover:underline">
            Log in
          </Link>
          {" · "}
          <Link href="/add-company" className="font-semibold text-brand-300 hover:underline">
            Add a company
          </Link>
        </p>
      </div>
    </div>
  );
}
