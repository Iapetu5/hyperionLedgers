"use client";

import { FormEvent, useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Banknote, Check, Package, Pencil, Plus, Receipt, Trash2, Undo2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { DocRowActions } from "@/components/demo/DocRowActions";
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
import { PrintBillButton } from "@/components/pay/PrintBillButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAUD, formatDateAU, todayISO, plusDaysISO } from "@/lib/format";
import { docLineTaxLabel, docTaxTreatmentSummary } from "@/lib/public-docs";
import { bills } from "@/lib/sample-data";
import {
  createUserBill,
  deleteUserBill,
  effectiveBillStatus,
  effectiveSampleBillStatus,
  getSampleBillStatus,
  loadUserBills,
  setSampleBillStatus,
  setUserBillStatus,
  updateUserBill,
  type UserBill
} from "@/lib/user-docs";

export default function BillsPage() {
  const { usesSampleData } = useAuth();
  const [userRows, setUserRows] = useState<UserBill[]>([]);
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLineDraft()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  /** After create — Approve / Mark paid strip so first session does not hunt the table */
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  /** List-first: create form collapsed until New / Edit / mixed-tax / post-create. */
  const [composerOpen, setComposerOpen] = useState(false);
  const [sampleTick, setSampleTick] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [billDate, setBillDate] = useState(() => todayISO());
  const [dueDate, setDueDate] = useState(() => plusDaysISO(14));
  const [status, setStatus] = useState<UserBill["status"]>("Awaiting approval");

  const reloadUser = useCallback(() => setUserRows(loadUserBills()), []);

  useEffect(() => {
    reloadUser();
    const onUpdate = () => {
      reloadUser();
      setSampleTick((t) => t + 1);
    };
    window.addEventListener("hl-user-docs-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("hl-user-docs-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reloadUser]);

  /** Gate localStorage sample-bill overrides until after mount (SSR HTML matches first paint). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function sampleBillStored(id: string, fallback: string) {
    return mounted ? getSampleBillStatus(id, fallback) : fallback;
  }

  function sampleBillDisplay(id: string, fallback: string, dueDate: string) {
    if (mounted) return effectiveSampleBillStatus(id, fallback, dueDate);
    return effectiveBillStatus({ status: fallback as UserBill["status"], dueDate });
  }

  function defaultBillDate() {
    return todayISO();
  }
  function defaultDue() {
    return plusDaysISO(14);
  }

  function resetForm() {
    setSupplier("");
    setLines([emptyLineDraft()]);
    setEditingId(null);
    setBillDate(defaultBillDate());
    setDueDate(defaultDue());
    setStatus("Awaiting approval");
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
      document.getElementById("bill-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      (document.getElementById("bill-supplier") as HTMLInputElement | null)?.focus();
    }, 40);
  }

  function closeComposer() {
    resetForm();
    setLastCreatedId(null);
    setFormOk(null);
    setFormError(null);
    setComposerOpen(false);
  }

  /** One-click: OfficeNest + GST/GST-free expense lines → Approve / Mark paid strip. */
  function createMixedTaxSample() {
    if (!tryBeginMixedOneClick()) return;
    const draftLines = mixedTaxStarterDrafts("expense");
    const supplierName = "OfficeNest Supplies Pty Ltd";
    const res = createUserBill({ supplier: supplierName, lines: draftsToInputs(draftLines) });
    if ("error" in res) {
      setLines(draftLines);
      setSupplier(supplierName);
      setFormError(res.error);
      setFormOk(null);
      setLastCreatedId(null);
      return;
    }
    resetForm();
    setLastCreatedId(res.id);
    setComposerOpen(true);
    setFormOk(`Created ${res.id} with mixed GST on Expenses + GST Free Expenses — Approve / Mark paid below.`);
    reloadUser();
    window.setTimeout(() => {
      document.getElementById("bill-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function prefillMixedTaxDraft() {
    setComposerOpen(true);
    setLines(mixedTaxStarterDrafts("expense"));
    setSupplier((s) => s.trim() || "OfficeNest Supplies Pty Ltd");
    setLastCreatedId(null);
    setFormError(null);
    setFormOk("Draft prefilled — tweak if you like, then Create bill below.");
    window.setTimeout(() => {
      (document.getElementById("bill-supplier") as HTMLInputElement | null)?.focus();
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
    setFormError(null);
    setFormOk(null);
    if (editingId) {
      const res = updateUserBill(editingId, {
        supplier,
        lines: draftsToInputs(lines),
        date: billDate,
        dueDate,
        status,
      });
      if ("error" in res) {
        setFormError(res.error);
        return;
      }
      resetForm();
      setLastCreatedId(res.id);
      setComposerOpen(true);
      setFormOk(`Updated ${res.id}.`);
      reloadUser();
      return;
    }
    const res = createUserBill({
      supplier,
      lines: draftsToInputs(lines),
    });
    if ("error" in res) {
      const nudge =
        /amount|line/i.test(res.error) && !editingId
          ? " Tip: use Create sample above for a ready-made bill with GST and GST-free lines."
          : "";
      setFormError(`${res.error}${nudge}`);
      return;
    }
    const updated = updateUserBill(res.id, {
      supplier: res.supplier,
      lines: draftsToInputs(lines),
      date: billDate,
      dueDate,
      status,
    });
    const createdId = "error" in updated ? res.id : updated.id;
    resetForm();
    setLastCreatedId(createdId);
    setComposerOpen(true);
    setFormOk(`Created ${createdId}.`);
    reloadUser();
  }

  function onEdit(b: UserBill) {
    setEditingId(b.id);
    setSupplier(b.supplier);
    setBillDate(b.date);
    setDueDate(b.dueDate);
    setStatus(b.status === "Overdue" ? "Approved" : b.status);
    setLines(
      b.lineItems?.length
        ? lineItemsToDrafts(b.lineItems)
        : [
            emptyLineDraft({
              description: b.category,
              unitPriceEx: String(Math.round((b.amount - b.gst) * 100) / 100),
              amountEx: String(Math.round((b.amount - b.gst) * 100) / 100),
              taxRate: b.gst > 0 ? "GST" : "GST-free",
            }),
          ],
    );
    setFormError(null);
    setLastCreatedId(null);
    setComposerOpen(true);
    setFormOk(`Editing ${b.id} — update supplier, lines, dates, or status. Delete still removes it.`);
    if (typeof document !== "undefined") {
      document.getElementById("bill-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onDelete(id: string) {
    deleteUserBill(id);
    if (editingId === id) resetForm();
    if (lastCreatedId === id) setLastCreatedId(null);
    reloadUser();
    setFormOk(`Removed ${id}. Create again above if you need a fresh draft.`);
  }

  function onSetStatus(id: string, next: UserBill["status"]) {
    const row = setUserBillStatus(id, next);
    reloadUser();
    if (!row) return;
    if (next === "Paid") {
      setFormOk(
        `${row.id} marked Paid (back office only — no public pay link). Print stays on the row for an internal summary.`,
      );
    } else {
      setFormOk(`${row.id} marked ${next} (back office only — no public pay link).`);
    }
  }

  function onSampleStatus(id: string, next: UserBill["status"]) {
    setSampleBillStatus(id, next);
    setSampleTick((t) => t + 1);
    if (next === "Paid") {
      setFormOk(
        `Sample ${id} marked Paid in this browser (demo back office). Print stays on the row — internal summary only, no public pay link.`,
      );
    } else {
      setFormOk(`Sample ${id} marked ${next} in this browser (demo back office).`);
    }
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
    <form onKeyDown={blockImplicitEnter} id="bill-form" className="card scroll-mt-4 space-y-4 p-5" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">
          {editingId ? `Edit ${editingId}` : "Create bill"}
        </h2>
        <span className="text-xs text-slate-400">
          {editingId
            ? "Same id · edit lines, dates & status · browser only"
            : "Line amounts before GST · choose GST or GST-free on each line · due in 14 days"}
        </span>
      </div>
      <div>
        <label className="label" htmlFor="bill-supplier">
          Supplier
        </label>
        <input
          id="bill-supplier"
          className="input"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="e.g. OfficeNest Supplies Pty Ltd"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="bill-date">
            Bill date
          </label>
          <input
            id="bill-date"
            className="input"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bill-due">
            Due date
          </label>
          <input
            id="bill-due"
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="bill-status">
            Status
          </label>
          <select
            id="bill-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserBill["status"])}
          >
            <option value="Awaiting approval">Awaiting approval</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>
      <LineItemsEditor
        lines={lines}
        onChange={setLines}
        idPrefix="bill"
        taxScope="expense"
        amountHint="Amount (ex tax)"
      />
      <p className="text-xs text-slate-400">
        First line description is used as the bill category when you don&apos;t set a single-line reference. Line tax uses Xero{" "}
        <span className="text-slate-300">GST on Expenses</span> / <span className="text-slate-300">GST Free Expenses</span>.
      </p>
      {formError && <p className="text-sm text-rose-300">{formError}</p>}
      {formOk && <p className="text-sm text-emerald-300">{formOk}</p>}
      {lastCreatedId && !editingId && (() => {
        const row = userRows.find((r) => r.id === lastCreatedId);
        // Badge uses effective (auto-Overdue); workflow buttons use stored status so
        // past-due "Awaiting approval" still shows Approve — not Undo Approve.
        const stored = row?.status ?? status;
        const st = row ? effectiveBillStatus(row) : status;
        const paid = st === "Paid";
        return (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs text-cyan-50">
            <span className="font-semibold text-white">{lastCreatedId}</span>
            <span className="text-cyan-100/80">back office — no public pay link</span>
            <StatusBadge status={st} />
            {stored === "Awaiting approval" && !paid && (
              <button
                type="button"
                className="btn-secondary !px-2.5 !py-1 text-xs"
                onClick={() => onSetStatus(lastCreatedId, "Approved")}
              >
                <Check size={12} />
                Approve
              </button>
            )}
            {(stored === "Approved" || stored === "Overdue") && !paid && (
              <button
                type="button"
                className="btn-secondary !px-2.5 !py-1 text-xs"
                onClick={() => onSetStatus(lastCreatedId, "Awaiting approval")}
                title="Undo approve — back to Awaiting approval"
              >
                <Undo2 size={12} />
                Undo Approve
              </button>
            )}
            {!paid && (
              <button
                type="button"
                className="btn-primary !px-2.5 !py-1 text-xs"
                onClick={() => onSetStatus(lastCreatedId, "Paid")}
              >
                <Banknote size={12} />
                Mark paid
              </button>
            )}
            {paid ? (
              <>
                <PrintBillButton id={lastCreatedId} compact primary />
                <button
                  type="button"
                  className="btn-secondary !px-2.5 !py-1 text-xs"
                  onClick={() => onSetStatus(lastCreatedId, "Approved")}
                >
                  <Undo2 size={12} />
                  Undo paid
                </button>
              </>
            ) : (
              <PrintBillButton id={lastCreatedId} compact />
            )}
          </div>
        );
      })()}
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
              href="/demo/products?from=bill#product-form"
              title="Add one product (name, price, tax), then return and pick it"
              className="btn-secondary !px-2.5 !py-1 text-xs"
            >
              <Package size={12} />
              Products
            </Link>
            <span className="text-xs text-slate-400">
              One click → OfficeNest + GST/GST-free expenses + status strip. Prefill to edit first. Products unlock the line picker.
            </span>
          </div>
          {!lastCreatedId && (
            <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
              Tip: <strong className="text-white">Create sample</strong> is enough for a{" "}
              <strong className="text-white">GST on Expenses</strong> +{" "}
              <strong className="text-white">GST Free Expenses</strong> demo — then{" "}
              <strong className="text-white">Approve</strong> / <strong className="text-white">Mark paid</strong> /{" "}
              <strong className="text-white">Print</strong> on the status strip (back office only — no public pay).
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
              Create bill
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
      <p className="text-xs text-slate-400">Prefer a fresh number? Delete the row below and create again.</p>
    </form>
  );
  const showComposer = Boolean(editingId) || composerOpen || Boolean(lastCreatedId);

  function pageHeader(subtitle: ReactNode) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Bills</h1>
          <BooksSectionNav />
          <p className="text-sm text-white/70">{subtitle}</p>
        </div>
        {!showComposer && (
          <button type="button" className="btn-primary shrink-0" onClick={() => openComposer()}>
            <Plus size={16} />
            New bill
          </button>
        )}
      </div>
    );
  }



  function userActions(b: UserBill) {
    const paid = effectiveBillStatus(b) === "Paid";
    return (
      <DocRowActions keep={3}>
        {paid && <PrintBillButton id={b.id} compact primary />}
        {b.status === "Awaiting approval" && (
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-xs"
            onClick={() => onSetStatus(b.id, "Approved")}
            title="Approve in back office"
          >
            <Check size={12} />
            Approve
          </button>
        )}
        {(b.status === "Approved" || b.status === "Overdue") && !paid && (
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-xs"
            onClick={() => onSetStatus(b.id, "Awaiting approval")}
            title="Undo approve — back to Awaiting approval"
          >
            <Undo2 size={12} />
            Undo Approve
          </button>
        )}
        {!paid && (
          <button
            type="button"
            className="btn-primary !px-2 !py-1 text-xs"
            onClick={() => onSetStatus(b.id, "Paid")}
            title="Record payment in back office (demo only)"
          >
            <Banknote size={12} />
            Mark paid
          </button>
        )}
        {paid && (
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-xs"
            onClick={() => onSetStatus(b.id, "Approved")}
            title="Undo paid — back to Approved"
          >
            <Undo2 size={12} />
            Undo paid
          </button>
        )}
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onEdit(b)}
          title="Edit supplier, lines, dates, and status"
        >
          <Pencil size={12} />
          Edit
        </button>
        {!paid && <PrintBillButton id={b.id} compact />}
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          onClick={() => onDelete(b.id)}
          title="Remove from this browser — then recreate if you need a new id"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </DocRowActions>
    );
  }

  function userTable() {
    return (
      <div className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Tax</th>
              <th className="px-4 py-3">Status</th>
              <th className="min-w-[14rem] px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {userRows.map((b) => (
              <tr key={b.id} className="table-row">
                <td className="px-4 py-3 font-medium">
                  {b.id}
                  <div className="text-xs text-slate-400">{b.category}</div>
                  {b.lineItems && b.lineItems.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-[11px] font-normal text-slate-500">
                      {b.lineItems.map((li, i) => (
                        <li key={i} className="break-words">
                          {li.description}
                          <span className="text-slate-600"> · {docLineTaxLabel(li.taxRate, "expense")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] font-normal text-slate-500">Summary only — no line tax breakdown</p>
                  )}
                </td>
                <td className="px-4 py-3">{b.supplier}</td>
                <td className="px-4 py-3">{formatDateAU(b.dueDate)}</td>
                <td className="px-4 py-3">
                  {formatAUD(b.amount)}
                  <div className="text-xs text-slate-400">GST {formatAUD(b.gst)}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-300">
                  {docTaxTreatmentSummary(b.lineItems, b.gst, "expense")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={effectiveBillStatus(b)} />
                </td>
                <td className="px-4 py-3 align-top">{userActions(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!usesSampleData) {
    const overdueUserBills = userRows.filter(
      (b) => effectiveBillStatus({ status: b.status, dueDate: b.dueDate }) === "Overdue",
    );
    const overdueUserTotal = overdueUserBills.reduce((sum, b) => sum + b.amount, 0);
    const openUserTotal = userRows
      .filter((b) => effectiveBillStatus({ status: b.status, dueDate: b.dueDate }) !== "Paid")
      .reduce((sum, b) => sum + b.amount, 0);

    const listOrEmpty =
      userRows.length === 0 && !showComposer ? (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Create a supplier bill, or start from a ready-made example you can approve or mark paid."
          showExploreSample
          actions={[
            {
              label: "Create sample bill",
              primary: true,
              onClick: () => createMixedTaxSample(),
            },
            {
              label: "New bill",
              onClick: () => openComposer(),
            },
            { label: "Back to overview", href: "/demo" },
          ]}
          hint="Demo sample bills stay in the guest tour — they are not copied into your organisation."
        />
      ) : userRows.length === 0 ? null : (
        userTable()
      );

    return (
      <div className="space-y-4">
        {pageHeader(
          userRows.length === 0 ? (
            <>
              Add a supplier bill, edit lines later, Approve or Mark paid in back office (no public pay). Past-due unpaid bills show Overdue automatically. Or try a demo for sample payables.
            </>
          ) : (
            <>
              Overdue total: <strong className="text-rose-200">{formatAUD(overdueUserTotal)}</strong>
              {" · "}
              Open payables: {formatAUD(openUserTotal)}
              {" · "}
              {overdueUserBills.length} overdue
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

  const overdueBills = bills.filter(
    (b) => sampleBillDisplay(b.id, b.status, b.dueDate) === "Overdue",
  );
  const overdueCount = overdueBills.length;
  const overdueTotal = overdueBills.reduce((sum, b) => sum + b.amount, 0);
  const dueSoonTotal = bills
    .filter((b) => {
      const st = sampleBillDisplay(b.id, b.status, b.dueDate);
      return st === "Awaiting approval" || st === "Approved";
    })
    .reduce((sum, b) => sum + b.amount, 0);
  void sampleTick;

  return (
    <div className="space-y-4">
      {pageHeader(
        <>
          Overdue: <strong className="text-rose-200">{formatAUD(overdueTotal)}</strong>
          {" · "}
          {overdueCount} overdue
          {" · "}
          Due soon: {formatAUD(dueSoonTotal)}
          {" · "}
          sample + your browser-local creates below
        </>,
      )}

      {showComposer && createForm}


      {userRows.length > 0 && (
        <div className="space-y-2">
          <div className="border-b border-white/10 px-1 py-1">
            <h2 className="font-semibold text-white">Your created bills</h2>
            <p className="text-xs text-slate-400">Stored in this browser · not part of the demo sample</p>
          </div>
          {userTable()}
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Demo sample</h2>
          <p className="text-xs text-slate-400">
            Line amounts before GST; choose GST or GST-free per line. Approve awaiting rows, then mark paid (saved in this browser). Print is an internal summary only — no public supplier pay link. Past-due unpaid rows show Overdue.
          </p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Tax</th>
              <th className="px-4 py-3">Status</th>
              <th className="min-w-[12rem] px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {bills.map((b) => {
              const st = sampleBillDisplay(b.id, b.status, b.dueDate);
              const lineList = "lineItems" in b ? b.lineItems : undefined;
              const taxSummary = docTaxTreatmentSummary(lineList, b.gst, "expense");
              return (
                <tr key={b.id} className="table-row">
                  <td className="px-4 py-3 font-medium">
                    {b.id}
                    <div className="text-xs text-slate-400">{b.category}</div>
                    {lineList && lineList.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[11px] font-normal text-slate-500">
                        {lineList.map((li, i) => (
                          <li key={i} className="break-words">
                            {li.description}
                            <span className="text-slate-600"> · {docLineTaxLabel(li.taxRate, "expense")}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[11px] font-normal text-slate-500">Summary only — no line tax breakdown</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{b.supplier}</td>
                  <td className="px-4 py-3">{formatDateAU(b.dueDate)}</td>
                  <td className="px-4 py-3">
                    {formatAUD(b.amount)}
                    <div className="text-xs text-slate-400">GST {formatAUD(b.gst)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{taxSummary}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={st} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <DocRowActions keep={3}>
                      {st === "Paid" && <PrintBillButton id={b.id} compact primary />}
                      {(sampleBillStored(b.id, b.status) === "Awaiting approval" ||
                        st === "Awaiting approval") &&
                        st !== "Paid" && (
                        <button
                          type="button"
                          className="btn-secondary !px-2 !py-1 text-xs"
                          onClick={() => onSampleStatus(b.id, "Approved")}
                          title="Approve in demo back office"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                      )}
                      {(sampleBillStored(b.id, b.status) === "Approved" ||
                        sampleBillStored(b.id, b.status) === "Overdue" ||
                        st === "Approved" ||
                        st === "Overdue") &&
                        st !== "Paid" &&
                        sampleBillStored(b.id, b.status) !== "Awaiting approval" && (
                        <button
                          type="button"
                          className="btn-secondary !px-2 !py-1 text-xs"
                          onClick={() => onSampleStatus(b.id, "Awaiting approval")}
                          title="Undo approve — back to Awaiting approval"
                        >
                          <Undo2 size={12} />
                          Undo Approve
                        </button>
                      )}
                      {st !== "Paid" && (
                        <button
                          type="button"
                          className="btn-primary !px-2 !py-1 text-xs"
                          onClick={() => onSampleStatus(b.id, "Paid")}
                          title="Record payment in demo back office"
                        >
                          <Banknote size={12} />
                          Mark paid
                        </button>
                      )}
                      {st === "Paid" && (
                        <button
                          type="button"
                          className="btn-secondary !px-2 !py-1 text-xs"
                          onClick={() => onSampleStatus(b.id, "Approved")}
                          title="Undo paid"
                        >
                          <Undo2 size={12} />
                          Undo paid
                        </button>
                      )}
                      {st !== "Paid" && <PrintBillButton id={b.id} compact />}
                    </DocRowActions>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
