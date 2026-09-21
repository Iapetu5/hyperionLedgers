"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Banknote, ExternalLink, FileText, Package, Pencil, Plus, Send, Undo2, X } from "lucide-react";
import { PrintDocButton } from "@/components/pay/PrintDocButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { DocRowActions } from "@/components/demo/DocRowActions";
import { DocDeleteButton } from "@/components/demo/DocDeleteButton";
import { BooksSectionNav } from "@/components/demo/BooksSectionNav";
import {
  LineItemsEditor,
  draftsToInputs,
  emptyLineDraft,
  lineItemsToDrafts,
  mixedTaxStarterDrafts,
  tryBeginMixedOneClick,
  useComposeQuery,
  type LineDraft,
} from "@/components/demo/LineItemsEditor";
import { shouldBlockImplicitEnter } from "@/lib/form-enter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD, formatDateAU, todayISO, plusDaysISO } from "@/lib/format";
import { invoices as sampleInvoices } from "@/lib/sample-data";
import { docTaxTreatmentSummary, publicInvoiceUrl, setPublicDocStatus } from "@/lib/public-docs";
import { invoiceStatus, useDocStatusTick } from "@/lib/use-doc-statuses";
import {
  createInvoice,
  deleteInvoice,
  loadInvoices,
  setInvoiceStatus,
  updateInvoice,
} from "@/lib/books-client";
import { effectiveInvoiceStatus, type UserInvoice } from "@/lib/user-docs";
import { useBlankBooksReload } from "@/components/demo/useBlankBooksReload";
import { booksListHint, booksSampleHint, booksStoredHint, usesServerBooksUi } from "@/lib/books-copy";

