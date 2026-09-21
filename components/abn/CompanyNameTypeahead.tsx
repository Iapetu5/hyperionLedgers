"use client";

import Link from "next/link";
import { useMemo } from "react";
import { searchAbrCompanies, type AbrCompany } from "@/lib/abn";

/** Simulated ABR name typeahead. Selecting a match autofills company fields. */
export function CompanyNameTypeahead({
  id = "businessName",
  value,
  onChange,
  onPick,
  returnTo,
  required = false,
}: {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  onPick: (company: AbrCompany) => void;
  returnTo: "/signup" | "/onboarding" | "/demo/account";
  required?: boolean;
}) {
  const suggestions = useMemo(
    () => (value.trim().length >= 2 ? searchAbrCompanies(value).slice(0, 4) : []),
    [value],
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="label" htmlFor={id}>
          Business name
        </label>
        <Link
          href={`/onboarding/add-company?return=${returnTo}`}
          className="text-sm font-semibold text-brand-300 hover:underline"
        >
          Add company
        </Link>
      </div>
      <input
        id={id}
        className="input"
        required={required}
        autoComplete="organization"
        placeholder="Start typing — e.g. Harbour or Cafe"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestions.length > 0 && (
        <ul className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-black/40 text-sm">
          {suggestions.map((row) => (
            <li key={row.abn}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-white/10"
                onClick={() => onPick(row)}
              >
                <span className="font-semibold text-white">{row.legalName}</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  ABN {row.abn}
                  {row.gstRegistered ? " · GST registered" : " · Not GST registered"}
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-white/10">
            <Link
              href={`/onboarding/add-company?return=${returnTo}`}
              className="block px-3 py-2 text-sm font-semibold text-brand-300 hover:bg-white/10"
            >
              Open Add company for full ABR search
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
