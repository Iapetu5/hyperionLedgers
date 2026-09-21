"use client";

import { useEffect, useState } from "react";
import type { AbrCompany } from "@/lib/abn";
import { digitsOnlyAbn } from "@/lib/abn";

export type AbrSearchState = {
  results: AbrCompany[];
  busy: boolean;
  error: string | null;
  simulated: boolean;
  liveConfigured: boolean;
};

/** Empty-list copy for name vs ABN-like queries (spaces ignored). */
export function abrEmptyResultsMessage(query: string): string {
  const q = query.trim();
  const digits = digitsOnlyAbn(q);
  if (/^\d{8,11}$/.test(digits)) {
    return "No business matches that ABN. Check the 11 digits, or enter the details yourself.";
  }
  return `We could not find a business matching “${q}”. Check the spelling, try the ABN, or enter the details yourself.`;
}

export function useAbrSearch(query: string, enabled = true): AbrSearchState {
  const [results, setResults] = useState<AbrCompany[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(true);
  const [liveConfigured, setLiveConfigured] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setBusy(false);
      setError(null);
      return;
    }

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
        const data = (await res.json()) as {
          results?: AbrCompany[];
          error?: string;
          simulated?: boolean;
          liveConfigured?: boolean;
        };
        if (!res.ok) {
          setError(data.error || "Search is unavailable right now.");
          setResults([]);
          setLiveConfigured(data.liveConfigured === true);
          return;
        }
        setError(null);
        setResults(data.results ?? []);
        setSimulated(data.simulated !== false);
        setLiveConfigured(data.liveConfigured === true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Could not search just now. Try again.");
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return { results, busy, error, simulated, liveConfigured };
}

/** Fetch ABN details after a name match so GST / address fill when ABR has them. */
export async function enrichAbrCompany(company: AbrCompany): Promise<AbrCompany> {
  const digits = digitsOnlyAbn(company.abn);
  if (digits.length !== 11) return company;
  try {
    const res = await fetch(`/api/abr/search?q=${encodeURIComponent(digits)}`, { cache: "no-store" });
    const data = (await res.json()) as { results?: AbrCompany[] };
    const row = data.results?.[0];
    if (!row) return company;
    return {
      ...company,
      ...row,
      legalName: row.legalName || company.legalName,
      entityType: row.entityType || company.entityType,
      address: row.address || company.address,
    };
  } catch {
    return company;
  }
}
