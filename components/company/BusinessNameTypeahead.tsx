"use client";

import { useId, useState } from "react";
import type { AbrCompany } from "@/lib/abn";
import {
  abrEmptyResultsMessage,
  enrichAbrCompany,
  useAbrSearch,
} from "@/components/company/useAbrSearch";

type Props = {
  id?: string;
  label?: string;
  hint?: string;
  value: string;
  onChange: (name: string) => void;
  onSelect?: (company: AbrCompany) => void;
  placeholder?: string;
  invalid?: boolean;
};

export function BusinessNameTypeahead({
  id = "businessName",
  label = "Business name",
  hint,
  value,
  onChange,
  onSelect,
  placeholder = "e.g. Example Cafe Pty Ltd",
  invalid = false,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [picked, setPicked] = useState<AbrCompany | null>(null);
  const { results, busy, error, simulated } = useAbrSearch(value, open);

  async function pick(company: AbrCompany) {
    onChange(company.legalName);
    setOpen(false);
    setPicked(company);
    onSelect?.(company);
    const enriched = await enrichAbrCompany(company);
    if (
      enriched.address !== company.address ||
      enriched.gstRegistered !== company.gstRegistered ||
      enriched.legalName !== company.legalName
    ) {
      onChange(enriched.legalName);
      setPicked(enriched);
      onSelect?.(enriched);
    }
  }

  const longEnough = open && value.trim().length >= 2;
  const showList = longEnough && results.length > 0;
  const showEmpty = longEnough && !busy && !error && results.length === 0;

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-busy={busy}
        aria-invalid={invalid}
        aria-controls={listId}
        aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setPicked(null);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(e) => {
          if (!results.length || !open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
          } else if (e.key === "Enter" && results[activeIndex]) {
            e.preventDefault();
            void pick(results[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <p className="mt-1 text-xs text-slate-400">
        {hint ||
          (simulated
            ? "Type the name or ABN. Pick a match to fill the company, or keep typing it yourself."
            : "Type the name or ABN. Pick an Australian Business Register match to fill the company.")}
      </p>
      {picked && picked.legalName === value && (
        <p className="mt-1 text-xs text-slate-300">
          Filled ABN {picked.abn}
          {picked.gstRegistered ? " · GST registered" : " · Not GST registered"}
          . You can edit any field.
        </p>
      )}
      {busy && (
        <p className="mt-1 text-sm text-slate-300" aria-live="polite">
          Searching…
        </p>
      )}
      {error && (
        <p className="mt-1 text-sm text-rose-300" role="alert">
          {error} You can keep typing the name yourself.
        </p>
      )}
      {showEmpty && (
        <p className="mt-1 text-sm text-slate-300" role="status">
          {abrEmptyResultsMessage(value)}
        </p>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching companies"
          className="mt-2 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/30"
        >
          {results.map((row, index) => {
            const active = index === activeIndex;
            return (
              <li key={row.abn} role="option" id={`${listId}-${index}`} aria-selected={active}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm transition ${
                    active ? "bg-brand-500/15" : "hover:bg-white/5"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void pick(row)}
                >
                  <p className="font-semibold text-white">{row.legalName}</p>
                  <p className="text-xs text-slate-300">
                    ABN {row.abn} · {row.entityType}
                    {row.gstRegistered ? " · GST registered" : " · Not GST registered"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
