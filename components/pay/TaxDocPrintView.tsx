"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD, formatDateAU } from "@/lib/format";
import { docLineTaxLabel, type PublicInvoice, type PublicQuote } from "@/lib/public-docs";

type Doc = PublicInvoice | PublicQuote;

export function TaxDocPrintView({ doc }: { doc: Doc }) {
  const kind = doc.kind;
  const dueOrExpiry =
    kind === "invoice" ? (doc as PublicInvoice).dueDate : (doc as PublicQuote).expiryDate;
  const exGst = Math.round((doc.amount - doc.gst) * 100) / 100;

  return (
    <div className="tax-doc-sheet bg-transparent text-slate-900">
      <div className="doc-header -mx-6 -mt-6 flex flex-wrap items-start justify-between gap-4 print:mx-0 print:mt-0">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
            HyperionInvoices
          </p>
          <p className="mt-1 text-base font-semibold">{doc.businessName}</p>
          <p className="text-sm text-white/70">
            {doc.businessAbn ? <>ABN {doc.businessAbn}</> : "ABN not set"}
          </p>
          {doc.suburb ? (
            <p className="text-sm text-white/50">
              {doc.suburb} {doc.state} {doc.postcode}
            </p>
          ) : doc.fromUser ? (
            <p className="text-sm text-white/50">Demo document · no street address on file</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            {kind === "invoice" ? "Tax Invoice" : "Quote"}
          </p>
          <p className="text-xl font-bold text-white">{doc.id}</p>
          <div className="mt-2 flex justify-end">
            <StatusBadge status={doc.status} tone="header" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-x-5 gap-y-3.5 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
            {kind === "invoice" ? "Bill to" : "Quote for"}
          </p>
          <p className="mt-0.5 break-words font-semibold">{doc.contact}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference</p>
          <p className="mt-0.5 break-words font-medium">{doc.reference}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Issue date</p>
          <p className="mt-0.5 font-medium">{formatDateAU(doc.issueDate)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
            {kind === "invoice" ? "Due date" : "Expiry"}
          </p>
          <p className="mt-0.5 font-medium">{formatDateAU(dueOrExpiry)}</p>
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
          {doc.lineItems.map((li, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 pr-2">{li.description}</td>
              <td className="py-2 pr-2">{li.qty}</td>
              <td className="py-2 pr-2 text-right">{formatAUD(li.unitPrice)}</td>
              <td className="py-2 pr-2 text-xs text-slate-600">{docLineTaxLabel(li.taxRate)}</td>
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
          <span>{formatAUD(doc.gst)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatAUD(doc.amount)}</span>
        </div>
      </div>

      {kind === "invoice" && (
        <p className="mt-6 text-xs text-slate-500">
          {doc.gst > 0
            ? doc.lineItems.some((l) => l.taxRate === "GST-free") &&
              doc.lineItems.some((l) => (l.taxRate ?? "GST") === "GST")
              ? "Tax invoice — line amounts are tax-exclusive. GST is charged only on GST on Income lines; GST Free Income lines are excluded from Total GST."
              : "Tax invoice — line amounts are tax-exclusive; GST is shown in the totals only."
            : "No GST charged on this document (GST Free Income lines)."}
        </p>
      )}

      {kind === "quote" && (
        <p className="mt-6 text-xs text-slate-500">
          {doc.gst > 0
            ? doc.lineItems.some((l) => l.taxRate === "GST-free") &&
              doc.lineItems.some((l) => (l.taxRate ?? "GST") === "GST")
              ? "Quote — line amounts are tax-exclusive. GST is estimated only on GST on Income lines; GST Free Income lines are excluded from Total GST."
              : "Quote — line amounts are tax-exclusive; GST is shown in the totals only."
            : "No GST on this quote (GST Free Income lines)."}
        </p>
      )}
    </div>
  );
}
