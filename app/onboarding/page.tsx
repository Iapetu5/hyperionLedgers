"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { AbnField } from "@/components/abn/AbnField";
import type { GstAccountingMethod, LedgerMode } from "@/lib/auth";

export default function OnboardingPage() {
  const { user, loading, completeOnboarding, skipOnboarding, needsOnboarding } = useAuth();
  const router = useRouter();
  const [gstRegistered, setGstRegistered] = useState(true);
  const [method, setMethod] = useState<GstAccountingMethod>("accruals");
  const [fyEnd, setFyEnd] = useState("30 June");
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>("sample");
  const [abn, setAbn] = useState("");
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
    if (user.abn) setAbn(user.abn);
  }, [user, loading, needsOnboarding, router]);

  function finish(e?: FormEvent) {
    e?.preventDefault();
    const res = completeOnboarding({
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
    router.push("/demo");
  }

  function onSkip() {
    const res = skipOnboarding();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/demo");
  }

  if (loading || !user) {
    return <div className="p-8 text-center text-white">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <BrandLogo className="mb-8 justify-center" />
      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Step 2 of 2 · Organisation setup</p>
        <h1 className="mt-1 text-xl font-bold text-white">Set up your organisation</h1>
        <p className="mt-1 text-sm text-slate-300">
          A few preferences for {user.businessName}. You can change these later in Account.
        </p>
        <form className="mt-6 space-y-5" onSubmit={finish}>
          <fieldset>
            <legend className="label">Are you registered for GST?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[true, false].map((v) => (
                <label
                  key={String(v)}
                  className={`choice-card ${gstRegistered === v ? "choice-card-active" : ""}`}
                >
                  <input type="radio" name="gstRegistered" checked={gstRegistered === v} onChange={() => setGstRegistered(v)} />
                  <span>
                    <strong className="text-white">{v ? "Yes" : "No"}</strong>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {v ? "Show BAS widgets and GST on sales/purchases." : "Still see due dates for education — mark unregistered."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {gstRegistered && (
            <fieldset>
              <legend className="label">GST accounting method</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
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

          <div>
            <label className="label" htmlFor="fy">Financial year end</label>
            <select id="fy" className="input" value={fyEnd} onChange={(e) => setFyEnd(e.target.value)}>
              <option>30 June</option>
              <option>31 March</option>
              <option>31 December</option>
              <option>30 September</option>
            </select>
          </div>

          <AbnField value={abn} onChange={setAbn} />

          <fieldset>
            <legend className="label">Starting ledger</legend>
            <div className="mt-2 space-y-2">
              <label
                className={`choice-card ${ledgerMode === "sample" ? "choice-card-active" : ""}`}
              >
                <input type="radio" name="ledgerMode" checked={ledgerMode === "sample"} onChange={() => setLedgerMode("sample")} />
                <span>
                  <strong className="text-white">Sample data</strong>
                  <span className="mt-0.5 block text-slate-300">
                    Explore Harbour &amp; Co invoices, banking and BAS first — recommended for a first session.
                  </span>
                </span>
              </label>
              <label
                className={`choice-card ${ledgerMode === "blank" ? "choice-card-active" : ""}`}
              >
                <input type="radio" name="ledgerMode" checked={ledgerMode === "blank"} onChange={() => setLedgerMode("blank")} />
                <span>
                  <strong className="text-white">Blank ledger</strong>
                  <span className="mt-0.5 block text-slate-300">
                    Start empty under your org name — try a mixed GST + GST Free invoice and the pay link when ready, plus quotes, bills, and light CSV banking. Harbour & Co sample figures stay in the guest demo.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">Continue to your organisation</button>
            <button type="button" className="btn-secondary" onClick={onSkip}>
              Skip — GST on + sample ledger
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate-400">Demo setup — preferences stay in this browser only.</p>
      </div>
    </div>
  );
}
