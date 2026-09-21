"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AbrCompany } from "@/lib/abn";
import { describeAbrLookup } from "@/lib/abn";
import { enrichAbrCompany, useAbrSearch } from "@/components/company/useAbrSearch";

type Props = {
  selected: AbrCompany | null;
  onSelect: (company: AbrCompany | null) => void;
  onNeedManual?: (query: string) => void;
};

export function CompanySearch({ selected, onSelect, onNeedManual }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { results, busy, error, simulated, liveConfigured } = useAbrSearch(query, !selected);
  const copy = describeAbrLookup(liveConfigured, selected ? selected.simulated : simulated);

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
        <p className="text-sm text-slate-300">{copy.selected}</p>
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

  const noMatch = !busy && query.trim().length >= 2 && results.length === 0 && !error;
  const liveUnavailable = liveConfigured && simulated && query.trim().length >= 2;

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
        aria-expanded={results.length > 0}
        aria-controls={listId}
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
      <p className="mt-2 text-xs text-slate-400">{copy.searchHelp}</p>
      {query.trim().length === 0 && (
        <p className="mt-3 text-sm text-slate-300">
          Search is optional. You can type the business name, ABN, and type in the form below.
          Example: type <span className="text-slate-200">cafe</span> or{" "}
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
      {liveUnavailable && !error && (
        <p className="mt-2 text-sm text-amber-200" role="status">
          Live Australian Business Register lookup is not available right now. Showing the
          practice list — you can still type the details yourself.
        </p>
      )}
      {noMatch && (
        <p className="mt-3 text-sm text-slate-300" role="status">
          We could not find a business matching “{query.trim()}”. Check the spelling, try the
          ABN, or{" "}
          <button
            type="button"
            className="font-semibold text-brand-300 hover:underline"
            onClick={() => onNeedManual?.(query)}
          >
            enter the details yourself below
          </button>
          .
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
