"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { AbrRegisterNote } from "@/components/company/AbrRegisterNote";
import { CompanySearch } from "@/components/company/CompanySearch";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ABR_ENTITY_TYPES,
  type AbrCompany,
  describeAbrLookup,
  digitsOnlyAbn,
  formatAbn,
  looksLikeAbnQuery,
  validateAbnField,
} from "@/lib/abn";
import { PENDING_ORG_NAME, nextSetupPath } from "@/lib/auth";
import { validateCompanySave, type CompanyFieldErrors } from "@/lib/company-save";
import {
  SETUP_STEP,
  isRealCompanyName,
  readSelectedCompany,
  safeAddCompanyReturn,
  saveSelectedCompany,
} from "@/lib/company-pickup";
import { continueTrialCheckout, hasTrialIntent, trialCheckoutOpened } from "@/lib/start-trial";

function AddCompanyLoading() {
  return <div className="p-8 text-center text-white">Loading…</div>;
}

function AddCompanyForm() {
  const { user, loading, updateProfile, needsOnboarding } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturn =
    searchParams.get("returnTo") || searchParams.get("return") || searchParams.get("next");
  const nextUrl = rawReturn ? safeAddCompanyReturn(rawReturn) : null;
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null);

  const [selected, setSelected] = useState<AbrCompany | null>(null);
  const [legalName, setLegalName] = useState("");
  const [abn, setAbn] = useState("");
  const [entityType, setEntityType] = useState<(typeof ABR_ENTITY_TYPES)[number]>(
    "Australian Private Company"
  );
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CompanyFieldErrors>({});
  const [abnHint, setAbnHint] = useState<string | null>(null);
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
  const selectedCopy = selected
    ? describeAbrLookup(!selected.simulated, selected.simulated)
    : null;

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
    setAbnHint(null);
    if (!company) return;
    setLegalName(company.legalName);
    setAbn(company.abn);
    setEntityType(company.entityType);
    setAddress(company.address ?? "");
    window.setTimeout(() => confirmHeadingRef.current?.focus(), 0);
  }

  function openManual(query = "") {
    setSelected(null);
    setError(null);
    setFieldErrors({});
    setAbnHint(null);
    const suggested = query.trim();
    if (suggested && !looksLikeAbnQuery(suggested)) {
      setLegalName((current) => current || suggested);
    } else {
      setLegalName((current) =>
        current || (user && user.businessName !== PENDING_ORG_NAME ? user.businessName : "")
      );
    }
    setAbn((current) => current || user?.abn || "");
    setAddress((current) => current || user?.businessAddress || "");
    window.setTimeout(() => nameRef.current?.focus(), 0);
  }

  useEffect(() => {
    const digits = digitsOnlyAbn(abn);
    if (digits.length !== 11 || validateAbnField(abn, false)) {
      setAbnHint(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/abr/search?q=${encodeURIComponent(digits)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as {
          results?: AbrCompany[];
          simulated?: boolean;
          liveConfigured?: boolean;
        };
        const row = data.results?.[0];
        const copy = describeAbrLookup(data.liveConfigured === true, data.simulated !== false);
        if (!row) {
          setAbnHint("Valid ABN checksum — no register match. You can still confirm the name below.");
          return;
        }
        if (!legalName.trim()) {
          setLegalName(row.legalName);
          setEntityType(row.entityType);
          if (row.address) setAddress(row.address);
        }
        setAbnHint(
          copy.live
            ? `Matched ${row.legalName} from the Australian Business Register — check the name before you confirm.`
            : `Practice register match for ${row.legalName} — edit any field if needed.`
        );
      } catch {
        setAbnHint("Valid ABN checksum — confirm the business name before you save.");
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [abn, legalName]);

  function formatAbnField() {
    if (!abn.trim() || validateAbnField(abn, false)) return;
    setAbn(formatAbn(abn));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    const validated = validateCompanySave({
      legalName,
      abn,
      requireAbn: false,
    });
    if (!validated.ok) {
      setFieldErrors(validated.errors);
      setError(null);
      document.getElementById(validated.errors.legalName ? "legalName" : "confirmAbn")?.focus();
      return;
    }
    setFieldErrors({});
    const { legalName: name, formattedAbn } = validated.value;

    if (!user) {
      saveSelectedCompany({
        legalName: name,
        abn: formattedAbn,
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
      abn: formattedAbn,
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
      abn: formattedAbn,
      gstRegistered: selected?.gstRegistered ?? res.account.gstRegistered ?? false,
      entityType,
      address: address.trim(),
    });
    const dest = nextUrl || nextSetupPath(res.account);
    if (hasTrialIntent() && dest === "/demo") {
      const checkoutUrl = await continueTrialCheckout(res.account.email);
      if (trialCheckoutOpened(checkoutUrl)) return;
      if (checkoutUrl?.startsWith("/")) router.push(checkoutUrl);
      return;
    }
    router.push(dest);
  }

  if (loading) {
    return <AddCompanyLoading />;
  }

  const typedReady = Boolean(legalName.trim());

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
          Search if you like, or type the business name, optional ABN, and business type, then
          confirm. You do not need a register match to continue.
        </p>
        <AbrRegisterNote className="mt-3 text-xs text-slate-400" />
        <ol className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
          {[
            { n: "1", label: "Search", current: !selected && !typedReady },
            { n: "2", label: "Pick or type", current: !selected && typedReady },
            { n: "3", label: "Confirm", current: Boolean(selected) },
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
          <CompanySearch selected={selected} onSelect={applyCompany} onNeedManual={openManual} />

          <form
            id="company-details"
            className="space-y-4 rounded-xl border border-brand-400/25 bg-brand-500/5 p-4"
            onSubmit={save}
            noValidate
          >
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
                : "Business name and business type are required. ABN is optional — if you enter one, we check the 11-digit checksum."}
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
                ref={nameRef}
                id="legalName"
                className="input"
                required
                value={legalName}
                aria-invalid={Boolean(fieldErrors.legalName)}
                aria-describedby={fieldErrors.legalName ? "legalName-error" : "legalName-hint"}
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
                onBlur={formatAbnField}
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
              {abnHint && !fieldErrors.abn && (
                <p className="mt-1 text-xs text-brand-200" role="status">
                  {abnHint}
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
            {selected && selectedCopy && (
              <p className="text-xs text-slate-400">
                Status: {selected.entityStatus}
                {selected.gstRegistered ? " · GST registered" : " · Not GST registered"}
                . {selectedCopy.matchFooter}
              </p>
            )}
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Saving…" : "Confirm company"}
              </button>
              {selected && (
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

          {!selected && (
            <p className="text-sm text-slate-300">
              Prefer to skip the search?{" "}
              <button
                type="button"
                className="font-semibold text-brand-300 hover:underline"
                onClick={() => openManual()}
              >
                Enter the details yourself
              </button>
              .
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
      <p className="mt-4 text-center text-xs text-slate-500">
        HyperionInvoices does not lodge BAS or other forms with the ATO.
      </p>
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
