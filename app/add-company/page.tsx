"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { CompanySearch } from "@/components/company/CompanySearch";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ABR_ENTITY_TYPES,
  type AbrCompany,
  formatAbn,
  validateAbnField,
} from "@/lib/abn";
import { PENDING_ORG_NAME, nextSetupPath } from "@/lib/auth";
import {
  SETUP_STEP,
  isRealCompanyName,
  readSelectedCompany,
  safeAddCompanyReturn,
  saveSelectedCompany,
} from "@/lib/company-pickup";

function AddCompanyForm() {
  const { user, loading, updateProfile, needsOnboarding } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturn =
    searchParams.get("returnTo") || searchParams.get("return") || searchParams.get("next");
  const nextUrl = rawReturn ? safeAddCompanyReturn(rawReturn) : null;

  const [selected, setSelected] = useState<AbrCompany | null>(null);
  const [manual, setManual] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [abn, setAbn] = useState("");
  const [entityType, setEntityType] = useState<(typeof ABR_ENTITY_TYPES)[number]>(
    "Australian Private Company"
  );
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled) return;
    const picked = readSelectedCompany();
    const named = user && user.businessName !== PENDING_ORG_NAME ? user.businessName : "";
    if (picked?.legalName) {
      setLegalName(picked.legalName);
      setAbn(picked.abn);
      setAddress(picked.address ?? "");
      if (picked.entityType && (ABR_ENTITY_TYPES as readonly string[]).includes(picked.entityType)) {
        setEntityType(picked.entityType as (typeof ABR_ENTITY_TYPES)[number]);
      }
      setManual(true);
      setPrefilled(true);
      return;
    }
    if (!user || !named) return;
    setLegalName(named);
    setAbn(user.abn ?? "");
    setAddress(user.businessAddress ?? "");
    if (user.entityType && (ABR_ENTITY_TYPES as readonly string[]).includes(user.entityType)) {
      setEntityType(user.entityType as (typeof ABR_ENTITY_TYPES)[number]);
    }
    setManual(true);
    setPrefilled(true);
  }, [user, prefilled]);

  const stepLabel = user
    ? needsOnboarding
      ? SETUP_STEP.addCompany
      : "Your company"
    : "Add a company";

  const continueHref = useMemo(() => {
    if (nextUrl) return nextUrl;
    if (user) {
      return nextSetupPath({
        ...user,
        companyAdded: true,
        businessName: legalName || user.businessName,
      });
    }
    return "/signup";
  }, [nextUrl, user, legalName]);

  function applyCompany(company: AbrCompany | null) {
    setSelected(company);
    setError(null);
    if (!company) return;
    setLegalName(company.legalName);
    setAbn(company.abn);
    setEntityType(company.entityType);
    setAddress(company.address ?? "");
    setManual(false);
  }

  function openManual() {
    setManual(true);
    setSelected(null);
    setError(null);
    setLegalName((current) =>
      current || (user && user.businessName !== PENDING_ORG_NAME ? user.businessName : "")
    );
    setAbn((current) => current || user?.abn || "");
    setAddress((current) => current || user?.businessAddress || "");
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    const name = legalName.trim();
    if (!name) {
      setError("Enter the legal name of the company.");
      return;
    }
    const abnErr = validateAbnField(abn, false);
    if (abnErr) {
      setError(abnErr);
      return;
    }
    if (!user) {
      saveSelectedCompany({
        legalName: name,
        abn: abn.trim() ? formatAbn(abn) : "",
        gstRegistered: selected?.gstRegistered ?? false,
        entityType,
        address: address.trim(),
      });
      router.push("/signup");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await updateProfile({
      businessName: name,
      abn: abn.trim() ? formatAbn(abn) : "",
      entityType,
      businessAddress: address.trim(),
      gstRegistered: selected?.gstRegistered ?? user.gstRegistered,
      companyAdded: true,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    saveSelectedCompany({
      legalName: name,
      abn: abn.trim() ? formatAbn(abn) : "",
      gstRegistered: selected?.gstRegistered ?? res.account.gstRegistered ?? false,
      entityType,
      address: address.trim(),
    });
    router.push(nextUrl || nextSetupPath(res.account));
  }

  if (loading) {
    return <div className="p-8 text-center text-white">Loading…</div>;
  }

  const detailsReady = Boolean(selected || manual);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          {user ? (
            <>
              <Link href="/onboarding" className="hover:text-white hover:underline">
                Setup
              </Link>
              <Link href="/demo/account" className="hover:text-white hover:underline">
                Account
              </Link>
              <Link href="/demo" className="hover:text-white hover:underline">
                App
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup" className="hover:text-white hover:underline">
                Sign up
              </Link>
              <Link href="/login" className="hover:text-white hover:underline">
                Log in
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">{stepLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Add your company</h1>
        <p className="mt-2 text-sm text-slate-300">
          Search HyperionInvoices&apos; Australian Business Register lookup by name or ABN, pick the match,
          then confirm the details. You can also type them yourself on this page.
        </p>

        <div className="mt-6 space-y-6">
          <CompanySearch selected={selected} onSelect={applyCompany} />

          {detailsReady && (
            <form className="space-y-4 rounded-xl border border-brand-400/25 bg-brand-500/5 p-4" onSubmit={save}>
              <h2 className="text-sm font-semibold text-white">
                {selected ? "Company details" : "Enter company details"}
              </h2>
              <div>
                <label className="label" htmlFor="legalName">
                  Legal name
                </label>
                <input
                  id="legalName"
                  className="input"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirmAbn">
                  ABN
                </label>
                <input
                  id="confirmAbn"
                  className="input"
                  inputMode="numeric"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value)}
                  placeholder="11 digits, spaces optional"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label" htmlFor="entityType">
                  Entity type
                </label>
                <select
                  id="entityType"
                  className="input"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as (typeof ABR_ENTITY_TYPES)[number])}
                >
                  {ABR_ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="address">
                  Address {selected && !selected.address ? "(not on this register record)" : ""}
                </label>
                <input
                  id="address"
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, suburb, state and postcode"
                  autoComplete="street-address"
                />
              </div>
              {selected && (
                <p className="text-xs text-slate-400">
                  Status: {selected.entityStatus}
                  {selected.gstRegistered ? " · GST registered" : " · Not GST registered"}
                  {selected.simulated
                    ? ". Demo register result — you can edit any field."
                    : ". From the Australian Business Register."}
                </p>
              )}
              {error && <p className="text-sm text-rose-300">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || !isRealCompanyName(legalName)}
                >
                  {busy ? "Saving…" : "Confirm company"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => applyCompany(null)}>
                  Clear
                </button>
              </div>
            </form>
          )}

          {!manual && (
            <p className="text-sm text-slate-300">
              Can&apos;t find the business?{" "}
              <button
                type="button"
                className="font-semibold text-brand-300 hover:underline"
                onClick={openManual}
              >
                Enter the details yourself
              </button>
              .
            </p>
          )}

          {error && !detailsReady && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
            {user && !needsOnboarding && (
              <Link href={continueHref} className="hover:text-white hover:underline">
                Back to the app
              </Link>
            )}
            <Link href="/signup" className="hover:text-white hover:underline">
              {user ? "Create another account" : "Start from sign up"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddCompanyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading…</div>}>
      <AddCompanyForm />
    </Suspense>
  );
}
