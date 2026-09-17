"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { openAssistant } from "@/components/demo/AiAssistant";
import { formatAUD } from "@/lib/format";
import { bills, invoices } from "@/lib/sample-data";
import { invoiceStatus, useDocStatusTick } from "@/lib/use-doc-statuses";
import {
  effectiveInvoiceStatus,
  effectiveSampleBillStatus,
  type UserInvoice,
} from "@/lib/user-docs";

const ASK = "What should I do next with cash and overdue items?";

export function NextActionBanner() {
  const tick = useDocStatusTick();

  const insight = useMemo(() => {
    const overdueBillsTotal = bills
      .filter((b) => effectiveSampleBillStatus(b.id, b.status, b.dueDate) === "Overdue")
      .reduce((sum, b) => sum + b.amount, 0);

    const overdueInvoices = invoices.filter((inv) => {
      const stored = invoiceStatus(inv.id, inv.status) as UserInvoice["status"];
      return effectiveInvoiceStatus({ status: stored, dueDate: inv.dueDate }) === "Overdue";
    });
    const chase =
      overdueInvoices.find((i) => i.id === "INV-1038") ?? overdueInvoices[0];

    const billsPart = `clear overdue bills (${formatAUD(overdueBillsTotal)})`;
    const chasePart = chase
      ? `chase ${chase.contact} on ${chase.id}`
      : "review overdue receivables";

    return `Cash looks healthy — ${billsPart} and ${chasePart}.`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <div className="card border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-white/[0.06] to-fuchsia-500/15 p-5 shadow-glow">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Next action</p>
      <p className="mt-1 text-lg font-semibold leading-snug text-white sm:text-xl">{insight}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/demo/bills" className="btn-primary">
          Review overdue bills
          <ArrowRight size={16} />
        </Link>
        <Link href="/demo/invoices" className="btn-secondary">
          Chase overdue invoice
        </Link>
        <button type="button" className="btn-secondary" onClick={() => openAssistant(ASK)}>
          <Sparkles size={16} />
          Ask AI: what next?
        </button>
      </div>
    </div>
  );
}
