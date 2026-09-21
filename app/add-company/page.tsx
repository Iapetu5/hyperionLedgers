"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  const [fieldErrors, setFieldErrors] = useState<{ legalName?: string; abn?: string }>({});
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailsReady = Boolean(selected || manual);

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

  const changingExisting =
    Boolean(user) && !needsOnboarding && isRealCompanyName(user?.businessName);
  const stepLabel = user
    ? needsOnboarding
      ? SETUP_STEP.addCompany
      : "Your company"
    : "Add a company";
  const pageTitle = changingExisting ? "Change your company" : "Add your company";

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
    setFieldErrors({});
    if (!company) {
      setManual(false);
      return;
    }
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
    setFieldErrors({});
    setLegalName((current) =>
      current || (user && user.businessName !== PENDING_ORG_NAME ? user.businessName : "")
    );
    setAbn((current) => current || user?.abn || "");
    setAddress((current) => current || user?.businessAddress || "");
  }

  useEffect(() => {
    if (loading || !detailsReady) return;
    confirmHeadingRef.current?.focus();
  }, [detailsReady, loading]);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    const name = legalName.trim();
    const nextErrors: { legalName?: string; abn?: string } = {};
    if (!name) nextErrors.legalName = "Enter the business name.";
    const abnErr = validateAbnField(abn, false);
    if (abnErr) nextErrors.abn = abnErr;
    if (nextErrors.legalName || nextErrors.abn) {
      setFieldErrors(nextErrors);
      setError(null);
      document.getElementById(nextErrors.legalName ? "legalName" : "confirmAbn")?.focus();
      return;
    }
    setFieldErrors({});
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
    return <AddCompanyLoading />;
  }

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
        <h1 className="mt-1 text-2xl font-bold text-white">{pageTitle}</h1>
        <p className="mt-2 text-sm text-slate-300">
          Type the business name or ABN. Pick a match, check the details, then confirm. If you
          cannot find it, you can type the details yourself.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
          {[
            { n: "1", label: "Search", current: !detailsReady },
            { n: "2", label: "Pick a match", current: false },
            { n: "3", label: "Confirm", current: detailsReady },
          ].map((chip) => (
            <li
              key={chip.n}
              aria-current={chip.current ? "step" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                chip.current
                  ? "border-brand-400/40 bg-brand-500/10 text-white"
                  : "border-white/10 bg-black/25"
              }`}
            >
              <span className="text-brand-300">{chip.n}</span>
              {chip.label}
            </li>
          ))}
        </ol>

        <div className="mt-6 space-y-6">
          <CompanySearch selected={selected} onSelect={applyCompany} />

          {detailsReady && (
            <form className="space-y-4 rounded-xl border border-brand-400/25 bg-brand-500/5 p-4" onSubmit={save} noValidate>
              <h2
                ref={confirmHeadingRef}
                tabIndex={-1}
                className="text-sm font-semibold text-white outline-none"
              >
                {selected ? "Confirm these details" : "Enter company details"}
              </h2>
              <p className="text-sm text-slate-300">
                {selected
                  ? "Check the name, ABN, and type, then confirm."
                  : "Fill in what you know. ABN can wait."}
              </p>
              {selected?.entityStatus === "Cancelled" && (
                <p className="text-sm text-amber-200" role="status">
                  This record is cancelled. Check you picked the right business before you confirm.
                </p>
              )}
              <div>
                <label className="label" htmlFor="legalName">
                  Business name
                </label>
                <input
                  id="legalName"
                  className="input"
                  required
                  value={legalName}
                  aria-invalid={Boolean(fieldErrors.legalName)}
                  aria-describedby={
                    fieldErrors.legalName ? "legalName-error" : "legalName-hint"
                  }
                  onChange={(e) => {
                    setLegalName(e.target.value);
                    if (fieldErrors.legalName) {
                      setFieldErrors((prev) => ({ ...prev, legalName: undefined }));
                    }
                  }}
                  autoComplete="organization"
                />
                {fieldErrors.legalName ? (
                  <p id="legalName-error" className="mt-1 text-sm text-rose-300" role="alert">
                    {fieldErrors.legalName}
                  </p>
                ) : (
                  <p id="legalName-hint" className="mt-1 text-xs text-slate-400">
                    The official name on the ABN record.
                  </p>
                )}
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
                  aria-invalid={Boolean(fieldErrors.abn)}
                  aria-describedby={fieldErrors.abn ? "confirmAbn-error" : "confirmAbn-hint"}
                  onChange={(e) => {
                    setAbn(e.target.value);
                    if (fieldErrors.abn) {
                      setFieldErrors((prev) => ({ ...prev, abn: undefined }));
                    }
                  }}
                  placeholder="11 digits, spaces optional"
                  autoComplete="off"
                />
                {fieldErrors.abn ? (
                  <p id="confirmAbn-error" className="mt-1 text-sm text-rose-300" role="alert">
                    {fieldErrors.abn}
                  </p>
                ) : (
                  <p id="confirmAbn-hint" className="mt-1 text-xs text-slate-400">
                    11 digits. Spaces are fine. You can leave this blank.
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="entityType">
                  Business type
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
                <p className="mt-1 text-xs text-slate-400">
                  Company, sole trader, or partnership — pick the closest match.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="address">
                  Address {selected && !selected.address ? "(not listed — you can type it)" : ""}
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
                    ? ". Practice match — you can edit any field."
                    : ". From the Australian Business Register."}
                </p>
              )}
              {error && (
                <p className="text-sm text-rose-300" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                {!isRealCompanyName(legalName) && (
                  <p id="confirm-hint" className="text-sm text-slate-300">
                    Enter the business name to confirm.
                  </p>
                )}
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={busy || !isRealCompanyName(legalName)}
                  aria-busy={busy}
                  aria-describedby={
                    !isRealCompanyName(legalName) ? "confirm-hint" : undefined
                  }
                >
                  {busy ? "Saving…" : "Confirm company"}
                </button>
                {!selected && (
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-400 hover:text-white hover:underline"
                    onClick={() => applyCompany(null)}
                  >
                    Clear and search again
                  </button>
                )}
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

          {error && !detailsReady && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
            {user && needsOnboarding && (
              <Link href="/onboarding" className="hover:text-white hover:underline">
                Back to setup questions
              </Link>
            )}
            {user && !needsOnboarding && (
              <Link href={continueHref} className="hover:text-white hover:underline">
                {nextUrl === "/demo/account" ? "Back to your account" : "Back to the app"}
              </Link>
            )}
            {!user && (
              <Link href="/signup" className="hover:text-white hover:underline">
                Start from sign up
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddCompanyPage() {
  return (
    <Suspense fallback={<AddCompanyLoading />}>
      <AddCompanyForm />
    </Suspense>
  );
}

function AddCompanyLoading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <BrandLogo />
      <div className="card mt-6 p-8 text-center text-sm text-white" role="status" aria-live="polite">
        Loading…
      </div>
    </div>
  );
}
