"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AbnField } from "@/components/abn/AbnField";
import { ExploreSampleButton } from "@/components/demo/ExploreSampleButton";
import type { GstAccountingMethod } from "@/lib/auth";

export default function AccountPage() {
  const { user, updateProfile, loading, usesSampleData } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [abn, setAbn] = useState("");
  const [gstRegistered, setGstRegistered] = useState(true);
  const [method, setMethod] = useState<GstAccountingMethod>("accruals");
  const [fyEnd, setFyEnd] = useState("30 June");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setBusinessName(user.businessName);
    setAbn(user.abn ?? "");
    setGstRegistered(user.gstRegistered ?? true);
    setMethod(user.gstAccountingMethod ?? "accruals");
    setFyEnd(user.financialYearEnd ?? "30 June");
  }, [user]);

  if (loading) return <p className="text-white">Loading…</p>;

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <div className="card p-6 text-sm text-slate-200">
          You&apos;re browsing as a guest on the Harbour &amp; Co sample organisation.
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/signup" className="btn-primary">Sign up to keep an org</Link>
            <Link href="/login" className="btn-secondary">Log in</Link>
          </div>
        </div>
      </div>
    );
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = updateProfile({
      businessName,
      abn,
      gstRegistered,
      gstAccountingMethod: gstRegistered ? method : undefined,
      financialYearEnd: fyEnd,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage("Saved locally in this browser.");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Account</h1>

      {!usesSampleData && (
        <div className="card border-brand-400/25 bg-brand-500/10 p-5">
          <p className="text-sm font-semibold text-white">Blank ledger</p>
          <p className="mt-1 text-sm text-slate-300">
            Sample Harbour figures stay out of this organisation. Create an invoice, quote, or bill next — each can start from a ready-made example. Harbour &amp; Co is a separate guest tour and logs you out; log back in anytime.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/demo/invoices?mixed=1" className="btn-primary">
              Create invoice
            </Link>
            <Link href="/demo/quotes?mixed=1" className="btn-secondary">
              Create quote
            </Link>
            <Link href="/demo/bills?mixed=1" className="btn-secondary">
              Create bill
            </Link>
            <ExploreSampleButton primary={false} label="Open Harbour & Co sample as guest" />
          </div>
        </div>
      )}

      <form className="card max-w-xl space-y-4 p-6" onSubmit={onSave}>
        <div>
          <label className="label" htmlFor="bn">Business name</label>
          <input id="bn" className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <AbnField value={abn} onChange={setAbn} />
        <fieldset>
          <legend className="label">GST registered</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[true, false].map((v) => (
              <label
                key={String(v)}
                className={`choice-card ${gstRegistered === v ? "choice-card-active" : ""}`}
              >
                <input type="radio" name="gstRegistered" checked={gstRegistered === v} onChange={() => setGstRegistered(v)} />
                <span className="font-semibold text-white">{v ? "Yes" : "No"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {gstRegistered && (
          <fieldset>
            <legend className="label">GST method</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["accruals", "cash"] as const).map((m) => (
                <label
                  key={m}
                  className={`choice-card capitalize ${method === m ? "choice-card-active" : ""}`}
                >
                  <input type="radio" name="gstMethod" checked={method === m} onChange={() => setMethod(m)} />
                  <span className="font-semibold text-white">{m}</span>
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
        <p className="text-xs text-slate-400">
          Ledger mode: <strong className="text-slate-200">{user.ledgerMode ?? "sample"}</strong> (set during onboarding).
        </p>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <button type="submit" className="btn-primary">Save</button>
      </form>
    </div>
  );
}
