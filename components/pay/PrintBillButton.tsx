"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD, formatDateAU } from "@/lib/format";
import { docLineTaxLabel } from "@/lib/public-docs";
import { DEMO_ORG, bills as sampleBills } from "@/lib/sample-data";
import {
  GUEST_DEMO_BUSINESS_NAME,
  effectiveBillStatus,
  effectiveSampleBillStatus,
  getUserBill,
  type UserBill,
} from "@/lib/user-docs";

function resolveBillBusiness(): { businessName: string; businessAbn: string } {
  if (typeof window === "undefined") {
    return { businessName: GUEST_DEMO_BUSINESS_NAME, businessAbn: "" };
  }
  try {
    const sessionRaw = localStorage.getItem("hl_demo_session_v1");
    const accountsRaw = localStorage.getItem("hl_demo_accounts_v1");
    if (!sessionRaw || !accountsRaw) {
      return { businessName: GUEST_DEMO_BUSINESS_NAME, businessAbn: "" };
    }
    const session = JSON.parse(sessionRaw) as { accountId?: string; email?: string };
    const accounts = JSON.parse(accountsRaw) as Array<{
      id: string;
      email: string;
      businessName?: string;
      abn?: string;
    }>;
    const account =
      accounts.find((a) => a.id === session.accountId) ||
      accounts.find((a) => a.email === session.email);
    if (account?.businessName && account.businessName !== DEMO_ORG.name) {
      return { businessName: account.businessName, businessAbn: account.abn || "" };
    }
  } catch {
    /* fall through */
  }
  return { businessName: GUEST_DEMO_BUSINESS_NAME, businessAbn: "" };
}

/** User bill first; else Harbour sample bill (internal print only — no public pay route). */
function resolveBillForPrint(id: string): { bill: UserBill; sample: boolean } | null {
  const user = getUserBill(id);
  if (user) return { bill: user, sample: false };

  const sample = sampleBills.find((b) => b.id === id);
  if (!sample) return null;

  const status = effectiveSampleBillStatus(
    sample.id,
    sample.status,
    sample.dueDate,
  ) as UserBill["status"];

  return {
    sample: true,
    bill: {
      id: sample.id,
      supplier: sample.supplier,
      date: sample.date,
      dueDate: sample.dueDate,
      amount: sample.amount,
      gst: sample.gst,
      status,
      category: sample.category,
      lineItems: "lineItems" in sample ? sample.lineItems : undefined,
    },
  };
}

function BillSummaryView({
  bill,
  sample,
}: {
  bill: UserBill;
  sample: boolean;
}) {
  const biz = sample
    ? { businessName: DEMO_ORG.name, businessAbn: DEMO_ORG.abn }
    : bill.businessName
      ? { businessName: bill.businessName, businessAbn: bill.businessAbn || "" }
      : resolveBillBusiness();
  const status = sample ? bill.status : effectiveBillStatus(bill);
  const exGst = Math.round((bill.amount - bill.gst) * 100) / 100;
  const lines =
    bill.lineItems && bill.lineItems.length > 0
      ? bill.lineItems.map((li) => {
          const qty = Number.isFinite(li.qty) && li.qty > 0 ? li.qty : 1;
          const amount = Number.isFinite(li.amount) ? li.amount : 0;
          const unit =
            Number.isFinite(li.unitPrice) && li.unitPrice > 0
              ? li.unitPrice
              : amount > 0
                ? Math.round((amount / qty) * 100) / 100
                : 0;
          return { ...li, qty, amount, unitPrice: unit };
        })
      : [
          {
            description: bill.category || "Supplier bill",
            qty: 1,
            unitPrice: exGst,
            amount: exGst,
            taxRate: bill.gst > 0 ? ("GST" as const) : ("GST-free" as const),
          },
        ];

  return (
    <div className="tax-doc-sheet bg-transparent text-slate-900">
      <div className="doc-header -mx-6 -mt-6 flex flex-wrap items-start justify-between gap-4 print:mx-0 print:mt-0">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
            HyperionInvoices
          </p>
          <p className="mt-1 text-base font-semibold">{biz.businessName}</p>
          <p className="text-sm text-white/70">
            {biz.businessAbn ? <>ABN {biz.businessAbn}</> : "ABN not set"}
          </p>
          <p className="mt-1 text-xs text-cyan-200/80">
            Internal bill summary · not a customer pay page
            {sample ? " · Harbour sample" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Supplier bill</p>
          <p className="text-xl font-bold text-white">{bill.id}</p>
          <div className="mt-2 flex justify-end">
            <StatusBadge status={String(status)} tone="header" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-x-5 gap-y-3.5 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Supplier</p>
          <p className="mt-0.5 break-words font-semibold">{bill.supplier}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</p>
          <p className="mt-0.5 break-words font-medium">{bill.category}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bill date</p>
          <p className="mt-0.5 font-medium">{formatDateAU(bill.date)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due date</p>
          <p className="mt-0.5 font-medium">{formatDateAU(bill.dueDate)}</p>
        </div>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2">Qty</th>
            <th className="py-2 pr-2 text-right">Unit (ex tax)</th>
            <th className="py-2 pr-2">Tax</th>
            <th className="py-2 text-right">Amount (ex tax)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((li, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 pr-2">{li.description}</td>
              <td className="py-2 pr-2">{li.qty}</td>
              <td className="py-2 pr-2 text-right">{formatAUD(li.unitPrice)}</td>
              <td className="py-2 pr-2 text-xs text-slate-600">
                {docLineTaxLabel(li.taxRate, "expense")}
              </td>
              <td className="py-2 text-right">{formatAUD(li.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal (ex tax)</span>
          <span>{formatAUD(exGst)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Total GST</span>
          <span>{formatAUD(bill.gst)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatAUD(bill.amount)}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Back-office summary only — no public pay link. Line amounts are tax-exclusive (GST on Expenses / GST Free
        Expenses).
      </p>
    </div>
  );
}

/** Internal bill print — no public /pay route. Works for user bills and Harbour sample IDs. */
export function PrintBillButton({
  id,
  compact,
  primary,
}: {
  id: string;
  compact?: boolean;
  /** Emphasise Print after Mark paid so it stays the obvious next step */
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [bill, setBill] = useState<UserBill | null>(null);
  const [sample, setSample] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function openPrint() {
    const resolved = resolveBillForPrint(id);
    setBill(resolved?.bill ?? null);
    setSample(resolved?.sample ?? false);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className={
          primary
            ? compact
              ? "btn-primary !px-2 !py-1 text-xs"
              : "btn-primary"
            : compact
              ? "btn-secondary !px-2 !py-1 text-xs"
              : "btn-secondary"
        }
        onClick={openPrint}
        title="Print internal bill summary (no public pay link)"
      >
        <Printer size={compact ? 12 : 16} />
        Print
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 print:static print:inset-auto print:bg-transparent print:p-0">
            <div className="relative my-6 w-full max-w-2xl print:my-0 print:max-w-none">
              <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  Bill summary (internal{sample ? " · Harbour sample" : ""})
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => window.print()}
                    disabled={!bill}
                  >
                    <Printer size={16} />
                    Print / PDF
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
              </div>
              <div
                id="tax-doc-print"
                className="doc-card overflow-hidden p-0 print:rounded-none print:border print:border-slate-300 print:shadow-none"
              >
                {bill ? (
                  <div className="p-6 print:p-0">
                    <BillSummaryView bill={bill} sample={sample} />
                  </div>
                ) : (
                  <p className="p-6 text-sm text-slate-600">Bill not found in this browser.</p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
