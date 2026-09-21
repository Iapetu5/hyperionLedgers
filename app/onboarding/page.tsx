"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import type { GstAccountingMethod, LedgerMode } from "@/lib/auth";
import { SETUP_STEP, addCompanyHref, isRealCompanyName } from "@/lib/company-pickup";
import { clearUserOrganisationDocs } from "@/lib/user-docs";
import { continueTrialCheckout, hasTrialIntent, trialCheckoutOpened } from "@/lib/start-trial";

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
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastFocusedStep = useRef<WizardStep | null>(null);

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

  async function goAfterSetup(mode: LedgerMode) {
    if (hasTrialIntent()) {
      const url = await continueTrialCheckout(user?.email);
      if (trialCheckoutOpened(url)) return;
      if (url?.startsWith("/")) {
        router.push(url);
        return;
      }
    }
    router.push(mode === "blank" ? "/demo?welcome=1" : "/demo");
  }

  async function saveAndFinish() {
    if (!isRealCompanyName(user?.businessName)) {
      setError("Add your company first — search or type the details, then confirm.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await completeOnboarding({
      gstRegistered,
      gstAccountingMethod: gstRegistered ? method : undefined,
      financialYearEnd: fyEnd,
      ledgerMode,
      abn: user?.abn,
    });
    if (!res.ok) {
      setSaving(false);
      setError(res.error);
      return;
    }
    if (ledgerMode === "blank") clearUserOrganisationDocs();
    await goAfterSetup(ledgerMode);
  }

  async function onSkip() {
    setSaving(true);
    setError(null);
    const res = await skipOnboarding();
    if (!res.ok) {
      setSaving(false);
      setError(res.error);
      return;
    }
    if (hasTrialIntent()) {
      const url = await continueTrialCheckout(user?.email);
      if (trialCheckoutOpened(url)) return;
      if (url?.startsWith("/")) {
        router.push(url);
        return;
      }
    }
    router.push("/demo");
  }

  function goNext(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!isRealCompanyName(user?.businessName)) {
      setError("Add your company first — search or type the details, then confirm.");
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

  useEffect(() => {
    if (loading || !user) return;
    if (lastFocusedStep.current === step) return;
    if (lastFocusedStep.current === null) {
      lastFocusedStep.current = step;
      return;
    }
    lastFocusedStep.current = step;
    headingRef.current?.focus();
  }, [step, loading, user]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <BrandLogo />
        <div className="card mt-8 p-8 text-center text-sm text-white" role="status" aria-live="polite">
          Loading…
        </div>
      </div>
    );
  }

  const hasCompany = isRealCompanyName(user.businessName);
  const savedName = hasCompany ? user.businessName : "";
  const titles: Record<WizardStep, string> = {
    gst: "Are you registered for GST?",
    method: "How do you work out GST?",
    fy: "When does your financial year end?",
    start: "How would you like to start?",
  };
  const intros: Record<WizardStep, string> = {
    gst: "Choose Yes or No. You can change this later in Account.",
    method: "This is only about when GST is counted — not how much tax you pay.",
    fy: "Most Australian businesses use 30 June. Pick a different date if your accountant uses one.",
    start: "Start empty for your own books, or look around with sample data first.",
  };
  const innerLabels: Record<WizardStep, string> = {
    gst: "GST",
    method: "GST method",
    fy: "Year end",
    start: "How to start",
  };
  const recapParts: string[] = [];
  if (step !== "gst") recapParts.push(gstRegistered ? "GST yes" : "GST no");
  if (gstRegistered && (step === "fy" || step === "start") && steps.includes("method")) {
    recapParts.push(method === "accruals" ? "Accruals" : "Cash");
  }
  if (step === "start") recapParts.push(`Year end ${fyEnd}`);

  function nextLabel() {
    if (isLast) {
      return ledgerMode === "blank"
        ? "Continue — create your first document"
        : "Continue to your organisation";
    }
    if (step === "gst") return gstRegistered ? "Next: how you work out GST" : "Next: year end";
    if (step === "method") return "Next: year end";
    return "Next: how to start";
  }

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
          {SETUP_STEP.organisation}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-200" aria-current="step">
          Step {stepIndex + 1} of {steps.length} · {innerLabels[step]}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((key, i) => (
            <span
              key={key}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIndex ? "bg-brand-400" : "bg-white/15"
              }`}
            />
          ))}
        </div>
        {recapParts.length > 0 && (
          <p className="mt-3 text-sm text-slate-300">
            So far: {recapParts.join(" · ")}. Back changes an earlier answer.
          </p>
        )}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-xl font-bold text-white outline-none"
        >
          {titles[step]}
        </h1>
        <p className="mt-1 text-sm text-slate-300">{intros[step]}</p>

        <p className="mt-4 text-sm text-slate-300">
          {hasCompany ? (
            <>
              Setting up{" "}
              <strong className="text-white">{savedName}</strong>
              {user.abn ? ` · ABN ${user.abn}` : ""}
              .{" "}
              <Link
                href={addCompanyHref("/onboarding")}
                className="font-semibold text-brand-300 hover:underline"
              >
                Change company
              </Link>
            </>
          ) : (
            <>
              Add your company first — search or type the details, then confirm.{" "}
              <Link
                href={addCompanyHref("/onboarding")}
                className="font-semibold text-brand-300 hover:underline"
              >
                Add company
              </Link>
            </>
          )}
        </p>

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
              <p className="mt-1 text-xs text-slate-400">
                30 June is the usual Australian year end. Keep it unless your accountant says otherwise.
              </p>
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

          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  className="self-start text-sm font-semibold text-slate-200 hover:underline disabled:opacity-40"
                  onClick={goBack}
                  disabled={saving}
                >
                  Back
                </button>
              ) : (
                <Link
                  href={addCompanyHref("/onboarding")}
                  className="self-start text-sm font-semibold text-slate-200 hover:underline"
                >
                  Back to add company
                </Link>
              )}
              <button
                type="submit"
                className="btn-primary w-full sm:w-auto"
                disabled={!hasCompany || saving}
                aria-busy={saving}
              >
                {saving && isLast ? "Saving…" : nextLabel()}
              </button>
            </div>
            {!hasCompany && (
              <p className="text-sm text-slate-300">
                Next is off until you add a company.{" "}
                <Link href={addCompanyHref("/onboarding")} className="font-semibold text-brand-300 hover:underline">
                  Add company
                </Link>
              </p>
            )}
            <button
              type="button"
              className="self-start text-sm font-medium text-slate-400 hover:text-white hover:underline disabled:opacity-40"
              onClick={onSkip}
              disabled={saving}
            >
              {step === "start"
                ? "Skip and open sample books"
                : "Skip remaining questions — use sample data"}
            </button>
            <p className="text-xs text-slate-400">
              Skip fills any unanswered questions with GST yes, Accruals, 30 June, and sample data.
            </p>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate-400">
          Saved to your HyperionInvoices organisation. You can change these later in Account.
        </p>
      </div>
    </div>
  );
}
