"use client";

import { useEffect, useState } from "react";
import type { AbrCompany } from "@/lib/abn";
import { digitsOnlyAbn } from "@/lib/abn";

export type AbrSearchState = {
  results: AbrCompany[];
  busy: boolean;
  error: string | null;
  simulated: boolean;
};

export function useAbrSearch(query: string, enabled = true): AbrSearchState {
  const [results, setResults] = useState<AbrCompany[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(true);

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
        };
        if (!res.ok) {
          setError(data.error || "Search is unavailable right now.");
          setResults([]);
          return;
        }
        setError(null);
        setResults(data.results ?? []);
        setSimulated(data.simulated !== false);
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
  }, [query, enabled]);

  return { results, busy, error, simulated };
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
