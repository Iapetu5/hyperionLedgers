"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrintableDocActions } from "@/components/pay/PrintableDocActions";
import { formatAUD, formatDateAU } from "@/lib/format";
import {
  docLineTaxLabel,
  getPublicInvoice,
  getPublicQuote,
  getSsrSafePublicInvoice,
  getSsrSafePublicQuote,
  type PublicInvoice,
  type PublicQuote,
  setPublicDocStatus,
} from "@/lib/public-docs";
import { DEMO_ORG } from "@/lib/sample-data";

function loadDoc(kind: "invoice" | "quote", id: string): PublicInvoice | PublicQuote | null {
  return kind === "invoice" ? getPublicInvoice(id) : getPublicQuote(id);
}

/** Sample-only — matches server HTML (no localStorage / status overrides). */
function loadSsrSafe(kind: "invoice" | "quote", id: string): PublicInvoice | PublicQuote | null {
  return kind === "invoice" ? getSsrSafePublicInvoice(id) : getSsrSafePublicQuote(id);
}

export function CustomerDocPage({
  kind,
  id,
}: {
  kind: "invoice" | "quote";
  id: string;
}) {
  // SSR + first client paint: sample docs only so hydration matches.
  // User-created docs (localStorage) resolve after mount.
  const [doc, setDoc] = useState<PublicInvoice | PublicQuote | null>(() => loadSsrSafe(kind, id));
  const [clientReady, setClientReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const path =
      kind === "invoice"
        ? `/api/public/invoice/${encodeURIComponent(id)}`
        : `/api/public/quote/${encodeURIComponent(id)}`;
    const isUserDoc = id.startsWith("INV-U") || id.startsWith("QU-U");
    if (isUserDoc) {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch(path, { cache: "no-store" });
          const data = (await res.json().catch(() => ({}))) as { doc?: PublicInvoice | PublicQuote | null };
          if (data.doc) {
            setDoc(data.doc);
            return;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    const local = loadDoc(kind, id);
    if (local) {
      setDoc(local);
      return;
    }
    if (!isUserDoc) {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch(path, { cache: "no-store" });
          const data = (await res.json().catch(() => ({}))) as { doc?: PublicInvoice | PublicQuote | null };
          if (data.doc) {
            setDoc(data.doc);
            return;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        const again = loadDoc(kind, id);
        if (again) {
          setDoc(again);
          return;
        }
      }
    }
    setDoc(null);
  }, [kind, id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await reload();
      if (!cancelled) setClientReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Optional ?print=1 — read from window, never useSearchParams (avoids Suspense hang)
  useEffect(() => {
    if (!doc || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      const t = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(t);
    }
  }, [doc]);

  if (!doc && !clientReady) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <BrandLogo className="mb-6 justify-center no-print" />
        <div className="card p-6">
          <h1 className="text-xl font-bold text-white">Loading document…</h1>
          <p className="mt-2 text-sm text-slate-300">
            {kind === "invoice"
              ? "Opening your pay link."
              : "Opening your customer quote link."}
          </p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <BrandLogo className="mb-6 justify-center no-print" />
        <div className="card p-6">
          <h1 className="text-xl font-bold text-white">Document not found</h1>
          <p className="mt-2 text-sm text-slate-300">
            This {kind} was not found. If you just created it, wait a moment and refresh — signed-in
            invoices are saved to your organisation. Guest demo docs stay in this browser.
          </p>
          <Link href="/demo" className="btn-primary mt-4 inline-flex no-print">
            Back to demo
          </Link>
        </div>
      </div>
    );
  }

  const paidLike = doc.status === "Paid" || doc.status === "Accepted";
  const declined = doc.status === "Declined";
  const expired = doc.status === "Expired";
  const isDraft = doc.status === "Draft";
  const dueOrExpiry =
    kind === "invoice"
      ? (doc as PublicInvoice).dueDate
      : (doc as PublicQuote).expiryDate;
  const exGst = Math.round((doc.amount - doc.gst) * 100) / 100;

  function act(status: string, message: string) {
    void (async () => {
      if (doc?.fromUser) {
        try {
          const path =
            kind === "invoice"
              ? `/api/public/invoice/${encodeURIComponent(id)}/status`
              : `/api/public/quote/${encodeURIComponent(id)}/status`;
          const res = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          const data = (await res.json().catch(() => ({}))) as { doc?: PublicInvoice | PublicQuote };
          if (data.doc) {
            setDoc(data.doc);
            setNote(message);
            return;
          }
        } catch {
          /* local fallback below */
        }
      }
      setPublicDocStatus(kind, id, status);
      setNote(message);
      reload();
    })();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 no-print">
        <BrandLogo href="/" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold leading-snug text-cyan-100 sm:px-3 sm:text-xs">
            {kind === "invoice"
              ? "Demo pay page — no real payments"
              : paidLike || declined || expired || isDraft
                ? "Demo quote page — view only"
                : "Demo quote page — accept/decline only"}
          </span>
          <PrintableDocActions />
        </div>
      </div>

      <div
        className="doc-card overflow-hidden print:rounded-none print:border print:border-slate-300 print:shadow-none"
        id="tax-doc-print"
      >
        <div className="doc-header">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
                HyperionInvoices
              </p>
              <p className="mt-1 text-sm text-white/70">{doc.businessName}</p>
              <p className="text-xs text-white/50">
                {doc.businessAbn ? <>ABN {doc.businessAbn}</> : "ABN not set"}
              </p>
              {doc.suburb ? (
                <p className="mt-1 text-xs text-white/40">
                  {doc.suburb} {doc.state} {doc.postcode}
                </p>
              ) : doc.fromUser ? (
                <p className="mt-1 text-xs text-white/40">Demo document · no street address on file</p>
              ) : null}
              {!doc.fromUser ? (
                <p className="mt-1 text-[10px] text-white/35">
                  Fictional sample trading name: {DEMO_ORG.tradingName}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                {kind === "invoice" ? "Tax Invoice" : "Quote"}
              </p>
              <p className="text-lg font-bold">{doc.id}</p>
              <div className="mt-2 flex justify-end">
                <StatusBadge status={doc.status} tone="header" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 print:p-6">
          <div className="grid gap-x-5 gap-y-3.5 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                {kind === "invoice" ? "Bill to" : "Quote for"}
              </p>
              <p className="mt-0.5 break-words font-semibold text-slate-900">{doc.contact}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference</p>
              <p className="mt-0.5 break-words font-medium text-slate-900">{doc.reference}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Issue date</p>
              <p className="mt-0.5 font-medium text-slate-900">{formatDateAU(doc.issueDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                {kind === "invoice" ? "Due date" : "Expiry"}
              </p>
              <p className="mt-0.5 font-medium text-slate-900">{formatDateAU(dueOrExpiry)}</p>
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2 text-right">Unit (ex tax)</th>
                <th className="py-2">Tax</th>
                <th className="py-2 text-right">Amount (ex tax)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {doc.lineItems.map((li, i) => (
                <tr key={i} className="text-slate-800">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2">{li.qty}</td>
                  <td className="py-2 text-right">{formatAUD(li.unitPrice)}</td>
                  <td className="py-2 text-xs text-slate-600">{docLineTaxLabel(li.taxRate)}</td>
                  <td className="py-2 text-right">{formatAUD(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (ex tax)</span>
              <span>{formatAUD(exGst)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total GST</span>
              <span>{formatAUD(doc.gst)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatAUD(doc.amount)}</span>
            </div>
          </div>

          {kind === "invoice" && (
            <p className="text-xs text-slate-500 print:text-slate-600">
              {doc.gst > 0
                ? doc.lineItems.some((l) => l.taxRate === "GST-free") &&
                  doc.lineItems.some((l) => (l.taxRate ?? "GST") === "GST")
                  ? "Tax invoice — line amounts are tax-exclusive. GST is charged only on GST on Income lines; GST Free Income lines are excluded from Total GST."
                  : "Tax invoice — line amounts are tax-exclusive; GST is shown in the totals only."
                : "No GST charged on this document (GST Free Income lines)."}
            </p>
          )}

          {kind === "quote" && (
            <p className="text-xs text-slate-500 print:text-slate-600">
              {doc.gst > 0
                ? doc.lineItems.some((l) => l.taxRate === "GST-free") &&
                  doc.lineItems.some((l) => (l.taxRate ?? "GST") === "GST")
                  ? "Quote — line amounts are tax-exclusive. GST is estimated only on GST on Income lines; GST Free Income lines are excluded from Total GST."
                  : "Quote — line amounts are tax-exclusive; GST is shown in the totals only."
                : "No GST on this quote (GST Free Income lines)."}
            </p>
          )}

          {note && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 no-print">{note}</p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 no-print">
            {kind === "invoice" && !paidLike && !isDraft && (
              <div className="basis-full mb-1 flex flex-wrap items-end justify-between gap-2 rounded-lg border border-cyan-200/80 bg-gradient-to-r from-cyan-50 to-indigo-50 px-3 py-2.5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {doc.status === "Overdue" ? "Amount overdue" : "Amount due"}
                  </p>
                  <p className="text-xl font-bold text-slate-900">{formatAUD(doc.amount)}</p>
                  {doc.status === "Overdue" && (
                    <p className="text-xs text-rose-700/90">Overdue — you can still pay in the demo.</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    act("Paid", "Payment recorded in this demo browser only — no money moved.")
                  }
                >
                  Pay now (demo)
                </button>
              </div>
            )}
            {kind === "invoice" && isDraft && (
              <p className="text-sm text-slate-600">
                Draft invoice — not open for payment yet. Mark it Awaiting payment from the invoices list first.
              </p>
            )}
            {kind === "quote" && !paidLike && !declined && !expired && !isDraft && (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => act("Accepted", "Quote accepted in this demo browser.")}
                >
                  Accept quote
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => act("Declined", "Quote declined in this demo browser.")}
                >
                  Decline
                </button>
              </>
            )}
            {(paidLike || declined) && (
              <p className="text-sm text-slate-600">
                {note
                  ? "Status saved in this browser only — refresh keeps it; nothing is lodged or charged."
                  : declined
                    ? "This quote was declined — accept/decline is closed in the demo."
                    : kind === "invoice"
                      ? "Already paid in this demo — no further payment needed."
                      : "This quote was accepted — no further action in the demo."}
              </p>
            )}
            {kind === "quote" && expired && !paidLike && !declined && (
              <p className="text-sm text-slate-600">
                This quote has expired — accept/decline is closed in the demo. Ask the business for a fresh quote if needed.
              </p>
            )}
            {kind === "quote" && isDraft && (
              <p className="text-sm text-slate-600">
                Draft quote — not sent to the customer yet. Change status to Sent from the quotes list to enable accept/decline.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-white/60 no-print">
        Powered by HyperionInvoices demo ·{" "}
        <Link href="/demo" className="underline-offset-2 hover:underline">
          Open product demo
        </Link>
      </p>
    </div>
  );
}
