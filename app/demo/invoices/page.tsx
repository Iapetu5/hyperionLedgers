"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, FileText, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { PrintDocButton } from "@/components/pay/PrintDocButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { DocRowActions } from "@/components/demo/DocRowActions";
import {
  LineItemsEditor,
  draftsToInputs,
  emptyLineDraft,
  lineItemsToDrafts,
  mixedTaxStarterDrafts,
  tryBeginMixedOneClick,
  type LineDraft,
} from "@/components/demo/LineItemsEditor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD, formatDateAU } from "@/lib/format";
import { invoices as sampleInvoices } from "@/lib/sample-data";
import { docTaxTreatmentSummary, publicInvoiceUrl, setPublicDocStatus } from "@/lib/public-docs";
import { invoiceStatus, useDocStatusTick } from "@/lib/use-doc-statuses";
import {
  createUserInvoice,
  deleteUserInvoice,
  effectiveInvoiceStatus,
  loadUserInvoices,
  updateUserInvoice,
  type UserInvoice,
  todayISO,
  plusDaysISO,
} from "@/lib/user-docs";

export default function InvoicesPage() {
  const { usesSampleData } = useAuth();
  const tick = useDocStatusTick();
  const [copied, setCopied] = useState<string | null>(null);
  const [showTaxTreatment, setShowTaxTreatment] = useState(true);
  const [userRows, setUserRows] = useState<UserInvoice[]>([]);
  const [contact, setContact] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLineDraft()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  /** After create — inline View / Copy so first session reaches the pay link without hunting the table */
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState(() => todayISO());
  const [dueDate, setDueDate] = useState(() => plusDaysISO(14));
  const [status, setStatus] = useState<UserInvoice["status"]>("Awaiting payment");

  const reloadUser = useCallback(() => setUserRows(loadUserInvoices()), []);

  useEffect(() => {
    reloadUser();
    const onUpdate = () => reloadUser();
    window.addEventListener("hl-user-docs-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("hl-user-docs-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reloadUser]);


  const sampleRows = useMemo(
    () =>
      sampleInvoices.map((inv) => ({
        ...inv,
        status: invoiceStatus(inv.id, inv.status) as typeof inv.status,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  async function copyLink(id: string) {
    const url = `${window.location.origin}${publicInvoiceUrl(id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setFormError("Could not copy link — use View / View as customer and copy the URL from the address bar.");
    }
  }

  function defaultIssue() {
    return todayISO();
  }
  function defaultDue() {
    return plusDaysISO(14);
  }

  function resetForm() {
    setContact("");
    setLines([emptyLineDraft()]);
    setEditingId(null);
    setIssueDate(defaultIssue());
    setDueDate(defaultDue());
    setStatus("Awaiting payment");
    setFormError(null);
  }

  /** One-click: Acme + GST/GST-free lines → pay-link strip (no second Create click). */
  function createMixedTaxSample() {
    if (!tryBeginMixedOneClick()) return;
    const draftLines = mixedTaxStarterDrafts("income");
    const contactName = "Acme Pty Ltd";
    const res = createUserInvoice({ contact: contactName, lines: draftsToInputs(draftLines) });
    if ("error" in res) {
      setLines(draftLines);
      setContact(contactName);
      setFormError(res.error);
      setFormOk(null);
      setLastCreatedId(null);
      return;
    }
    setPublicDocStatus("invoice", res.id, res.status);
    resetForm();
    setLastCreatedId(res.id);
    setFormOk(`Created ${res.id} with mixed GST + GST-free lines — open the pay link below.`);
    reloadUser();
    window.setTimeout(() => {
      document.getElementById("inv-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function prefillMixedTaxDraft() {
    setLines(mixedTaxStarterDrafts("income"));
    setContact((c) => c.trim() || "Acme Pty Ltd");
    setLastCreatedId(null);
    setFormError(null);
    setFormOk("Draft prefilled — tweak if you like, then Create invoice below.");
    window.setTimeout(() => {
      (document.getElementById("inv-contact") as HTMLInputElement | null)?.focus();
    }, 40);
  }

  // One-click: full load or same-page soft-nav Link to ?mixed=1 (avoid useSearchParams Suspense hang)
  useEffect(() => {
    if (typeof window === "undefined") return;

    function stripMixedParam() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mixed") !== "1") return false;
      params.delete("mixed");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
      return true;
    }

    function consumeMixedFromUrl() {
      if (!new URLSearchParams(window.location.search).get("mixed")) return;
      if (!stripMixedParam()) return;
      createMixedTaxSample();
    }

    consumeMixedFromUrl();

    /** Same-route Next <Link href="...?mixed=1"> does not remount — intercept before soft-nav. */
    function onDocClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("a");
      if (!el) return;
      const href = el.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.pathname !== window.location.pathname) return;
      if (url.searchParams.get("mixed") !== "1") return;
      e.preventDefault();
      e.stopPropagation();
      url.searchParams.delete("mixed");
      const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams}` : ""}${url.hash}`;
      window.history.replaceState({}, "", next);
      createMixedTaxSample();
    }

    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + same-path mixed links only
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormOk(null);
    if (editingId) {
      const payload = {
        contact,
        lines: draftsToInputs(lines),
        issueDate,
        dueDate,
        status,
      };
      const res = updateUserInvoice(editingId, payload);
      if ("error" in res) {
        setFormError(res.error);
        return;
      }
      setPublicDocStatus("invoice", res.id, res.status);
      resetForm();
      setLastCreatedId(res.id);
      setFormOk(`Updated ${res.id}.`);
      reloadUser();
      return;
    }
    const res = createUserInvoice({ contact, lines: draftsToInputs(lines) });
    if ("error" in res) {
      const nudge =
        /amount|line/i.test(res.error) && !editingId
          ? " Tip: use Create mixed-tax sample above for a one-click GST + GST-free invoice."
          : "";
      setFormError(`${res.error}${nudge}`);
      return;
    }
    const updated = updateUserInvoice(res.id, {
      contact: res.contact,
      lines: draftsToInputs(lines),
      issueDate,
      dueDate,
      status,
    });
    if (!("error" in updated)) {
      setPublicDocStatus("invoice", updated.id, updated.status);
    }
    const createdId = "error" in updated ? res.id : updated.id;
    resetForm();
    setLastCreatedId(createdId);
    setFormOk(`Created ${createdId}.`);
    reloadUser();
  }

  function onEdit(inv: UserInvoice) {
    setEditingId(inv.id);
    setContact(inv.contact);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    // Stored workflow status in the form (not auto-Overdue). Past-due rows keep
    // Awaiting payment here; Draft never auto-flips; badge uses effectiveInvoiceStatus.
    const stored = (invoiceStatus(inv.id, inv.status) as UserInvoice["status"]) || inv.status;
    setStatus(stored === "Overdue" ? "Awaiting payment" : stored);
    setLines(
      inv.lineItems?.length
        ? lineItemsToDrafts(inv.lineItems)
        : [
            emptyLineDraft({
              description: inv.reference,
              amountEx: String(Math.round((inv.amount - inv.gst) * 100) / 100),
              taxRate: inv.gst > 0 ? "GST" : "GST-free",
            }),
          ],
    );
    setFormError(null);
    setLastCreatedId(null);
    setFormOk(`Editing ${inv.id} — update contact, lines, dates, or status. Delete removes it so you can recreate.`);
    if (typeof document !== "undefined") {
      document.getElementById("inv-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onDelete(id: string) {
    deleteUserInvoice(id);
    if (editingId === id) resetForm();
    if (lastCreatedId === id) setLastCreatedId(null);
    reloadUser();
    setFormOk(`Removed ${id}. Create a new invoice above if you need a fresh draft.`);
  }

  const createForm = (
    <form id="inv-form" className="card scroll-mt-4 space-y-4 p-5" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">
          {editingId ? `Edit ${editingId}` : "Create invoice"}
        </h2>
        <span className="text-xs text-slate-400">
          {editingId
            ? "Same id & pay link · edit dates & status · browser only"
            : "Tax-exclusive lines · GST on Income / GST Free Income · set dates & status · browser only"}
        </span>
      </div>
      <div>
        <label className="label" htmlFor="inv-contact">
          Customer / contact
        </label>
        <input
          id="inv-contact"
          className="input"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Acme Pty Ltd"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="inv-issue">
            Issue date
          </label>
          <input
            id="inv-issue"
            className="input"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="inv-due">
            Due date
          </label>
          <input
            id="inv-due"
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="inv-status">
            Status
          </label>
          <select
            id="inv-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserInvoice["status"])}
          >
            <option value="Draft">Draft</option>
            <option value="Awaiting payment">Awaiting payment</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>
      <LineItemsEditor lines={lines} onChange={setLines} idPrefix="inv" />
      {formError && <p className="text-sm text-rose-300">{formError}</p>}
      {formOk && <p className="text-sm text-emerald-300">{formOk}</p>}
      {lastCreatedId && !editingId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs text-cyan-50">
          <span className="font-semibold text-white">{lastCreatedId}</span>
          <span className="text-cyan-100/80">ready — view, copy, or print the customer pay page</span>
          <Link
            href={publicInvoiceUrl(lastCreatedId)}
            target="_blank"
            className="btn-primary !px-2.5 !py-1 text-xs"
          >
            <ExternalLink size={12} />
            View pay link
          </Link>
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1 text-xs"
            onClick={() => copyLink(lastCreatedId)}
          >
            <Copy size={12} />
            {copied === lastCreatedId ? "Copied" : "Copy link"}
          </button>
          <PrintDocButton kind="invoice" id={lastCreatedId} compact />
        </div>
      )}
      {!editingId && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${lastCreatedId ? "btn-secondary" : "btn-primary"} !px-2.5 !py-1 text-xs`}
              onClick={createMixedTaxSample}
            >
              <Plus size={12} />
              Create mixed-tax sample
            </button>
            <button type="button" className="btn-secondary !px-2.5 !py-1 text-xs" onClick={prefillMixedTaxDraft}>
              Prefill draft
            </button>
            <Link
              href="/demo/products"
              target="_blank"
              rel="noopener noreferrer"
              title="Opens in a new tab — keeps this form open"
              className="btn-secondary !px-2.5 !py-1 text-xs"
            >
              <Package size={12} />
              Products
            </Link>
            <span className="text-xs text-slate-400">
              One click → Acme + GST/GST-free + pay link. Prefill to edit first. Products unlock the line picker.
            </span>
          </div>
          {!lastCreatedId && (
            <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
              Tip: <strong className="text-white">Create mixed-tax sample</strong> is enough for a{" "}
              <strong className="text-white">GST on Income</strong> +{" "}
              <strong className="text-white">GST Free Income</strong> demo — then{" "}
              <strong className="text-white">View pay link</strong> for the nebula tax-invoice header.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary">
          {editingId ? (
            <>
              <Pencil size={16} />
              Save changes
            </>
          ) : (
            <>
              <Plus size={16} />
              Create invoice
            </>
          )}
        </button>
        {editingId && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              resetForm();
              setFormOk(null);
              setLastCreatedId(null);
            }}
          >
            <X size={16} />
            Cancel edit
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Prefer a fresh number? Delete the row below and create again — pay links use the document id.
      </p>
    </form>
  );

  function userActions(inv: UserInvoice) {
    return (
      <DocRowActions keep={3}>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => copyLink(inv.id)}
        >
          <Copy size={12} />
          {copied === inv.id ? "Copied" : "Copy link"}
        </button>
        <Link
          href={publicInvoiceUrl(inv.id)}
          target="_blank"
          className="btn-secondary !px-2 !py-1 text-xs"
        >
          <ExternalLink size={12} />
          View
        </Link>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onEdit(inv)}
          title="Edit contact, lines, dates, and status"
        >
          <Pencil size={12} />
          Edit
        </button>
        <PrintDocButton kind="invoice" id={inv.id} compact />
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onDelete(inv.id)}
          title="Remove from this browser — then recreate if you need a new id"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </DocRowActions>
    );
  }

  if (!usesSampleData) {
    const overdueUserInvs = userRows.filter(
      (inv) => effectiveInvoiceStatus({ status: inv.status, dueDate: inv.dueDate }) === "Overdue",
    );
    const receivableTotal = userRows
      .filter((inv) => {
        const st = effectiveInvoiceStatus({ status: inv.status, dueDate: inv.dueDate });
        return st === "Awaiting payment" || st === "Overdue";
      })
      .reduce((sum, inv) => sum + inv.amount, 0);
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-white/70">
            {userRows.length === 0 ? (
              <>
                Blank ledger — create a basic invoice here (browser only), or explore Harbour &amp; Co for the full sample list. Past-due unpaid invoices show Overdue automatically (Draft stays Draft).
              </>
            ) : (
              <>
                Outstanding: <strong className="text-cyan-200">{formatAUD(receivableTotal)}</strong>
                {" · "}
                {overdueUserInvs.length} overdue
                {" · "}
                browser-local only
              </>
            )}
          </p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-black/30"
              checked={showTaxTreatment}
              onChange={(e) => setShowTaxTreatment(e.target.checked)}
            />
            Show tax treatment summary
          </label>
        </div>

        {createForm}

        {userRows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice above, or open the Harbour & Co sample as a guest to browse a full list."
            showExploreSample
            actions={[
              { label: "Back to overview", href: "/demo" },
              { label: "Account settings", href: "/demo/account" },
            ]}
            hint="Sample invoices live in the guest demo — they are not copied into your blank org."
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="min-w-[14rem] px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {userRows.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="px-4 py-3 font-medium">
                      {inv.id}
                      <div className="text-xs text-slate-400">{inv.reference}</div>
                    </td>
                    <td className="px-4 py-3">{inv.contact}</td>
                    <td className="px-4 py-3">{formatDateAU(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      {formatAUD(inv.amount)}
                      {showTaxTreatment && (
                        <div className="text-xs text-slate-400">
                          {docTaxTreatmentSummary(inv.lineItems, inv.gst)}
                          {inv.gst > 0 ? ` · GST ${formatAUD(inv.gst)}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={effectiveInvoiceStatus({
                          status: invoiceStatus(inv.id, inv.status) as UserInvoice["status"],
                          dueDate: inv.dueDate,
                        })}
                      />
                    </td>
                    <td className="px-4 py-3">{userActions(inv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="text-sm text-white/70">
          Harbour &amp; Co sample list below — or create a simple invoice (browser only) with the same pay link and nebula print header. Payments are simulated. Your created rows auto-show Overdue when past due (Draft stays Draft).
        </p>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            className="rounded border-white/20 bg-black/30"
            checked={showTaxTreatment}
            onChange={(e) => setShowTaxTreatment(e.target.checked)}
          />
          Show tax treatment summary
        </label>
      </div>

      {createForm}

      {userRows.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="font-semibold text-white">Your created invoices</h2>
            <p className="text-xs text-slate-400">Stored in this browser · not part of the Harbour sample story</p>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="min-w-[14rem] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {userRows.map((inv) => (
                <tr key={inv.id} className="table-row">
                  <td className="px-4 py-3 font-medium">
                    {inv.id}
                    <div className="text-xs text-slate-400">{inv.reference}</div>
                  </td>
                  <td className="px-4 py-3">{inv.contact}</td>
                  <td className="px-4 py-3">{formatDateAU(inv.dueDate)}</td>
                  <td className="px-4 py-3">
                      {formatAUD(inv.amount)}
                      {showTaxTreatment && (
                        <div className="text-xs text-slate-400">
                          {docTaxTreatmentSummary(inv.lineItems, inv.gst)}
                          {inv.gst > 0 ? ` · GST ${formatAUD(inv.gst)}` : ""}
                        </div>
                      )}
                    </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                        status={effectiveInvoiceStatus({
                          status: invoiceStatus(inv.id, inv.status) as UserInvoice["status"],
                          dueDate: inv.dueDate,
                        })}
                      />
                  </td>
                  <td className="px-4 py-3">{userActions(inv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Harbour &amp; Co sample</h2>
          <p className="text-xs text-slate-400">
            Copy a customer pay link or open the public page. INV-1042 is a mixed GST + GST Free example — View as customer to confirm the nebula tax-invoice header.
          </p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Customer link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sampleRows.map((inv) => (
              <tr key={inv.id} className="table-row">
                <td className="px-4 py-3 font-medium">
                  {inv.id}
                  <div className="text-xs text-slate-400">{inv.reference}</div>
                </td>
                <td className="px-4 py-3">{inv.contact}</td>
                <td className="px-4 py-3">{formatDateAU(inv.dueDate)}</td>
                <td className="px-4 py-3">
                  {formatAUD(inv.amount)}
                  {showTaxTreatment && (
                    <div className="text-xs text-slate-400">
                      {docTaxTreatmentSummary(
                        "lineItems" in inv ? inv.lineItems : undefined,
                        inv.gst,
                      )}
                      {inv.gst > 0 ? ` · GST ${formatAUD(inv.gst)}` : ""}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={effectiveInvoiceStatus({
                      status: inv.status as UserInvoice["status"],
                      dueDate: inv.dueDate,
                    })}
                  />
                </td>
                <td className="px-4 py-3">
                  <DocRowActions keep={2}>
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => copyLink(inv.id)}
                    >
                      <Copy size={12} />
                      {copied === inv.id ? "Copied" : "Copy link"}
                    </button>
                    <Link
                      href={publicInvoiceUrl(inv.id)}
                      target="_blank"
                      className="btn-secondary !px-2 !py-1 text-xs"
                    >
                      <ExternalLink size={12} />
                      View as customer
                    </Link>
                    <PrintDocButton kind="invoice" id={inv.id} compact />
                  </DocRowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
