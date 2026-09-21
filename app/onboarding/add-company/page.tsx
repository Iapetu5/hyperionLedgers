"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { EasyStepBar } from "@/components/easy/EasyStepBar";
import { searchAbrCompanies, type AbrCompany } from "@/lib/abn";
import { saveSelectedCompany, safeAddCompanyReturn } from "@/lib/add-company";

export default function AddCompanyPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/signup");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AbrCompany[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<AbrCompany | null>(null);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("return");
    setReturnTo(safeAddCompanyReturn(raw));
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setResults(searchAbrCompanies(query));
    setSearched(true);
    setSelected(null);
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
        <EasyStepBar
          current={selected ? 2 : 1}
          total={2}
          label={selected ? "Confirm" : "Search"}
        />
        <h1 className="mt-4 text-xl font-bold text-white">Add company</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Search HyperionInvoices&apos; simulated ABR for a company name or ABN, then confirm to fill your details.
          This is a practice lookup — not a live ABR request.
        </p>

        {!selected && (
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

        {!selected && searched && (
          <div className="mt-5">
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
                      onClick={() => setSelected(row)}
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
          </div>
        )}

        {selected && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-3 text-sm text-slate-200">
              <p className="font-semibold text-white">{selected.legalName}</p>
              <p className="mt-1">ABN {selected.abn}</p>
              <p>
                {selected.state} {selected.postcode} · {selected.entityStatus}
                {selected.gstRegistered ? " · GST registered" : " · Not GST registered"}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Confirm to fill business name, ABN, and GST on the previous screen.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={confirm}>
                Confirm
              </button>
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Back to results
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
