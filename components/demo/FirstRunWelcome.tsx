"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileSignature, FileText, Receipt, X } from "lucide-react";
import { clearUserOrganisationDocs } from "@/lib/user-docs";

const DISMISS_KEY = "hl_first_run_welcome_dismissed_v1";

/**
 * Short post-onboarding / first-session card: create invoice, quote, or bill.
 * Shows when URL has ?welcome=1, or when forceShow is true (empty overview).
 */
export function FirstRunWelcome({
  orgName,
  forceShow = false,
}: {
  orgName?: string;
  /** When true (e.g. blank overview with zero docs), show until dismissed. */
  forceShow?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("welcome") === "1";
    if (fromUrl) {
      clearUserOrganisationDocs();
      params.delete("welcome");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
      setVisible(true);
      return;
    }
    if (!forceShow) {
      setVisible(false);
      return;
    }
    try {
      setVisible(sessionStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, [forceShow]);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  const label = orgName?.trim() || "your organisation";

  return (
    <div className="card relative overflow-hidden border-brand-400/35 bg-gradient-to-br from-brand-500/15 via-white/[0.06] to-fuchsia-500/15 p-5 shadow-glow">
      <button
        type="button"
        className="absolute right-3 top-3 rounded-lg border border-white/15 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        onClick={dismiss}
        aria-label="Dismiss welcome"
      >
        <X size={14} />
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
        First two minutes
      </p>
      <h2 className="mt-1 pr-8 text-lg font-semibold text-white sm:text-xl">
        Create your first document for {label}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-300">
        Pick one path to get started. Each opens with a ready-made example you can edit — add products and banking later.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link
          href="/demo/invoices?mixed=1"
          className="btn-primary justify-center"
        >
          <FileText size={16} />
          Invoice
          <ArrowRight size={14} />
        </Link>
        <Link
          href="/demo/quotes?mixed=1"
          className="btn-secondary justify-center"
        >
          <FileSignature size={16} />
          Quote
        </Link>
        <Link
          href="/demo/bills?mixed=1"
          className="btn-secondary justify-center"
        >
          <Receipt size={16} />
          Bill
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Prefer a full sample tour first? Use{" "}
        <span className="text-slate-400">Explore Harbour &amp; Co sample</span> anytime from empty screens.
      </p>
    </div>
  );
}