export default function InvoicesPage() {
  const { usesSampleData, user, persistence } = useAuth();
  const serverBooks = usesServerBooksUi(persistence, user);
  const tick = useDocStatusTick();
  const [copied, setCopied] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showTaxTreatment, setShowTaxTreatment] = useState(true);
  const [userRows, setUserRows] = useState<UserInvoice[]>([]);
  const [contact, setContact] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLineDraft()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  /** After create — inline View / Copy so first session reaches the pay link without hunting the table */
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  /** List-first: keep the create form collapsed until New / Edit / mixed-tax / post-create. */
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState(() => todayISO());
  const [dueDate, setDueDate] = useState(() => plusDaysISO(14));
  const [status, setStatus] = useState<UserInvoice["status"]>("Awaiting payment");
  const submitLock = useRef(false);
  const [submitBusy, setSubmitBusy] = useState(false);

  const reloadUser = useCallback(async () => {
    try {
      setUserRows(await loadInvoices());
      setStatusError((prev) =>
        prev ===
        "Could not load invoices. The list below may be incomplete — do not create or delete until it reloads."
          ? null
          : prev,
      );
    } catch {
      setStatusError(
        "Could not load invoices. The list below may be incomplete — do not create or delete until it reloads.",
      );
    }
  }, []);

  const { ready } = useBlankBooksReload(reloadUser, { includeSample: true });


  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sampleRows = useMemo(
    () =>
      sampleInvoices.map((inv) => ({
        ...inv,
        status: (mounted
          ? invoiceStatus(inv.id, inv.status)
          : inv.status) as typeof inv.status,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, mounted],
  );

  async function copyLink(id: string) {
    const url = `${window.location.origin}${publicInvoiceUrl(id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setSendNote("Invoice link copied. Next: View, or More to Print.");
      setFormOk(null);
      setTimeout(() => {
        setCopied(null);
        setSendNote(null);
      }, 4000);
    } catch {
      setSendNote("Could not copy the link. Next: View and copy the address bar, or More to Print.");
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

  function openComposer(opts?: { reset?: boolean }) {
    if (opts?.reset !== false) {
      resetForm();
      setLastCreatedId(null);
      setFormOk(null);
    }
    setComposerOpen(true);
    window.setTimeout(() => {
      document.getElementById("inv-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      (document.getElementById("inv-contact") as HTMLInputElement | null)?.focus();
    }, 40);
  }

  function closeComposer() {
    resetForm();
    setLastCreatedId(null);
    setFormOk(null);
    setFormError(null);
    setComposerOpen(false);
  }

  /** One-click: Acme + GST/GST-free lines → pay-link strip (no second Create click). */
  function createMixedTaxSample() {
    if (!tryBeginMixedOneClick()) return;
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitBusy(true);
    const draftLines = mixedTaxStarterDrafts("income");
    const contactName = "Acme Pty Ltd";
    void (async () => {
      try {
      const res = await createInvoice({ contact: contactName, lines: draftsToInputs(draftLines) });
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
      setComposerOpen(true);
      setFormOk(`Created ${res.id} with mixed GST + GST-free lines — open the pay link below.`);
      await reloadUser();
      window.setTimeout(() => {
        document.getElementById("inv-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
      } finally {
        submitLock.current = false;
        setSubmitBusy(false);
      }
    })();
  }

  function prefillMixedTaxDraft() {
    setComposerOpen(true);
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

  useComposeQuery(openComposer);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitBusy(true);
    setFormError(null);
    setFormOk(null);
    void (async () => {
      try {
      if (editingId) {
        const payload = {
          contact,
          lines: draftsToInputs(lines),
          issueDate,
          dueDate,
          status,
        };
        const res = await updateInvoice(editingId, payload);
        if ("error" in res) {
          setFormError(res.error);
          return;
        }
        setPublicDocStatus("invoice", res.id, res.status);
        resetForm();
        setLastCreatedId(res.id);
        setComposerOpen(true);
        setFormOk(`Updated ${res.id}.`);
        await reloadUser();
        return;
      }
      const res = await createInvoice({ contact, lines: draftsToInputs(lines) });
      if ("error" in res) {
        const nudge =
          /amount|line/i.test(res.error) && !editingId
            ? " Tip: use Create sample above for a ready-made invoice with GST and GST-free lines."
            : "";
        setFormError(`${res.error}${nudge}`);
        return;
      }
      let updated: Awaited<ReturnType<typeof updateInvoice>>;
      try {
        updated = await updateInvoice(res.id, {
          contact: res.contact,
          lines: draftsToInputs(lines),
          issueDate,
          dueDate,
          status,
        });
      } catch (e) {
        updated = { error: e instanceof Error ? e.message : "save failed" };
      }
      if ("error" in updated) {
        setPublicDocStatus("invoice", res.id, res.status);
        setEditingId(res.id);
        setLastCreatedId(res.id);
        setComposerOpen(true);
        setFormError(
          `Created ${res.id}, but dates/status did not save (${updated.error}). Update ${res.id} below to retry — do not create another.`,
        );
        setFormOk(null);
        await reloadUser();
        return;
      }
      setPublicDocStatus("invoice", updated.id, updated.status);
      const createdId = updated.id;
      resetForm();
      setLastCreatedId(createdId);
      setComposerOpen(true);
      setFormOk(`Created ${createdId}.`);
      await reloadUser();
      } catch {
        setFormError("Could not finish saving. Check the list before creating again.");
        setFormOk(null);
        try {
          await reloadUser();
        } catch {
          /* leave the list as last shown */
        }
      } finally {
        submitLock.current = false;
        setSubmitBusy(false);
      }
    })();
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
              unitPriceEx: String(Math.round((inv.amount - inv.gst) * 100) / 100),
              amountEx: String(Math.round((inv.amount - inv.gst) * 100) / 100),
              taxRate: inv.gst > 0 ? "GST" : "GST-free",
            }),
          ],
    );
    setFormError(null);
    setLastCreatedId(null);
    setComposerOpen(true);
    setFormOk(`Editing ${inv.id} — update contact, lines, dates, or status. Delete removes it so you can recreate.`);
    if (typeof document !== "undefined") {
      document.getElementById("inv-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onDelete(id: string) {
    void (async () => {
      try {
        const ok = await deleteInvoice(id);
        if (!ok) {
          await reloadUser();
          setSendNote(null);
          setFormOk(null);
          setStatusError(`Could not delete ${id} — still in the list.`);
          return;
        }
        setUserRows((rows) => rows.filter((r) => r.id !== id));
        await reloadUser();
        if (editingId === id) resetForm();
        if (lastCreatedId === id) setLastCreatedId(null);
        setStatusError(null);
        setSendNote(`Removed ${id}. Next: Create invoice.`);
        setFormOk(null);
      } catch {
        setSendNote(null);
        setFormOk(null);
        setStatusError(`Could not delete ${id} — still in the list.`);
        try {
          await reloadUser();
        } catch {
          /* leave the list as last shown */
        }
      }
    })();
  }

  function noteInvoiceStatus(id: string, next: UserInvoice["status"]) {
    if (next === "Paid") return `${id} marked Paid. Next: Print, or More for Undo paid.`;
    if (next === "Awaiting payment") return `${id} back to Awaiting payment. Next: Mark paid.`;
    return `${id} updated.`;
  }

  function onSetInvStatus(id: string, next: UserInvoice["status"]) {
    void (async () => {
      try {
        const isUserRow = userRows.some((r) => r.id === id);
        if (isUserRow) {
          const row = await setInvoiceStatus(id, next);
          if (!row) {
            setSendNote(null);
            setFormOk(null);
            setStatusError(`Could not change ${id}. Status is unchanged — check the list.`);
            await reloadUser();
            return;
          }
          setPublicDocStatus("invoice", id, row.status);
        } else {
          setPublicDocStatus("invoice", id, next);
        }
        await reloadUser();
        setStatusError(null);
        setSendNote(noteInvoiceStatus(id, next));
        setFormOk(null);
      } catch {
        setSendNote(null);
        setFormOk(null);
        setStatusError(`Could not change ${id}. Check the list — status may be unchanged.`);
        try {
          await reloadUser();
        } catch {
          /* leave the list as last shown */
        }
      }
    })();
  }

  function blockImplicitEnter(e: KeyboardEvent<HTMLFormElement>) {
    const el = e.target instanceof HTMLElement ? e.target : null;
    if (
      shouldBlockImplicitEnter({
        key: e.key,
        tagName: el?.tagName,
        composing: e.nativeEvent.isComposing,
      })
    ) {
      e.preventDefault();
    }
  }

  const createForm = (
    <form onKeyDown={blockImplicitEnter} id="inv-form" className="card scroll-mt-4 space-y-4 p-5" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">
          {editingId ? `Edit ${editingId}` : "Create invoice"}
        </h2>
        <span className="text-xs text-slate-400">
          {editingId
            ? "Same id & pay link · edit dates & status · browser only"
            : "Line amounts before GST · choose GST or GST-free on each line · dates & status · saved in this browser"}
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
          <span className="text-cyan-100/80">ready — View, Send invoice, or print the customer pay page</span>
          <Link
            href={publicInvoiceUrl(lastCreatedId)}
            target="_blank"
            className="btn-primary !px-2.5 !py-1 text-xs"
          >
            <ExternalLink size={12} />
            View
          </Link>
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1 text-xs"
            onClick={() => copyLink(lastCreatedId)}
          >
            <Send size={12} />
            {copied === lastCreatedId ? "Copied" : "Send invoice"}
          </button>
          <PrintDocButton kind="invoice" id={lastCreatedId} compact />
          {(() => {
            const row = userRows.find((r) => r.id === lastCreatedId);
            const st = row
              ? effectiveInvoiceStatus({
                  status: invoiceStatus(row.id, row.status) as UserInvoice["status"],
                  dueDate: row.dueDate,
                })
              : status;
            if (st === "Paid") return null;
            if (st === "Draft") return null;
            return (
              <button
                type="button"
                className="btn-secondary !px-2.5 !py-1 text-xs"
                onClick={() => onSetInvStatus(lastCreatedId, "Paid")}
              >
                <Banknote size={12} />
                Mark paid
              </button>
            );
          })()}
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
              Create sample
            </button>
            <button type="button" className="btn-secondary !px-2.5 !py-1 text-xs" onClick={prefillMixedTaxDraft}>
              Prefill draft
            </button>
            <Link
              href="/demo/products?from=invoice#product-form"
              title="Add one product (name, price, tax), then return and pick it"
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
              Tip: <strong className="text-white">Create sample</strong> is enough for a{" "}
              <strong className="text-white">GST on Income</strong> +{" "}
              <strong className="text-white">GST Free Income</strong> demo — then{" "}
              <strong className="text-white">View</strong> for the nebula tax-invoice header.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={submitBusy}>
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
        {editingId ? (
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
        ) : (
          <button type="button" className="btn-secondary" onClick={closeComposer}>
            <X size={16} />
            Hide form
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Prefer a fresh number? Delete the row below (asks first) and create again — pay links use the document id.
      </p>
    </form>
  );

  const showComposer = Boolean(editingId) || composerOpen || Boolean(lastCreatedId);

  function pageHeader(subtitle: ReactNode) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Invoices</h1>
            <BooksSectionNav />
            <p className="text-sm text-white/70">{subtitle}</p>
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
          {!showComposer && (
            <button type="button" className="btn-primary shrink-0" onClick={() => openComposer()}>
              <Plus size={16} />
              Create invoice
            </button>
          )}
        </div>
        {statusError && (
          <p
            className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {statusError}
          </p>
        )}
        {sendNote && (
          <p
            className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
            role="status"
          >
            {sendNote}
          </p>
        )}
      </div>
    );
  }

  function userActions(inv: UserInvoice) {
    const st = effectiveInvoiceStatus({
      status: invoiceStatus(inv.id, inv.status) as UserInvoice["status"],
      dueDate: inv.dueDate,
    });
    const paid = st === "Paid";
    const canMarkPaid = !paid && st !== "Draft";
    return (
      <DocRowActions keep={3}>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => copyLink(inv.id)}
          title="Copy the customer pay link to send"
        >
          <Send size={12} />
          {copied === inv.id ? "Copied" : "Send invoice"}
        </button>
        <Link
          href={publicInvoiceUrl(inv.id)}
          target="_blank"
          className="btn-secondary !px-2 !py-1 text-xs"
        >
          <ExternalLink size={12} />
          View
        </Link>
        {canMarkPaid && (
          <button
            type="button"
            className="btn-primary !px-2 !py-1 text-xs"
            onClick={() => onSetInvStatus(inv.id, "Paid")}
            title="Record payment"
          >
            <Banknote size={12} />
            Mark paid
          </button>
        )}
        {paid && <PrintDocButton kind="invoice" id={inv.id} compact />}
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onEdit(inv)}
          title="Edit contact, lines, dates, and status"
        >
          <Pencil size={12} />
          Edit
        </button>
        {paid && (
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-xs"
            onClick={() => onSetInvStatus(inv.id, "Awaiting payment")}
            title="Undo paid — back to Awaiting payment"
          >
            <Undo2 size={12} />
            Undo paid
          </button>
        )}
        {!paid && <PrintDocButton kind="invoice" id={inv.id} compact />}
        <DocDeleteButton key={inv.id} id={inv.id} kind="invoice" onDelete={onDelete} />
      </DocRowActions>
    );
  }

  if (!ready) {
    return (
      <div className="card p-6 text-sm text-white/70">
        Loading invoices…
      </div>
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

    const listOrEmpty =
      userRows.length === 0 && !showComposer ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Open a blank invoice, or start from a ready-made example with a customer pay link."
          actions={[
            {
              label: "Start from an example",
              primary: true,
              onClick: () => createMixedTaxSample(),
            },
            {
              label: "New invoice",
              onClick: () => openComposer(),
            },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="Your invoices stay with this business."
        />
      ) : userRows.length === 0 ? null : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="doc-actions-col px-4 py-3">Actions</th>
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
                  <td className="doc-actions-col px-4 py-3">{userActions(inv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    return (
      <div className="space-y-4">
        {pageHeader(
          userRows.length === 0 ? (
            <>
              Make an invoice for this business. Past-due unpaid invoices show Overdue automatically (Draft stays Draft).
            </>
          ) : (
            <>
              Outstanding: <strong className="text-cyan-200">{formatAUD(receivableTotal)}</strong>
              {" · "}
              {overdueUserInvs.length} overdue
              {" · "}
              {booksListHint(serverBooks)}
            </>
          ),
        )}

        {/* List first when browsing; composer expands on New / Edit / mixed-tax */}
        {!showComposer && listOrEmpty}
        {showComposer && createForm}
        {showComposer && listOrEmpty}
      </div>
    );
  }

  const sampleOverdue = sampleRows.filter(
    (inv) =>
      effectiveInvoiceStatus({
        status: inv.status as UserInvoice["status"],
        dueDate: inv.dueDate,
      }) === "Overdue",
  );
  const sampleReceivable = sampleRows
    .filter((inv) => {
      const st = effectiveInvoiceStatus({
        status: inv.status as UserInvoice["status"],
        dueDate: inv.dueDate,
      });
      return st === "Awaiting payment" || st === "Overdue";
    })
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-4">
      {pageHeader(
        <>
          Outstanding: <strong className="text-cyan-200">{formatAUD(sampleReceivable)}</strong>
          {" · "}
          {sampleOverdue.length} overdue
          {" · "}
          {booksSampleHint(serverBooks)}
        </>,
      )}

      {showComposer && createForm}


      {userRows.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="font-semibold text-white">Your created invoices</h2>
            <p className="text-xs text-slate-400">{booksStoredHint(serverBooks)}</p>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="doc-actions-col px-4 py-3">Actions</th>
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
                  <td className="doc-actions-col px-4 py-3">{userActions(inv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Demo sample</h2>
          <p className="text-xs text-slate-400">
            Send invoice copies the customer pay link. View opens the public page. Mark paid is on unpaid rows. After Paid, Print is on the row; Undo paid sits under More. Delete is not on sample rows. INV-1042 is a mixed GST + GST Free example.
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
              <th className="doc-actions-col px-4 py-3">Actions</th>
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
                <td className="doc-actions-col px-4 py-3">
                  {(() => {
                    const st = effectiveInvoiceStatus({
                      status: inv.status as UserInvoice["status"],
                      dueDate: inv.dueDate,
                    });
                    const paid = st === "Paid";
                    const canMarkPaid = !paid && st !== "Draft";
                    return (
                  <DocRowActions keep={canMarkPaid || paid ? 3 : 2}>
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => copyLink(inv.id)}
                      title="Copy the customer pay link to send"
                    >
                      <Send size={12} />
                      {copied === inv.id ? "Copied" : "Send invoice"}
                    </button>
                    <Link
                      href={publicInvoiceUrl(inv.id)}
                      target="_blank"
                      className="btn-secondary !px-2 !py-1 text-xs"
                    >
                      <ExternalLink size={12} />
                      View
                    </Link>
                    {canMarkPaid && (
                      <button
                        type="button"
                        className="btn-primary !px-2 !py-1 text-xs"
                        onClick={() => onSetInvStatus(inv.id, "Paid")}
                        title="Record payment"
                      >
                        <Banknote size={12} />
                        Mark paid
                      </button>
                    )}
                    {paid && <PrintDocButton kind="invoice" id={inv.id} compact />}
                    {paid && (
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 text-xs"
                        onClick={() => onSetInvStatus(inv.id, "Awaiting payment")}
                        title="Undo paid — back to Awaiting payment"
                      >
                        <Undo2 size={12} />
                        Undo paid
                      </button>
                    )}
                    {!paid && <PrintDocButton kind="invoice" id={inv.id} compact />}
                  </DocRowActions>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
