"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { openAssistant } from "@/components/demo/AiAssistant";
import { formatAUD, todayISO } from "@/lib/format";
import { bills, invoices, quotes } from "@/lib/sample-data";
import { invoiceStatus, quoteStatus, useDocStatusTick } from "@/lib/use-doc-statuses";
import {
  effectiveInvoiceStatus,
  effectiveQuoteStatus,
  effectiveSampleBillStatus,
  type UserInvoice,
  type UserQuote,
} from "@/lib/user-docs";

const ASK = "What should I do next with cash and overdue items?";

export function NextActionBanner() {
  const tick = useDocStatusTick();
  /** Gate localStorage overrides until after mount so SSR HTML matches first client paint. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const insight = useMemo(() => {
    const invStored = (id: string, fallback: string) =>
      mounted
        ? (invoiceStatus(id, fallback) as UserInvoice["status"])
        : (fallback as UserInvoice["status"]);
    const quoteStored = (id: string, fallback: string) =>
      mounted
        ? (quoteStatus(id, fallback) as UserQuote["status"])
        : (fallback as UserQuote["status"]);
    const billDisplay = (id: string, fallback: string, dueDate: string) => {
      if (mounted) return effectiveSampleBillStatus(id, fallback, dueDate);
      if (fallback === "Paid") return "Paid";
      const today = todayISO();
      if (dueDate < today) return "Overdue";
      if (fallback === "Overdue") return "Approved";
      return fallback;
    };

    const overdueBills = bills.filter(
      (b) => billDisplay(b.id, b.status, b.dueDate) === "Overdue",
    );
    const overdueBillsTotal = overdueBills.reduce((sum, b) => sum + b.amount, 0);

    const overdueInvoices = invoices.filter((inv) => {
      const stored = invStored(inv.id, inv.status);
      return effectiveInvoiceStatus({ status: stored, dueDate: inv.dueDate }) === "Overdue";
    });
    const chase =
      overdueInvoices.find((i) => i.id === "INV-1038") ?? overdueInvoices[0];

    const quotesAwaiting = quotes.filter((q) => {
      const stored = quoteStored(q.id, q.status);
      return effectiveQuoteStatus({ status: stored, expiryDate: q.expiryDate }) === "Sent";
    }).length;
    const quotesExpired = quotes.filter((q) => {
      const stored = quoteStored(q.id, q.status);
      return effectiveQuoteStatus({ status: stored, expiryDate: q.expiryDate }) === "Expired";
    }).length;

    let text: string;
    if (overdueBills.length > 0 && chase) {
      text = `Cash looks healthy — clear overdue bills (${formatAUD(overdueBillsTotal)}) and chase ${chase.contact} on ${chase.id}.`;
    } else if (overdueBills.length > 0) {
      text = `Cash looks healthy — clear overdue bills (${formatAUD(overdueBillsTotal)}) across ${overdueBills.length} supplier${overdueBills.length === 1 ? "" : "s"}.`;
    } else if (chase) {
      text = `Cash looks healthy — chase ${chase.contact} on overdue ${chase.id} (${formatAUD(chase.amount)}).`;
    } else if (quotesAwaiting > 0) {
      text = `Payables and overdue receivables look clear — ${quotesAwaiting} quote${quotesAwaiting === 1 ? "" : "s"} still awaiting a reply.`;
    } else if (quotesExpired > 0) {
      text = `Cash and overdue items look clear — ${quotesExpired} expired quote${quotesExpired === 1 ? "" : "s"} could be refreshed or archived.`;
    } else {
      text =
        "Cash and overdue items look clear — categorise bank lines or review the BAS draft when you're ready.";
    }

    return {
      text,
      overdueBills: overdueBills.length,
      overdueInvoices: overdueInvoices.length,
      quotesAwaiting,
      quotesExpired,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, mounted]);

  return (
    <div className="card border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-white/[0.06] to-fuchsia-500/15 p-5 shadow-glow">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Next action</p>
      <p className="mt-1 text-lg font-semibold leading-snug text-white sm:text-xl">{insight.text}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {insight.overdueBills > 0 ? (
          <Link href="/demo/bills" className="btn-primary">
            Review overdue bills
            <ArrowRight size={16} />
          </Link>
        ) : null}
        {insight.overdueInvoices > 0 ? (
          <Link
            href="/demo/invoices"
            className={insight.overdueBills > 0 ? "btn-secondary" : "btn-primary"}
          >
            Chase overdue invoice
            {insight.overdueBills > 0 ? null : <ArrowRight size={16} />}
          </Link>
        ) : null}
        {insight.overdueBills === 0 &&
        insight.overdueInvoices === 0 &&
        insight.quotesAwaiting > 0 ? (
          <Link href="/demo/quotes" className="btn-primary">
            Review quotes awaiting
            <ArrowRight size={16} />
          </Link>
        ) : null}
        {insight.overdueBills === 0 &&
        insight.overdueInvoices === 0 &&
        insight.quotesAwaiting === 0 &&
        insight.quotesExpired > 0 ? (
          <Link href="/demo/quotes" className="btn-primary">
            Review expired quotes
            <ArrowRight size={16} />
          </Link>
        ) : null}
        {insight.overdueBills === 0 &&
        insight.overdueInvoices === 0 &&
        insight.quotesAwaiting === 0 &&
        insight.quotesExpired === 0 ? (
          <Link href="/demo/invoices" className="btn-primary">
            Review invoices
            <ArrowRight size={16} />
          </Link>
        ) : null}
        <button type="button" className="btn-secondary" onClick={() => openAssistant(ASK)}>
          <Sparkles size={16} />
          Ask AI: what next?
        </button>
      </div>
    </div>
  );
}
