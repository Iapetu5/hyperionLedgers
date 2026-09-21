"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AbrCompany } from "@/lib/abn";

type Props = {
  selected: AbrCompany | null;
  onSelect: (company: AbrCompany | null) => void;
};

export function CompanySearch({ selected, onSelect }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AbrCompany[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!selected) inputRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/abr/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as { results?: AbrCompany[]; error?: string };
        if (!res.ok) {
          setError(data.error || "Search is unavailable right now.");
          setResults([]);
          return;
        }
        setError(null);
        setResults(data.results ?? []);
        setActiveIndex(0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Could not search the register. Try again.");
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">
          Selected from the register. Check the details below, then confirm.
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
        className="input !px-4 !py-4 !text-lg"
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
            onSelect(results[activeIndex]);
          } else if (e.key === "Escape") {
            setResults([]);
          }
        }}
      />
      <p className="mt-2 text-xs text-slate-400">
        Type at least two letters. Results update as you type from a simulated ABR lookup — not a live
        ABR connection.
      </p>
      {busy && <p className="mt-2 text-sm text-slate-300">Searching…</p>}
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      {!busy && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-slate-300">
          No register matches for that search. Use manual entry below.
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
                  onClick={() => onSelect(row)}
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
