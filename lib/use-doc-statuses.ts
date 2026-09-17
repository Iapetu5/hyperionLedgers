"use client";

import { useCallback, useEffect, useState } from "react";
import { getInvoiceStatus, getQuoteStatus } from "@/lib/public-docs";

/** Re-read invoice/quote/bill status overrides when localStorage or status events fire. */
export function useDocStatusTick() {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const onCustom = () => bump();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("doc_status") || e.key.includes("public_doc")) bump();
    };
    window.addEventListener("hl-doc-status", onCustom);
    window.addEventListener("hl-user-docs-updated", onCustom);
    window.addEventListener("storage", onStorage);
    // same-tab focus refresh
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("hl-doc-status", onCustom);
      window.removeEventListener("hl-user-docs-updated", onCustom);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", bump);
    };
  }, [bump]);

  return tick;
}

export function invoiceStatus(id: string, fallback: string) {
  return getInvoiceStatus(id, fallback);
}

export function quoteStatus(id: string, fallback: string) {
  return getQuoteStatus(id, fallback);
}
