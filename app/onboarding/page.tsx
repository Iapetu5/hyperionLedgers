"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { AbnField } from "@/components/abn/AbnField";
import { EasyStepBar } from "@/components/easy/EasyStepBar";
import type { GstAccountingMethod, LedgerMode } from "@/lib/auth";
import { clearUserOrganisationDocs } from "@/lib/user-docs";
import { clearSelectedCompany, readSelectedCompany } from "@/lib/add-company";

type StepId = "gst" | "method" | "year" | "ledger";

const FY_ENDS = ["30 June", "31 March", "31 December", "30 September"] as const;

function stepsFor(gstRegistered: boolean): StepId[] {
  return gstRegistered ? ["gst", "method", "year", "ledger"] : ["gst", "year", "ledger"];
}

const STEP_LABEL: Record<StepId, string> = {
  gst: "GST",
  method: "GST method",
  year: "Year end",
  ledger: "How to start",
};

export default function OnboardingPage() {
  const { user, loading, completeOnboarding, skipOnboarding, needsOnboarding, updateProfile } = useAuth();
  const router = useRouter();
  const [gstRegistered, setGstRegistered] = useState(true);
  const [method, setMethod] = useState<GstAccountingMethod>("accruals");
  const [fyEnd, setFyEnd] = useState("30 June");
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>("blank");
  const [abn, setAbn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stepId, setStepId] = useState<StepId>("gst");

  const steps = useMemo(() => stepsFor(gstRegistered), [gstRegistered]);
  const stepIndex = Math.max(0, steps.indexOf(stepId));
  const current = steps[stepIndex] ?? "gst";

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
    if (user.abn) setAbn(user.abn);
    const picked = readSelectedCompany();
    if (!picked) return;
    setAbn(picked.abn);
    setGstRegistered(picked.gstRegistered);
    void updateProfile({
      businessName: picked.legalName,
      abn: picked.abn,
      gstRegistered: picked.gstRegistered,
    });
    clearSelectedCompany();
  }, [user, loading, needsOnboarding, router, updateProfile]);

  useEffect(() => {
    if (!steps.includes(stepId)) {
      setStepId(steps[Math.min(stepIndex, steps.length - 1)] ?? "gst");
    }
  }, [steps, stepId, stepIndex]);

  function goAfterSetup(mode: LedgerMode) {
    router.push(mode === "blank" ? "/demo?welcome=1" : "/demo");
  }

  async function finish() {
    const res = await completeOnboarding({
      gstRegistered,
      gstAccountingMethod: gstRegistered ? method : undefined,
      financialYearEnd: fyEnd,
      ledgerMode,
      abn,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (ledgerMode === "blank") clearUserOrganisationDocs();
    goAfterSetup(ledgerMode);
  }

  function goNext() {
    const i = steps.indexOf(current);
    if (i < steps.length - 1) {
      setError(null);
      setStepId(steps[i + 1]);
      return;
    }
    void finish();
  }

  function goBack() {
    const i = steps.indexOf(current);
    if (i > 0) {
      setError(null);
      setStepId(steps[i - 1]);
    }
  }

  async function onSkip() {
    const res = await skipOnboarding();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/demo");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goNext();
  }

  if (loading || !user) {
    return <div className="p-8 text-center text-white">Loading…</div>;
  }

  const isLast = current === "ledger";
  const continueLabel = isLast
    ? ledgerMode === "blank"
      ? "Continue — create your first document"
      : "Continue to your organisation"
    : "Continue";

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <BrandLogo className="mb-8 justify-center" />
      <div className="card easy-form p-6">
        <EasyStepBar current={stepIndex + 1} total={steps.length} label={STEP_LABEL[current]} />
        <h1 className="mt-4 text-xl font-bold text-white">Set up your HyperionInvoices business</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          One question at a time for {user.businessName}. You can change these later in Your account.
        </p>
        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          {current === "gst" && (
            <fieldset>
              <legend className="label">Are you registered for GST?</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {[true, false].map((v) => (
                  <label
                    key={String(v)}
                    className={`choice-card ${gstRegistered === v ? "choice-card-active" : ""}`}
                  >
                    <input type="radio" name="gstRegistered" checked={gstRegistered === v} onChange={() => setGstRegistered(v)} />
                    <span>
                      <strong className="text-white">{v ? "Yes" : "No"}</strong>
                      <span className="mt-1 block text-sm text-slate-300">
                        {v ? "Show GST on sales and purchases, plus BAS due dates." : "Hide GST on documents; BAS due dates still shown for planning."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {current === "method" && (
            <fieldset>
              <legend className="label">GST accounting method</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
                      <span className="mt-1 block text-sm text-slate-300">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {current === "year" && (
            <>
              <fieldset>
                <legend className="label">Financial year end</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {FY_ENDS.map((end) => (
                    <label
                      key={end}
                      className={`choice-card ${fyEnd === end ? "choice-card-active" : ""}`}
                    >
                      <input type="radio" name="fyEnd" checked={fyEnd === end} onChange={() => setFyEnd(end)} />
                      <span className="font-semibold text-white">{end}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <div className="mb-2 flex justify-end">
                  <Link href="/onboarding/add-company?return=/onboarding" className="text-sm font-semibold text-brand-300 hover:underline">
                    Add company
                  </Link>
                </div>
                <AbnField value={abn} onChange={setAbn} />
              </div>
            </>
          )}

          {current === "ledger" && (
            <fieldset>
              <legend className="label">How would you like to start?</legend>
              <div className="mt-2 space-y-3">
                <label
                  className={`choice-card ${ledgerMode === "blank" ? "choice-card-active" : ""}`}
                >
                  <input type="radio" name="ledgerMode" checked={ledgerMode === "blank"} onChange={() => setLedgerMode("blank")} />
                  <span>
                    <strong className="text-white">Start empty</strong>
                    <span className="mt-1 block text-slate-300">
                      Default for a new organisation. Begin under your business name, then create a first invoice, quote, or bill — a ready-made example is one click away.
                    </span>
                  </span>
                </label>
                <label
                  className={`choice-card ${ledgerMode === "sample" ? "choice-card-active" : ""}`}
                >
                  <input type="radio" name="ledgerMode" checked={ledgerMode === "sample"} onChange={() => setLedgerMode("sample")} />
                  <span>
                    <strong className="text-white">Sample data</strong>
                    <span className="mt-1 block text-slate-300">
                      Optional tour of Harbour &amp; Co invoices, banking and BAS. Not your own first document.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          {current === "ledger" && ledgerMode === "blank" && (
            <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
              After Continue you&apos;ll land on Overview with clear shortcuts to create an invoice, quote, or bill.
            </div>
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex flex-col gap-2">
            <button type="submit" className="btn-primary w-full">
              {continueLabel}
            </button>
            <div className="flex flex-wrap gap-2">
              {stepIndex > 0 && (
                <button type="button" className="btn-secondary" onClick={goBack}>
                  Back
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={onSkip}>
                Skip — use sample data
              </button>
            </div>
          </div>
        </form>
        <p className="mt-5 text-sm text-slate-400">Demo setup — preferences stay in this browser only.</p>
      </div>
    </div>
  );
}
