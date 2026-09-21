"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import type { GstAccountingMethod, LedgerMode } from "@/lib/auth";
import { SETUP_STEP, addCompanyHref, isRealCompanyName } from "@/lib/company-pickup";
import { clearUserOrganisationDocs } from "@/lib/user-docs";

type WizardStep = "gst" | "method" | "fy" | "start";

export default function OnboardingPage() {
  const { user, loading, completeOnboarding, skipOnboarding, needsOnboarding } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("gst");
  const [gstRegistered, setGstRegistered] = useState(true);
  const [method, setMethod] = useState<GstAccountingMethod>("accruals");
  const [fyEnd, setFyEnd] = useState("30 June");
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>("blank");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/signup");
      return;
    }
    if (!needsOnboarding) {
      router.replace("/demo");
      return;
    }
    if (!isRealCompanyName(user.businessName)) {
      router.replace(addCompanyHref("/onboarding"));
      return;
    }
    if (user.gstRegistered !== undefined) setGstRegistered(user.gstRegistered);
    if (user.gstAccountingMethod) setMethod(user.gstAccountingMethod);
    if (user.financialYearEnd) setFyEnd(user.financialYearEnd);
  }, [user, loading, needsOnboarding, router]);

  const steps = useMemo<WizardStep[]>(
    () => (gstRegistered ? ["gst", "method", "fy", "start"] : ["gst", "fy", "start"]),
    [gstRegistered]
  );
  const stepIndex = Math.max(0, steps.indexOf(step));
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!steps.includes(step)) setStep(steps[0]);
  }, [steps, step]);

  function goAfterSetup(mode: LedgerMode) {
    router.push(mode === "blank" ? "/demo?welcome=1" : "/demo");
  }

  async function saveAndFinish() {
    if (!isRealCompanyName(user?.businessName)) {
      setError("Add your company first — search, pick a match, then confirm.");
      return;
    }
    const res = await completeOnboarding({
      gstRegistered,
      gstAccountingMethod: gstRegistered ? method : undefined,
      financialYearEnd: fyEnd,
      ledgerMode,
      abn: user?.abn,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (ledgerMode === "blank") clearUserOrganisationDocs();
    goAfterSetup(ledgerMode);
  }

  async function onSkip() {
    const res = await skipOnboarding();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/demo");
  }

  function goNext(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!isRealCompanyName(user?.businessName)) {
      setError("Add your company first — search, pick a match, then confirm.");
      return;
    }
    if (isLast) {
      void saveAndFinish();
      return;
    }
    setStep(steps[stepIndex + 1]);
  }

  function goBack() {
    setError(null);
    if (stepIndex <= 0) return;
    setStep(steps[stepIndex - 1]);
  }

  if (loading || !user) {
    return <div className="p-8 text-center text-white">Loading…</div>;
  }

  const hasCompany = isRealCompanyName(user.businessName);
  const savedName = hasCompany ? user.businessName : "";
  const orgName = savedName || "your business";
  const titles: Record<WizardStep, string> = {
    gst: "Are you registered for GST?",
    method: "GST accounting method",
    fy: "Financial year end",
    start: "How would you like to start?",
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <Link href="/" className="hover:text-white hover:underline">
            Home
          </Link>
          <Link href={addCompanyHref("/onboarding")} className="hover:text-white hover:underline">
            Add company
          </Link>
          <Link href="/demo/account" className="hover:text-white hover:underline">
            Account
          </Link>
        </nav>
      </div>
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
          {SETUP_STEP.organisation} · {orgName}
        </p>
        <h1 className="mt-1 text-xl font-bold text-white">{titles[step]}</h1>
        <p className="mt-1 text-sm text-slate-300">One choice at a time. You can change this later in Account.</p>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-200">
          <p className="font-semibold text-white">
            {savedName || "No company saved yet"}
          </p>
          {user.abn && <p className="mt-0.5 text-slate-300">ABN {user.abn}</p>}
          {user.entityType && <p className="text-slate-300">{user.entityType}</p>}
          {user.businessAddress && <p className="text-xs text-slate-400">{user.businessAddress}</p>}
          <p className="mt-1 text-xs text-slate-400">
            {(user.gstRegistered ?? gstRegistered) ? "GST registered" : "Not GST registered"}
            {user.abn ? "" : " — add the company on the Add company page"}
          </p>
          <Link
            href={addCompanyHref("/onboarding")}
            className="mt-2 inline-block font-semibold text-brand-300 hover:underline"
          >
            {savedName ? "Find your company" : "Add company"}
          </Link>
        </div>

        <form className="mt-6 space-y-5" onSubmit={goNext}>
          {step === "gst" && (
            <fieldset>
              <legend className="sr-only">Are you registered for GST?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[true, false].map((v) => (
                  <label
                    key={String(v)}
                    className={`choice-card ${gstRegistered === v ? "choice-card-active" : ""}`}
                  >
                    <input type="radio" name="gstRegistered" checked={gstRegistered === v} onChange={() => setGstRegistered(v)} />
                    <span>
                      <strong className="text-white">{v ? "Yes" : "No"}</strong>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {v
                          ? "Show GST on sales and purchases, plus BAS due dates."
                          : "Hide GST on documents; BAS due dates still shown for planning."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === "method" && (
            <fieldset>
              <legend className="sr-only">GST accounting method</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["accruals", "Accruals", "GST when you invoice or receive a bill."],
                  ["cash", "Cash", "GST when money hits the bank."],
                ] as const).map(([val, label, hint]) => (
                  <label
                    key={val}
                    className={`choice-card ${method === val ? "choice-card-active" : ""}`}
                  >
                    <input type="radio" name="gstMethod" checked={method === val} onChange={() => setMethod(val)} />
                    <span>
                      <strong className="text-white">{label}</strong>
                      <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === "fy" && (
            <div>
              <label className="label" htmlFor="fy">Financial year end</label>
              <select id="fy" className="input" value={fyEnd} onChange={(e) => setFyEnd(e.target.value)}>
                <option>30 June</option>
                <option>31 March</option>
                <option>31 December</option>
                <option>30 September</option>
              </select>
            </div>
          )}

          {step === "start" && (
            <>
              <fieldset>
                <legend className="sr-only">How would you like to start?</legend>
                <div className="space-y-2">
                  <label className={`choice-card ${ledgerMode === "blank" ? "choice-card-active" : ""}`}>
                    <input type="radio" name="ledgerMode" checked={ledgerMode === "blank"} onChange={() => setLedgerMode("blank")} />
                    <span>
                      <strong className="text-white">Start empty</strong>
                      <span className="mt-0.5 block text-slate-300">
                        Default for a new organisation. Begin under your business name, then create a first invoice, quote, or bill — a ready-made example is one click away.
                      </span>
                    </span>
                  </label>
                  <label className={`choice-card ${ledgerMode === "sample" ? "choice-card-active" : ""}`}>
                    <input type="radio" name="ledgerMode" checked={ledgerMode === "sample"} onChange={() => setLedgerMode("sample")} />
                    <span>
                      <strong className="text-white">Sample data</strong>
                      <span className="mt-0.5 block text-slate-300">
                        Optional tour of demo invoices, banking and BAS. Not your own first document.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
              {ledgerMode === "blank" && (
                <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100/90">
                  After Continue you&apos;ll land on Overview with clear shortcuts to create an invoice, quote, or bill.
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            {stepIndex > 0 && (
              <button type="button" className="text-sm font-semibold text-slate-200 hover:underline" onClick={goBack}>
                Back
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={!hasCompany}>
              {isLast
                ? ledgerMode === "blank"
                  ? "Continue — create your first document"
                  : "Continue to your organisation"
                : "Next"}
            </button>
            {!hasCompany && (
              <p className="w-full text-sm text-slate-300">
                Continue is off until you add a company.{" "}
                <Link href={addCompanyHref("/onboarding")} className="font-semibold text-brand-300 hover:underline">
                  Add company
                </Link>
              </p>
            )}
            <button type="button" className="text-sm font-medium text-slate-400 hover:text-white hover:underline" onClick={onSkip}>
              Skip — use sample data
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate-400">
          Saved to your HyperionInvoices organisation. You can change these later in Account.
        </p>
      </div>
    </div>
  );
}
