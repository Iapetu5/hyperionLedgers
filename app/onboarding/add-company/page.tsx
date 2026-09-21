"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { EasyStepBar } from "@/components/easy/EasyStepBar";
import { searchAbrCompanies, type AbrCompany } from "@/lib/abn";
import { saveSelectedCompany, safeAddCompanyReturn } from "@/lib/add-company";

type Phase = "search" | "results" | "confirm";

export default function AddCompanyPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/onboarding");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AbrCompany[]>([]);
  const [selected, setSelected] = useState<AbrCompany | null>(null);
  const [phase, setPhase] = useState<Phase>("search");

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("return");
    setReturnTo(safeAddCompanyReturn(raw || "/onboarding"));
  }, []);

  const stepNum = phase === "search" ? 1 : phase === "results" ? 2 : 3;
  const stepLabel = phase === "search" ? "Search" : phase === "results" ? "Select" : "Confirm";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setResults(searchAbrCompanies(query));
    setSelected(null);
    setPhase("results");
  }

  function confirm() {
    if (!selected) return;
    saveSelectedCompany({
      legalName: selected.legalName,
      abn: selected.abn,
      gstRegistered: selected.gstRegistered,
    });
    router.push(returnTo);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <BrandLogo className="mb-8 justify-center" />
      <div className="card p-6">
        <EasyStepBar current={stepNum} total={3} label={stepLabel} />
        <h1 className="mt-4 text-xl font-bold text-white">Add company</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Search the HyperionInvoices practice ABR, select a match, then confirm to fill your company.
          This is not a live ABR request.
        </p>

        {phase === "search" && (
          <form className="mt-6 space-y-4" onSubmit={onSearch}>
            <div>
              <label className="label" htmlFor="companySearch">Company name or ABN</label>
              <input
                id="companySearch"
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Harbour, Cafe, or 51 824"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn-primary">
              Search ABR
            </button>
          </form>
        )}

        {phase === "results" && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-white">
              {results.length === 0 ? "No matches" : "Select a company"}
            </p>
            {results.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">
                Try Harbour, Cafe, Dental, Retail, Bakery, or an ABN from the demo list.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {results.map((row) => (
                  <li key={row.abn}>
                    <button
                      type="button"
                      className="choice-card w-full text-left"
                      onClick={() => {
                        setSelected(row);
                        setPhase("confirm");
                      }}
                    >
                      <span>
                        <strong className="text-white">{row.legalName}</strong>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          ABN {row.abn} · {row.state} {row.postcode} · {row.entityStatus}
                          {row.gstRegistered ? " · GST registered" : " · Not GST registered"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn-secondary mt-4" onClick={() => setPhase("search")}>
              Back to search
            </button>
          </div>
        )}

        {phase === "confirm" && selected && (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-semibold text-white">These details will be filled in</p>
            <dl className="rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-3 text-sm text-slate-200">
              <div className="flex justify-between gap-4 py-1">
                <dt className="text-slate-400">Business name</dt>
                <dd className="font-semibold text-white">{selected.legalName}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <dt className="text-slate-400">ABN</dt>
                <dd className="text-white">{selected.abn}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <dt className="text-slate-400">GST</dt>
                <dd className="text-white">{selected.gstRegistered ? "Registered" : "Not registered"}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <dt className="text-slate-400">Status</dt>
                <dd className="text-white">
                  {selected.entityStatus} · {selected.state} {selected.postcode}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={confirm}>
                Confirm
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPhase("results")}>
                Back to matches
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-slate-400">
          <Link href={returnTo} className="font-semibold text-brand-300 hover:underline">
            Cancel
          </Link>
          {" "}and return without changing details.
        </p>
      </div>
    </div>
  );
}
