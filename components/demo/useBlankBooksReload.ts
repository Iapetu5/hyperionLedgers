"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const BOOKS_EVENTS = [
  "hl-user-docs-updated",
  "hl-books-persistence",
  "hl-doc-status",
  "storage",
] as const;

/**
 * Reload org books after auth persistence is known, and again when it flips
 * to server — avoids the first-paint localStorage empty list for signed-in orgs.
 */
export function useBlankBooksReload(
  reload: () => void | Promise<void>,
  opts?: { includeSample?: boolean },
) {
  const { loading, persistence, usesSampleData, user } = useAuth();
  const ready = !loading && persistence !== "unknown";
  const skip = !opts?.includeSample && usesSampleData;

  useEffect(() => {
    if (!ready || skip) return;
    void Promise.resolve(reload()).catch(() => {
      /* keep last shown books — loaders must not invent an empty list */
    });
    const onUpdate = () => {
      void Promise.resolve(reload()).catch(() => {
        /* keep last shown books */
      });
    };
    for (const ev of BOOKS_EVENTS) window.addEventListener(ev, onUpdate);
    return () => {
      for (const ev of BOOKS_EVENTS) window.removeEventListener(ev, onUpdate);
    };
  }, [ready, skip, persistence, user?.id, reload]);

  return {
    ready,
    loading: loading || !ready,
    usesSampleData,
    persistence,
    user,
  };
}
