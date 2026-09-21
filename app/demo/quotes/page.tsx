"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, FileSignature, Mail, Package, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { PrintDocButton } from "@/components/pay/PrintDocButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { DocRowActions } from "@/components/demo/DocRowActions";
import { BooksSectionNav } from "@/components/demo/BooksSectionNav";
import { SendQuotePanel, type SendQuoteTarget } from "@/components/demo/SendQuotePanel";
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
import { quotes as sampleQuotes } from "@/lib/sample-data";
import { docTaxTreatmentSummary, publicQuoteUrl, setPublicDocStatus } from "@/lib/public-docs";
import { quoteStatus, useDocStatusTick } from "@/lib/use-doc-statuses";
import {
  createUserQuote,
  deleteUserQuote,
  effectiveQuoteStatus,
  loadUserQuotes,
  setUserQuoteStatus,
  updateUserQuote,
  type UserQuote
} from "@/lib/user-docs";

export default function QuotesPage() {
  const { usesSampleData, user } = useAuth();
  const tick = useDocStatusTick();
  const [copied, setCopied] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [showTaxTreatment, setShowTaxTreatment] = useState(true);
  const [userRows, setUserRows] = useState<UserQuote[]>([]);
  const [contact, setContact] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sendTarget, setSendTarget] = useState<SendQuoteTarget | null>(null);
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLineDraft()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  /** After create — inline View / Copy so first session reaches the customer link without hunting the table */
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  /** List-first: create form collapsed until New / Edit / mixed-tax / post-create. */
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState(() => todayISO());
  const [expiryDate, setExpiryDate] = useState(() => plusDaysISO(14));
  const [status, setStatus] = useState<UserQuote["status"]>("Sent");

  const reloadUser = useCallback(() => setUserRows(loadUserQuotes()), []);

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


  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sampleRows = useMemo(
    () =>
      sampleQuotes.map((q) => ({
        ...q,
        status: (mounted
          ? quoteStatus(q.id, q.status)
          : q.status) as typeof q.status,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, mounted],
  );

  async function copyLink(id: string) {
    const url = `${window.location.origin}${publicQuoteUrl(id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setSendNote("Quote link copied. Next: View, or More to Print.");
      setTimeout(() => {
        setCopied(null);
        setSendNote(null);
      }, 4000);
    } catch {
      setFormError("Could not copy the link — use View and copy the URL from the address bar.");
    }
  }

  function defaultIssue() {
    return todayISO();
  }
  function defaultExpiry() {
    return plusDaysISO(14);
  }

  function resetForm() {
    setContact("");
    setContactEmail("");
    setLines([emptyLineDraft()]);
    setEditingId(null);
    setIssueDate(defaultIssue());
    setExpiryDate(defaultExpiry());
    setStatus("Sent");
    setFormError(null);
  }

  function openSend(q: { id: string; contact: string; contactEmail?: string; amount: number; businessName?: string }) {
    const inferred =
      q.contactEmail || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.contact) ? q.contact : "") || undefined;
    setSendTarget({
      id: q.id,
      contact: q.contact,
      contactEmail: inferred,
      businessName: q.businessName || user?.businessName || "HyperionInvoices",
      amount: q.amount,
    });
    setSendNote("Send quote is open below. After you send: View, or More to Print.");
  }

  /** One-click: Acme + GST/GST-free lines → customer-link strip (no second Create click). */
  function openComposer(opts?: { reset?: boolean }) {
    if (opts?.reset !== false) {
      resetForm();
      setLastCreatedId(null);
      setFormOk(null);
    }
    setComposerOpen(true);
    window.setTimeout(() => {
      document.getElementById("qu-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      (document.getElementById("qu-contact") as HTMLInputElement | null)?.focus();
    }, 40);
  }

  function closeComposer() {
    resetForm();
    setLastCreatedId(null);
    setFormOk(null);
    setFormError(null);
    setComposerOpen(false);
  }


  function createMixedTaxSample() {
    if (!tryBeginMixedOneClick()) return;
    const draftLines = mixedTaxStarterDrafts("income");
    const contactName = "Acme Pty Ltd";
    const res = createUserQuote({ contact: contactName, lines: draftsToInputs(draftLines) });
    if ("error" in res) {
      setLines(draftLines);
      setContact(contactName);
      setFormError(res.error);
      setFormOk(null);
      setLastCreatedId(null);
      return;
    }
    setPublicDocStatus("quote", res.id, res.status);
    resetForm();
    setLastCreatedId(res.id);
    setFormOk(`Created ${res.id} as Sent — email it, or open the customer link.`);
    openSend(res);
    reloadUser();
    window.setTimeout(() => {
      document.getElementById("qu-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function prefillMixedTaxDraft() {
    setLines(mixedTaxStarterDrafts("income"));
    setContact((c) => c.trim() || "Acme Pty Ltd");
    setLastCreatedId(null);
    setFormError(null);
    setFormOk("Draft prefilled — tweak if you like, then Create quote below.");
    window.setTimeout(() => {
      (document.getElementById("qu-contact") as HTMLInputElement | null)?.focus();
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

  function persistQuote(asDraft: boolean) {
    setFormError(null);
    setFormOk(null);
    const nextStatus: UserQuote["status"] = editingId ? status : asDraft ? "Draft" : "Sent";
    if (editingId) {
      const res = updateUserQuote(editingId, {
        contact,
        contactEmail,
        lines: draftsToInputs(lines),
        issueDate,
        expiryDate,
        status: nextStatus,
      });
      if ("error" in res) {
        setFormError(res.error);
        return;
      }
      setPublicDocStatus("quote", res.id, res.status);
      resetForm();
      setLastCreatedId(res.id);
      setFormOk(`Updated ${res.id}.`);
      reloadUser();
      return;
    }
    const res = createUserQuote({
      contact,
      contactEmail,
      lines: draftsToInputs(lines),
      status: nextStatus,
    });
    if ("error" in res) {
      const nudge =
        /amount|line/i.test(res.error) && !editingId
          ? " Tip: use Create sample above for a ready-made quote with GST and GST-free lines."
          : "";
      setFormError(`${res.error}${nudge}`);
      return;
    }
    const updated = updateUserQuote(res.id, {
      contact: res.contact,
      contactEmail,
      lines: draftsToInputs(lines),
      issueDate,
      expiryDate,
      status: nextStatus,
    });
    if (!("error" in updated)) {
      setPublicDocStatus("quote", updated.id, updated.status);
    }
    const created = "error" in updated ? res : updated;
    resetForm();
    setLastCreatedId(created.id);
    setFormOk(
      created.status === "Draft"
        ? `Saved ${created.id} as a draft.`
        : `Created ${created.id} as Sent — add a To email and subject to send it.`,
    );
    if (created.status !== "Draft") {
      openSend({ ...created, contactEmail: contactEmail || created.contactEmail });
    }
    reloadUser();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    persistQuote(false);
  }

  function onEdit(q: UserQuote) {
    setEditingId(q.id);
    setContact(q.contact);
    setContactEmail(q.contactEmail ?? "");
    setIssueDate(q.issueDate);
    setExpiryDate(q.expiryDate);
    // Stored workflow status in the form (not auto-Expired). Badge uses effectiveQuoteStatus.
    setStatus((quoteStatus(q.id, q.status) as UserQuote["status"]) || q.status);
    setLines(
      q.lineItems?.length
        ? lineItemsToDrafts(q.lineItems)
        : [
            emptyLineDraft({
              description: q.reference,
              unitPriceEx: String(Math.round((q.amount - q.gst) * 100) / 100),
              amountEx: String(Math.round((q.amount - q.gst) * 100) / 100),
              taxRate: q.gst > 0 ? "GST" : "GST-free",
            }),
          ],
    );
    setFormError(null);
    setLastCreatedId(null);
    setComposerOpen(true);
    setFormOk(`Editing ${q.id} — update contact, lines, dates, or status.`);
    if (typeof document !== "undefined") {
      document.getElementById("qu-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onDelete(id: string) {
    deleteUserQuote(id);
    if (editingId === id) resetForm();
    if (lastCreatedId === id) setLastCreatedId(null);
    reloadUser();
    setFormOk(`Removed ${id}. Create a new quote above if you need a fresh draft.`);
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
    <form onKeyDown={blockImplicitEnter} id="qu-form" className="card scroll-mt-4 space-y-4 p-5" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">
          {editingId ? `Edit ${editingId}` : "Create quote"}
        </h2>
        <span className="text-xs text-slate-400">
          {editingId
            ? "Same id & customer link · edit dates & status · browser only"
            : "Line amounts before GST · choose GST or GST-free on each line · issue, expiry & status · saved in this browser"}
        </span>
      </div>
      <div>
        <label className="label" htmlFor="qu-contact">
          Customer / contact
        </label>
        <input
          id="qu-contact"
          className="input"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Acme Pty Ltd"
        />
      </div>
      <div>
        <label className="label" htmlFor="qu-email">
          Customer email
        </label>
        <input
          id="qu-email"
          className="input"
          type="email"
          autoComplete="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="accounts@acme.com.au"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="qu-issue">
            Issue date
          </label>
          <input
            id="qu-issue"
            className="input"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="qu-expiry">
            Expiry date
          </label>
          <input
            id="qu-expiry"
            className="input"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="qu-status">
            Status
          </label>
          <select
            id="qu-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserQuote["status"])}
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      </div>
      <LineItemsEditor lines={lines} onChange={setLines} idPrefix="qu" />
      {formError && <p className="text-sm text-rose-300">{formError}</p>}
      {formOk && <p className="text-sm text-emerald-300">{formOk}</p>}
      {lastCreatedId && !editingId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs text-cyan-50">
          <span className="font-semibold text-white">{lastCreatedId}</span>
          <span className="text-cyan-100/80">ready — View, Send quote, or print the customer quote page</span>
          <Link
            href={publicQuoteUrl(lastCreatedId)}
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
            {copied === lastCreatedId ? "Copied" : "Send quote"}
          </button>
          <PrintDocButton kind="quote" id={lastCreatedId} compact />
          <button
            type="button"
            className="btn-primary !px-2.5 !py-1 text-xs"
            onClick={() => {
              const row = loadUserQuotes().find((q) => q.id === lastCreatedId);
              if (row) openSend(row);
            }}
          >
            <Mail size={12} />
            Send quote
          </button>
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
              href="/demo/products?from=quote#product-form"
              title="Add one product (name, price, tax), then return and pick it"
              className="btn-secondary !px-2.5 !py-1 text-xs"
            >
              <Package size={12} />
              Products
            </Link>
            <span className="text-xs text-slate-400">
              One click → Acme + GST/GST-free + customer link. Prefill to edit first. Products unlock the line picker.
            </span>
          </div>
          {!lastCreatedId && (
            <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
              Tip: <strong className="text-white">Create sample</strong> is enough for a{" "}
              <strong className="text-white">GST on Income</strong> +{" "}
              <strong className="text-white">GST Free Income</strong> demo — then{" "}
              <strong className="text-white">View</strong> for the nebula quote header.
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
              Create quote
            </>
          )}
        </button>
        {!editingId ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => persistQuote(true)}
          >
            Save as draft
          </button>
        ) : null}
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
        Prefer a fresh number? Delete the row below and create again — customer links use the document id.
      </p>
    </form>
  );

  const showComposer = Boolean(editingId) || composerOpen || Boolean(lastCreatedId);

  function pageHeader(subtitle: ReactNode) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Quotes</h1>
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
              Create quote
            </button>
          )}
        </div>
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

  function userActions(q: UserQuote) {
    return (
      <DocRowActions keep={3}>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => openSend(q)}
        >
          <Mail size={12} />
          Send quote
        </button>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => copyLink(q.id)}
          title="Copy the customer quote link to send"
        >
          <Send size={12} />
          {copied === q.id ? "Copied" : "Send quote"}
        </button>
        <Link
          href={publicQuoteUrl(q.id)}
          target="_blank"
          className="btn-secondary !px-2 !py-1 text-xs"
        >
          <ExternalLink size={12} />
          View
        </Link>
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onEdit(q)}
          title="Edit contact and line items"
        >
          <Pencil size={12} />
          Edit
        </button>
        <PrintDocButton kind="quote" id={q.id} compact />
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onDelete(q.id)}
          title="Remove from this browser — then recreate if you need a new id"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </DocRowActions>
    );
  }

  if (!usesSampleData) {
    const awaitingQuotes = userRows.filter(
      (q) => effectiveQuoteStatus({ status: q.status, expiryDate: q.expiryDate }) === "Sent",
    );
    const expiredQuotes = userRows.filter(
      (q) => effectiveQuoteStatus({ status: q.status, expiryDate: q.expiryDate }) === "Expired",
    );
    const openQuoteTotal = [...awaitingQuotes, ...expiredQuotes].reduce((sum, q) => sum + q.amount, 0);

    const listOrEmpty =
      userRows.length === 0 && !showComposer ? (
        <EmptyState
          icon={FileSignature}
          title="No quotes yet"
          description="Next: Create quote. Create sample quote makes a ready-made example with a customer link."
          showExploreSample
          actions={[
            {
              label: "Create quote",
              primary: true,
              onClick: () => openComposer(),
            },
            {
              label: "Create sample quote",
              onClick: () => createMixedTaxSample(),
            },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="Demo sample quotes stay in the guest tour — they are not copied into your organisation."
        />
      ) : userRows.length === 0 ? null : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="min-w-[14rem] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {userRows.map((q) => (
                <tr key={q.id} className="table-row">
                  <td className="px-4 py-3 font-medium">
                    {q.id}
                    <div className="text-xs text-slate-400">{q.reference}</div>
                  </td>
                  <td className="px-4 py-3">{q.contact}</td>
                  <td className="px-4 py-3">{formatDateAU(q.expiryDate)}</td>
                  <td className="px-4 py-3">
                    {formatAUD(q.amount)}
                    {showTaxTreatment && (
                      <div className="text-xs text-slate-400">
                        {docTaxTreatmentSummary(q.lineItems, q.gst)}
                        {q.gst > 0 ? ` · GST ${formatAUD(q.gst)}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={effectiveQuoteStatus({
                        status: quoteStatus(q.id, q.status) as UserQuote["status"],
                        expiryDate: q.expiryDate,
                      })}
                    />
                  </td>
                  <td className="px-4 py-3">{userActions(q)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    return (
      <div className="space-y-4">
        {sendTarget ? (
          <SendQuotePanel
            quote={sendTarget}
            onClose={() => setSendTarget(null)}
            onSent={() => {
              setUserQuoteStatus(sendTarget.id, "Sent");
              setPublicDocStatus("quote", sendTarget.id, "Sent");
              reloadUser();
            }}
          />
        ) : null}
        {pageHeader(
          userRows.length === 0 ? (
            <>
              Next: Create quote (saved in this browser). Sent quotes past expiry show Expired automatically.
            </>
          ) : (
            <>
              Open quotes: <strong className="text-cyan-200">{formatAUD(openQuoteTotal)}</strong>
              {" · "}
              {awaitingQuotes.length} awaiting
              {" · "}
              {expiredQuotes.length} expired
              {" · "}
              browser-local only
            </>
          ),
        )}
        {!showComposer && listOrEmpty}
        {showComposer && createForm}
        {showComposer && listOrEmpty}
      </div>
    );
  }

  const sampleAwaiting = sampleRows.filter(
    (q) =>
      effectiveQuoteStatus({
        status: q.status as UserQuote["status"],
        expiryDate: q.expiryDate,
      }) === "Sent",
  );
  const sampleExpired = sampleRows.filter(
    (q) =>
      effectiveQuoteStatus({
        status: q.status as UserQuote["status"],
        expiryDate: q.expiryDate,
      }) === "Expired",
  );
  const sampleOpenTotal = sampleAwaiting.reduce((sum, q) => sum + q.amount, 0);

  return (
    <div className="space-y-4">
      {sendTarget ? (
        <SendQuotePanel
          quote={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={() => {
            setUserQuoteStatus(sendTarget.id, "Sent");
            setPublicDocStatus("quote", sendTarget.id, "Sent");
            reloadUser();
          }}
        />
      ) : null}
      {pageHeader(
        <>
          Awaiting: <strong className="text-cyan-200">{formatAUD(sampleOpenTotal)}</strong>
          {" · "}
          {sampleAwaiting.length} open
          {" · "}
          {sampleExpired.length} expired
          {" · "}
          sample + your browser-local creates below
        </>,
      )}

      {showComposer && createForm}

      {userRows.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="font-semibold text-white">Your created quotes</h2>
            <p className="text-xs text-slate-400">Stored in this browser · not part of the demo sample</p>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="min-w-[14rem] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {userRows.map((q) => (
                <tr key={q.id} className="table-row">
                  <td className="px-4 py-3 font-medium">
                    {q.id}
                    <div className="text-xs text-slate-400">{q.reference}</div>
                  </td>
                  <td className="px-4 py-3">{q.contact}</td>
                  <td className="px-4 py-3">{formatDateAU(q.expiryDate)}</td>
                  <td className="px-4 py-3">
                    {formatAUD(q.amount)}
                    {showTaxTreatment && (
                      <div className="text-xs text-slate-400">
                        {docTaxTreatmentSummary(q.lineItems, q.gst)}
                        {q.gst > 0 ? ` · GST ${formatAUD(q.gst)}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                        status={effectiveQuoteStatus({
                          status: quoteStatus(q.id, q.status) as UserQuote["status"],
                          expiryDate: q.expiryDate,
                        })}
                      />
                  </td>
                  <td className="px-4 py-3">{userActions(q)}</td>
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
            Send quote copies the customer link. View opens the public page. Print sits under More. QU-210 is a mixed GST + GST Free example.
          </p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Quote</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sampleRows.map((q) => (
              <tr key={q.id} className="table-row">
                <td className="px-4 py-3 font-medium">
                  {q.id}
                  <div className="text-xs text-slate-400">{q.reference}</div>
                </td>
                <td className="px-4 py-3">{q.contact}</td>
                <td className="px-4 py-3">{formatDateAU(q.expiryDate)}</td>
                <td className="px-4 py-3">
                  {formatAUD(q.amount)}
                  {showTaxTreatment && (
                    <div className="text-xs text-slate-400">
                      {docTaxTreatmentSummary(
                        "lineItems" in q ? q.lineItems : undefined,
                        q.gst,
                      )}
                      {q.gst > 0 ? ` · GST ${formatAUD(q.gst)}` : ""}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={effectiveQuoteStatus({
                      status: q.status as UserQuote["status"],
                      expiryDate: q.expiryDate,
                    })}
                  />
                </td>
                <td className="px-4 py-3">
                  <DocRowActions keep={2}>
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => copyLink(q.id)}
                      title="Copy the customer quote link to send"
                    >
                      <Send size={12} />
                      {copied === q.id ? "Copied" : "Send quote"}
                    </button>
                    <Link
                      href={publicQuoteUrl(q.id)}
                      target="_blank"
                      className="btn-secondary !px-2 !py-1 text-xs"
                    >
                      <ExternalLink size={12} />
                      View
                    </Link>
                    <PrintDocButton kind="quote" id={q.id} compact />
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() =>
                        openSend({
                          id: q.id,
                          contact: q.contact,
                          amount: q.amount,
                        })
                      }
                    >
                      <Mail size={12} />
                      Send quote
                    </button>
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
