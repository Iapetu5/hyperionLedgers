"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, LayoutDashboard, FileText, FileSignature, Receipt, Settings, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { FirstRunWelcome } from "@/components/demo/FirstRunWelcome";
import { NextActionBanner } from "@/components/demo/NextActionBanner";
import { openAssistant } from "@/components/demo/AiAssistant";
import { BasDueDates } from "@/components/bas/BasDueDates";
import { formatAUD } from "@/lib/format";
import { bills, cashForecast, invoices, kpis, quotes, tasks } from "@/lib/sample-data";
import { invoiceStatus, quoteStatus, useDocStatusTick } from "@/lib/use-doc-statuses";
import {
  blankNextInsight,
  effectiveBillStatus,
  effectiveInvoiceStatus,
  effectiveQuoteStatus,
  effectiveSampleBillStatus,
  type UserBill,
  type UserInvoice,
  type UserQuote,
} from "@/lib/user-docs";
import { loadBills, loadInvoices, loadQuotes } from "@/lib/books-client";
import { useBlankBooksReload } from "@/components/demo/useBlankBooksReload";

export default function DemoOverviewPage() {
  const { usesSampleData, user } = useAuth();
  const tick = useDocStatusTick();
  /** Gate localStorage status overrides until after mount (SSR HTML matches first paint). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const live = useMemo(() => {
    const invRows = invoices.map((inv) => ({
      ...inv,
      status: effectiveInvoiceStatus({
        status: (mounted
          ? invoiceStatus(inv.id, inv.status)
          : inv.status) as UserInvoice["status"],
        dueDate: inv.dueDate,
      }),
    }));
    const quoteRows = quotes.map((q) => ({
      ...q,
      status: effectiveQuoteStatus({
        status: (mounted
          ? quoteStatus(q.id, q.status)
          : q.status) as UserQuote["status"],
        expiryDate: q.expiryDate,
      }),
    }));
    const receivables = invRows
      .filter((i) => i.status === "Awaiting payment" || i.status === "Overdue")
      .reduce((sum, i) => sum + i.amount, 0);
    const quotesAwaiting = quoteRows.filter((q) => q.status === "Sent").length;
    const overdueInvoices = invRows.filter((i) => i.status === "Overdue").length;
    const billRows = bills.map((b) => ({
      ...b,
      status: mounted
        ? effectiveSampleBillStatus(b.id, b.status, b.dueDate)
        : effectiveBillStatus({ status: b.status as UserBill["status"], dueDate: b.dueDate }),
    }));
    const unpaidBills = billRows.filter((b) => b.status !== "Paid");
    const overdueBills = unpaidBills.filter((b) => b.status === "Overdue").length;
    const payables = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
    return { receivables, payables, quotesAwaiting, overdueInvoices, overdueBills, invRows, quoteRows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, mounted]);

  // Blank-ledger user docs — KPIs from /api/books when signed in with server persistence.
  const [blankDocs, setBlankDocs] = useState<{
    invoices: UserInvoice[];
    quotes: UserQuote[];
    bills: UserBill[];
  }>({ invoices: [], quotes: [], bills: [] });

  const reloadBlank = useCallback(async () => {
    setBlankDocs({
      invoices: await loadInvoices(),
      quotes: await loadQuotes(),
      bills: await loadBills(),
    });
  }, []);

  const { ready, unresolved } = useBlankBooksReload(reloadBlank);

  const blankLive = useMemo(() => {
    const invRows = blankDocs.invoices.map((inv) => ({
      ...inv,
      status: effectiveInvoiceStatus({
        status: (mounted ? invoiceStatus(inv.id, inv.status) : inv.status) as UserInvoice["status"],
        dueDate: inv.dueDate,
      }),
    }));
    const quoteRows = blankDocs.quotes.map((q) => ({
      ...q,
      status: effectiveQuoteStatus({
        status: (mounted ? quoteStatus(q.id, q.status) : q.status) as UserQuote["status"],
        expiryDate: q.expiryDate,
      }),
    }));
    const billRows = blankDocs.bills.map((b) => ({
      ...b,
      status: effectiveBillStatus({ status: b.status, dueDate: b.dueDate }),
    }));
    const receivables = invRows
      .filter((i) => i.status === "Awaiting payment" || i.status === "Overdue")
      .reduce((sum, i) => sum + i.amount, 0);
    const unpaidBills = billRows.filter((b) => b.status !== "Paid");
    const payables = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
    const overdueInvoices = invRows.filter((i) => i.status === "Overdue");
    const overdueBills = unpaidBills.filter((b) => b.status === "Overdue");
    const quotesAwaiting = quoteRows.filter((q) => q.status === "Sent");
    const quotesExpired = quoteRows.filter((q) => q.status === "Expired");
    const hasDocs =
      blankDocs.invoices.length + blankDocs.quotes.length + blankDocs.bills.length > 0;
    const overdueBillsTotal = overdueBills.reduce((sum, b) => sum + b.amount, 0);
    const chase = overdueInvoices[0];
    const nextInsight = blankNextInsight({
      overdueBillAmounts: overdueBills.map((b) => b.amount),
      overdueInvoice: chase,
      quotesAwaiting: quotesAwaiting.length,
      quotesExpired: quotesExpired.length,
      receivables,
      hasAnyDocs: hasDocs,
    });
    return {
      hasDocs,
      receivables,
      payables,
      overdueInvoices: overdueInvoices.length,
      overdueBills: overdueBills.length,
      overdueBillsTotal,
      quotesAwaiting: quotesAwaiting.length,
      quotesExpired: quotesExpired.length,
      chase,
      nextInsight,
      invCount: blankDocs.invoices.length,
      quoteCount: blankDocs.quotes.length,
      billCount: blankDocs.bills.length,
    };
  }, [blankDocs, mounted]);

  if (!ready) {
    return (
      <div className="card p-6 text-sm text-white/70">
        {unresolved
          ? "Could not confirm where books are stored. Refresh — figures were not replaced."
          : "Loading overview…"}
      </div>
    );
  }

  if (!usesSampleData) {
    const quickLinks = [
      { href: "/demo/invoices?mixed=1", label: "Invoices", icon: FileText, blurb: "Make an invoice" },
      { href: "/demo/quotes?mixed=1", label: "Quotes", icon: FileSignature, blurb: "Make a quote" },
      { href: "/demo/bills?mixed=1", label: "Bills", icon: Receipt, blurb: "Make a bill" },
      { href: "/demo/account", label: "Account", icon: Settings, blurb: "GST, year end, and ABN" },
    ];

    if (!blankLive.hasDocs) {
      return (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Overview</h1>
            <p className="text-sm text-white/70">
              {user?.businessName ?? "Your organisation"} — ready for your first document
            </p>
          </div>
          <FirstRunWelcome orgName={user?.businessName} forceShow />
          <EmptyState
            icon={LayoutDashboard}
            title="Nothing here yet"
            description={`Make an invoice, quote, or bill for ${user?.businessName ?? "your business"}. Cash, receivables, and next-action tips appear after your first document.`}
            actions={[
              { label: "Create invoice", href: "/demo/invoices?mixed=1", primary: true },
              { label: "Create quote", href: "/demo/quotes?mixed=1" },
              { label: "Create bill", href: "/demo/bills?mixed=1" },
              { label: "Account", href: "/demo/account" },
            ]}
            hint="Create an invoice, quote, or bill to fill this overview. Documents you create are saved to your organisation."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="card-inset flex items-start gap-3 p-4 transition hover:bg-white/[0.06]">
                <item.icon size={18} className="mt-0.5 text-cyan-300" />
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
          <BasDueDates compact />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-white/70">
            {user?.businessName ?? "Your organisation"} — your organisation
          </p>
        </div>

        <FirstRunWelcome orgName={user?.businessName} />

        <div className="card border-brand-400/30 bg-gradient-to-br from-brand-500/15 via-white/[0.06] to-fuchsia-500/15 p-5 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Next action</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-white sm:text-xl">{blankLive.nextInsight}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {blankLive.overdueBills > 0 ? (
              <Link href="/demo/bills" className="btn-primary">
                Review overdue bills
                <ArrowRight size={16} />
              </Link>
            ) : null}
            {blankLive.overdueInvoices > 0 ? (
              <Link href="/demo/invoices" className={blankLive.overdueBills > 0 ? "btn-secondary" : "btn-primary"}>
                Chase overdue invoice
                {blankLive.overdueBills > 0 ? null : <ArrowRight size={16} />}
              </Link>
            ) : null}
            {blankLive.overdueBills === 0 &&
            blankLive.overdueInvoices === 0 &&
            blankLive.quotesAwaiting > 0 ? (
              <Link href="/demo/quotes" className="btn-primary">
                Review quotes awaiting
                <ArrowRight size={16} />
              </Link>
            ) : null}
            {blankLive.overdueBills === 0 &&
            blankLive.overdueInvoices === 0 &&
            blankLive.quotesAwaiting === 0 &&
            blankLive.quotesExpired > 0 ? (
              <Link href="/demo/quotes" className="btn-primary">
                Review expired quotes
                <ArrowRight size={16} />
              </Link>
            ) : null}
            {blankLive.overdueBills === 0 &&
            blankLive.overdueInvoices === 0 &&
            blankLive.quotesAwaiting === 0 &&
            blankLive.quotesExpired === 0 ? (
              blankLive.invCount > 0 ? (
                <Link href="/demo/invoices" className="btn-primary">
                  Review invoices
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link href="/demo/invoices?mixed=1" className="btn-primary">
                  Create invoice
                  <ArrowRight size={16} />
                </Link>
              )
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => openAssistant("What should I do next with cash and overdue items?")}
            >
              <Sparkles size={16} />
              Ask AI: what next?
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Receivables", formatAUD(blankLive.receivables)],
            ["Payables", formatAUD(blankLive.payables)],
            ["Quotes awaiting", String(blankLive.quotesAwaiting)],
            ["Overdue", `${blankLive.overdueInvoices} inv · ${blankLive.overdueBills} bill`],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h2 className="font-semibold text-white">Your documents</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/demo/invoices" className="font-medium text-slate-200 hover:underline">
                  {blankLive.invCount} invoice{blankLive.invCount === 1 ? "" : "s"}
                  {blankLive.overdueInvoices > 0 ? (
                    <span className="text-rose-300"> · {blankLive.overdueInvoices} overdue</span>
                  ) : null}
                </Link>
              </li>
              <li>
                <Link href="/demo/quotes" className="font-medium text-slate-200 hover:underline">
                  {blankLive.quoteCount} quote{blankLive.quoteCount === 1 ? "" : "s"}
                  {blankLive.quotesAwaiting > 0 ? (
                    <span className="text-cyan-300"> · {blankLive.quotesAwaiting} awaiting</span>
                  ) : null}
                  {blankLive.quotesExpired > 0 ? (
                    <span className="text-rose-300"> · {blankLive.quotesExpired} expired</span>
                  ) : null}
                </Link>
              </li>
              <li>
                <Link href="/demo/bills" className="font-medium text-slate-200 hover:underline">
                  {blankLive.billCount} bill{blankLive.billCount === 1 ? "" : "s"}
                  {blankLive.overdueBills > 0 ? (
                    <span className="text-rose-300"> · {blankLive.overdueBills} overdue ({formatAUD(blankLive.overdueBillsTotal)})</span>
                  ) : null}
                </Link>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/demo/invoices?mixed=1" className="btn-secondary !px-3 !py-1.5 text-xs">
                Sample invoice
              </Link>
              <Link href="/demo/quotes?mixed=1" className="btn-secondary !px-3 !py-1.5 text-xs">
                Sample quote
              </Link>
              <Link href="/demo/bills?mixed=1" className="btn-secondary !px-3 !py-1.5 text-xs">
                Sample bill
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="card-inset flex items-start gap-3 p-3 transition hover:bg-white/[0.06]">
                  <item.icon size={16} className="mt-0.5 text-cyan-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.blurb}</p>
                  </div>
                </Link>
              ))}
            </div>
            <BasDueDates compact />
          </div>
        </div>
      </div>
    );
  }

  const displayTasks = tasks.flatMap((t) => {
    if (t.id === "t2") {
      if (live.quotesAwaiting <= 0) return [];
      return [{ ...t, text: `${live.quotesAwaiting} quote${live.quotesAwaiting === 1 ? "" : "s"} awaiting reply` }];
    }
    if (t.id === "t3") {
      // Live overdue invoice + bill counts from effective status (not static tasks copy)
      const rows = [];
      if (live.overdueInvoices > 0) {
        rows.push({
          id: "t-od-inv",
          text: `${live.overdueInvoices} overdue invoice${live.overdueInvoices === 1 ? "" : "s"}`,
          href: "/demo/invoices",
          urgent: true,
        });
      }
      if (live.overdueBills > 0) {
        rows.push({
          ...t,
          text: `${live.overdueBills} overdue bill${live.overdueBills === 1 ? "" : "s"}`,
          urgent: true,
        });
      }
      return rows;
    }
    return [t];
  });

  return (
    <div className="space-y-6">
      <NextActionBanner />

      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-white/70">Demo company — sample dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Cash on hand", formatAUD(kpis.cashOnHand)],
          ["Net profit YTD", formatAUD(kpis.netProfitYtd)],
          ["Receivables", formatAUD(live.receivables)],
          ["Payables", formatAUD(live.payables)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h2 className="font-semibold text-white">Cash forecast</h2>
          <div className="mt-4 flex h-40 items-end gap-3">
            {cashForecast.map((p) => {
              const max = Math.max(...cashForecast.map((c) => c.balance));
              const px = Math.max(8, Math.round((p.balance / max) * 128));
              return (
                <div key={p.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full min-h-[8px] rounded-t-md"
                    style={{
                      height: `${px}px`,
                      background: "linear-gradient(to top, #0891b2, #e879f9)",
                    }}
                    title={`${p.label}: $${p.balance.toLocaleString("en-AU")}`}
                  />
                  <span className="text-xs text-slate-400">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold text-white">Tasks</h2>
            <ul className="mt-3 space-y-2">
              {displayTasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.href}
                    className={`text-sm font-medium hover:underline ${t.urgent ? "text-rose-300" : "text-slate-200"}`}
                  >
                    {t.text}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/demo/banking#import" className="btn-secondary mt-4 inline-flex !px-3 !py-1.5 text-xs">
              Import bank CSV
            </Link>
          </div>
          <BasDueDates compact />
        </div>
      </div>
    </div>
  );
}
