"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AbrCompany } from "@/lib/abn";
import {
  abrEmptyResultsMessage,
  enrichAbrCompany,
  useAbrSearch,
} from "@/components/company/useAbrSearch";

type Props = {
  selected: AbrCompany | null;
  onSelect: (company: AbrCompany | null) => void;
};

export function CompanySearch({ selected, onSelect }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { results, busy, error, simulated } = useAbrSearch(query, !selected);

  useEffect(() => {
    if (!selected) inputRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  async function pick(company: AbrCompany) {
    onSelect(company);
    const enriched = await enrichAbrCompany(company);
    if (
      enriched.address !== company.address ||
      enriched.gstRegistered !== company.gstRegistered ||
      enriched.legalName !== company.legalName
    ) {
      onSelect(enriched);
    }
  }

  if (selected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">
          {selected.simulated
            ? "Selected from the practice list. Check the details below, then confirm."
            : "Selected from the Australian Business Register. Check the details below, then confirm."}
        </p>
        <button
          type="button"
          className="text-sm font-semibold text-brand-300 hover:underline"
          onClick={() => {
            onSelect(null);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          Search again
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="company-search" className="label">
        Search by business name or ABN
      </label>
      <input
        ref={inputRef}
        id="company-search"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Example Cafe or 51 824 753 556"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={query.trim().length >= 2 && (results.length > 0 || busy || Boolean(error))}
        aria-busy={busy}
        aria-controls={listId}
        aria-describedby="company-search-help"
        aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            void pick(results[activeIndex]);
          } else if (e.key === "Escape") {
            setQuery("");
          }
        }}
      />
      <p id="company-search-help" className="mt-2 text-xs text-slate-400">
        Type at least two letters, then pick your business from the list.
        {simulated
          ? " This is a practice register — you can still enter the details yourself."
          : " Matches come from the Australian Business Register."}
      </p>
      {query.trim().length === 0 && (
        <p className="mt-3 text-sm text-slate-300">
          Start with the name on your invoices, or the 11-digit ABN. Example: type{" "}
          <span className="text-slate-200">cafe</span> or{" "}
          <span className="text-slate-200">51 824 753 556</span>.
        </p>
      )}
      {query.trim().length === 1 && (
        <p className="mt-3 text-sm text-slate-300">Type one more letter to search.</p>
      )}
      {busy && (
        <p className="mt-2 text-sm text-slate-300" aria-live="polite">
          Searching…
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-rose-300" role="alert">
          {error} You can try again, or enter the details yourself below.
        </p>
      )}
      {!busy && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-slate-300" role="status">
          {abrEmptyResultsMessage(query)}
        </p>
      )}
      {results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching companies"
          className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/30"
        >
          {results.map((row, index) => {
            const active = index === activeIndex;
            return (
              <li key={row.abn} role="option" id={`${listId}-${index}`} aria-selected={active}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 text-left transition ${
                    active ? "bg-brand-500/15" : "hover:bg-white/5"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void pick(row)}
                >
                  <p className="font-semibold text-white">{row.legalName}</p>
                  <p className="mt-0.5 text-sm text-slate-300">
                    ABN {row.abn} · {row.entityType} · {row.entityStatus}
                    {row.gstRegistered ? " · GST registered" : " · Not GST registered"}
                  </p>
                  {row.address && <p className="mt-0.5 text-xs text-slate-400">{row.address}</p>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
