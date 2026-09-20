"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Undo2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { openAssistant } from "@/components/demo/AiAssistant";
import { formatAUD, formatDateAU } from "@/lib/format";
import { accounts } from "@/lib/sample-data";
import { suggestCategory } from "@/lib/chart-of-accounts";
import {
  parseBankCsv,
  SAMPLE_CSV_PATH,
  SAMPLE_CSV_TEXT,
  BLANK_SAMPLE_CSV_PATH,
  BLANK_SAMPLE_CSV_TEXT,
  SAMPLE_DEBIT_CREDIT_CSV_PATH,
  SAMPLE_DEBIT_CREDIT_CSV_TEXT,
  BLANK_DEBIT_CREDIT_CSV_PATH,
  BLANK_DEBIT_CREDIT_CSV_TEXT,
  type ParsedBankRow,
  type ParseBankCsvSkip,
} from "@/lib/bank-csv";
import {
  appendImportedRows,
  applyCategoryToTransaction,
  blankChequeBalance,
  blankChequeMovements,
  clearCategoryFromTransaction,
  clearBlankOpeningBalance,
  clearImportedTransactions,
  getBlankOpeningBalance,
  hasBlankOpeningBalance,
  inferOpeningFromParsedRows,
  loadBankTransactions,
  resetAllCategorisations,
  setBlankOpeningBalance,
  unmatchedForAccount,
  CHEQUE_ACCOUNT_ID,
  BLANK_CHEQUE_ACCOUNT_ID,
  type BankLedgerMode,
  type BankTransaction,
} from "@/lib/bank-transactions";

function reconcileLabel(count: number) {
  return count === 1 ? "1 item to reconcile" : `${count} items to reconcile`;
}

export default function BankingPage() {
  const { usesSampleData, user } = useAuth();
  const mode: BankLedgerMode = usesSampleData ? "sample" : "blank";
  const chequeAccountId = mode === "blank" ? BLANK_CHEQUE_ACCOUNT_ID : CHEQUE_ACCOUNT_ID;
  const fileRef = useRef<HTMLInputElement>(null);
  const openingInputRef = useRef<HTMLInputElement>(null);
  const importSectionRef = useRef<HTMLDivElement>(null);
  const reconSectionRef = useRef<HTMLDivElement>(null);

  const [txns, setTxns] = useState<BankTransaction[]>([]);
  const [preview, setPreview] = useState<ParsedBankRow[] | null>(null);
  const [skipped, setSkipped] = useState<ParseBankCsvSkip[]>([]);
  /** Skipped rows restated on the post-import emerald banner (preview amber clears after confirm). */
  const [successSkipped, setSuccessSkipped] = useState<ParseBankCsvSkip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [openingDraft, setOpeningDraft] = useState("");
  const [opening, setOpening] = useState(0);
  const [openingSet, setOpeningSet] = useState(false);
  const [ledgerReady, setLedgerReady] = useState(false);

  const reload = useCallback(() => {
    setTxns(loadBankTransactions(mode));
    if (mode === "blank") {
      const hasOpening = hasBlankOpeningBalance();
      const o = getBlankOpeningBalance();
      setOpeningSet(hasOpening);
      setOpening(o);
      setOpeningDraft(hasOpening ? String(o) : "");
    } else {
      setOpeningSet(false);
      setOpening(0);
      setOpeningDraft("");
    }
  }, [mode]);

  useEffect(() => {
    reload();
    setLedgerReady(true);
  }, [reload]);

  // Drop in-progress import preview when switching Harbour sample ↔ blank cheque
  useEffect(() => {
    setPreview(null);
    setSkipped([]);
    setFileName(null);
    setError(null);
    setSuccess(null);
    setSuccessSkipped([]);
    if (fileRef.current) fileRef.current.value = "";
  }, [mode]);

  useEffect(() => {
    const onUpdate = () => reload();
    window.addEventListener("hl-bank-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("hl-bank-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.location.hash === "#import" ||
      new URLSearchParams(window.location.search).get("import") === "1"
    ) {
      importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const unmatched = useMemo(
    () => unmatchedForAccount(txns, chequeAccountId),
    [txns, chequeAccountId],
  );
  const categorised = useMemo(
    () => txns.filter((t) => t.accountId === chequeAccountId && t.matched && t.accountCode),
    [txns, chequeAccountId],
  );
  const sampleCheque = accounts.find((a) => a.id === CHEQUE_ACCOUNT_ID);
  const importedCount = unmatched.filter((t) => t.source === "import").length;
  const canAskAi = unmatched.length > 0;
  const blankMovements = useMemo(() => blankChequeMovements(txns), [txns]);
  const blankBalance = useMemo(() => blankChequeBalance(txns, opening), [txns, opening]);
  const orgLabel = user?.businessName?.trim() || "Your organisation";

  const sampleCsvPath = mode === "blank" ? BLANK_SAMPLE_CSV_PATH : SAMPLE_CSV_PATH;
  const sampleCsvText = mode === "blank" ? BLANK_SAMPLE_CSV_TEXT : SAMPLE_CSV_TEXT;
  const sampleCsvDownloadName =
    mode === "blank" ? "blank-bank-statement.csv" : "sample-bank-statement.csv";
  const debitCreditCsvPath =
    mode === "blank" ? BLANK_DEBIT_CREDIT_CSV_PATH : SAMPLE_DEBIT_CREDIT_CSV_PATH;
  const debitCreditCsvText =
    mode === "blank" ? BLANK_DEBIT_CREDIT_CSV_TEXT : SAMPLE_DEBIT_CREDIT_CSV_TEXT;
  const debitCreditDownloadName =
    mode === "blank"
      ? "blank-bank-statement-debit-credit.csv"
      : "sample-bank-statement-debit-credit.csv";

  function applyParsed(text: string, label: string) {
    const result = parseBankCsv(text);
    if (!result.ok) {
      setError(result.error);
      setPreview(null);
      setSkipped([]);
      return;
    }
    setFileName(label);
    setPreview(result.rows);
    setSkipped(result.skipped);
    setError(null);
    if (result.skipped.length > 0) {
      setSuccess(null);
      setSuccessSkipped([]);
    }
  }

  async function onFileSelected(file: File | null) {
    setSuccess(null);
    setSuccessSkipped([]);
    setPreview(null);
    setSkipped([]);
    setError(null);
    setFileName(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "application/vnd.ms-excel"
    ) {
      setError("Please upload a .csv bank statement file.");
      return;
    }
    if (file.size === 0) {
      setError("This file is empty. Upload a CSV with date, description and amount columns.");
      return;
    }
    if (file.size > 2_000_000) {
      setError("File is too large for this demo (max 2 MB).");
      return;
    }
    const text = await file.text();
    applyParsed(text, file.name);
  }

  async function loadSampleCsv(kind: "amount" | "debit-credit" = "amount") {
    setSuccess(null);
    setSuccessSkipped([]);
    setError(null);
    setPreview(null);
    setSkipped([]);
    setFileName(null);
    setLoadingSample(true);
    const path = kind === "debit-credit" ? debitCreditCsvPath : sampleCsvPath;
    const embedded = kind === "debit-credit" ? debitCreditCsvText : sampleCsvText;
    const downloadName = kind === "debit-credit" ? debitCreditDownloadName : sampleCsvDownloadName;
    try {
      let text = embedded;
      try {
        const res = await fetch(path);
        if (res.ok) {
          const fetched = await res.text();
          if (fetched.trim()) text = fetched;
        }
      } catch {
        /* use embedded text */
      }
      applyParsed(text, downloadName);
    } catch {
      setError("Could not load the sample CSV. Try downloading it and uploading manually.");
    } finally {
      setLoadingSample(false);
    }
  }

  function confirmImport() {
    if (!preview?.length) return;
    const beforeImportCount = loadBankTransactions(mode).filter((x) => x.source === "import").length;
    const skippedSnapshot = skipped;
    let openingNote = "";
    if (mode === "blank" && !hasBlankOpeningBalance()) {
      const inferred = inferOpeningFromParsedRows(preview);
      if (inferred != null) {
        setBlankOpeningBalance(inferred);
        setOpening(inferred);
        setOpeningSet(true);
        setOpeningDraft(String(inferred));
        openingNote = ` Opening balance set to ${formatAUD(inferred)} from the CSV running balance (only because none was saved yet).`;
      }
    }
    const next = appendImportedRows(preview, chequeAccountId, mode);
    const added = next.filter((x) => x.source === "import").length - beforeImportCount;
    setTxns(next);
    setSuccess(
      added === 0
        ? `No new rows to import — those transactions are already on this cheque account.${openingNote}`
        : `Imported ${added} transaction${added === 1 ? "" : "s"} into your cheque account — they now appear as unmatched below.${openingNote}`,
    );
    setSuccessSkipped(skippedSnapshot);
    setPreview(null);
    setSkipped([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
    requestAnimationFrame(() => {
      reconSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function saveOpening() {
    const raw = openingDraft.trim();
    if (raw === "") {
      setError("Enter an opening balance (use Clear opening to leave it unset).");
      setSuccess(null);
      setSuccessSkipped([]);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setError("Opening balance must be a number.");
      setSuccess(null);
      setSuccessSkipped([]);
      return;
    }
    const saved = setBlankOpeningBalance(n);
    setOpening(saved);
    setOpeningSet(true);
    setOpeningDraft(String(saved));
    setError(null);
    setSuccessSkipped([]);
    setSuccess(`Opening balance saved as ${formatAUD(saved)}. Cash total = opening + categorised movements.`);
  }

  function cancelPreview() {
    setPreview(null);
    setSkipped([]);
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function quickApply(t: BankTransaction) {
    const suggestion = suggestCategory(t.description, t.amount);
    if (suggestion.confidence === "low") {
      openAssistant(`Categorise unmatched bank line: ${t.description}`);
      return;
    }
    const updated = applyCategoryToTransaction(t.id, suggestion);
    if (!updated) {
      setError(`Could not apply a category to “${t.description}”. Try refreshing Banking.`);
      setSuccess(null);
      setSuccessSkipped([]);
      return;
    }
    setTxns((prev) => {
      const next = prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row));
      return next.some((row) => row.id === updated.id) ? next : loadBankTransactions(mode);
    });
    setError(null);
    setSuccessSkipped([]);
    const remaining = unmatchedForAccount(
      loadBankTransactions(mode),
      chequeAccountId,
    ).length;
    setSuccess(
      `Applied ${suggestion.accountCode} — ${suggestion.accountName} to “${t.description}”. ${
        remaining > 0
          ? `${remaining} unmatched line${remaining === 1 ? "" : "s"} remain — apply the next suggestion below.`
          : "All caught up — review it under Recently categorised, or Unmatch anytime."
      }`,
    );
  }

  function applyAllHighConfidence() {
    const lines = unmatchedForAccount(loadBankTransactions(mode), chequeAccountId);
    let applied = 0;
    for (const t of lines) {
      const suggestion = suggestCategory(t.description, t.amount);
      if (suggestion.confidence !== "high") continue;
      if (applyCategoryToTransaction(t.id, suggestion)) applied += 1;
    }
    setTxns(loadBankTransactions(mode));
    setError(null);
    setSuccessSkipped([]);
    const remaining = unmatchedForAccount(loadBankTransactions(mode), chequeAccountId).length;
    setSuccess(
      applied === 0
        ? "No high-confidence suggestions left — use Ask AI on a remaining line, or import another statement."
        : `Applied ${applied} high-confidence categorisation${applied === 1 ? "" : "s"}. ${
            remaining > 0
              ? `${remaining} unmatched line${remaining === 1 ? "" : "s"} remain — use Ask AI for anything uncertain.`
              : "All caught up — review them under Recently categorised, or Unmatch anytime."
          }`,
    );
  }

  function unmatch(t: BankTransaction) {
    const updated = clearCategoryFromTransaction(t.id);
    if (!updated) {
      setError(`Could not unmatch “${t.description}”.`);
      setSuccess(null);
      setSuccessSkipped([]);
      return;
    }
    setTxns(loadBankTransactions(mode));
    setError(null);
    setSuccessSkipped([]);
    setSuccess(`Unmatched “${t.description}” — back in the reconciliation queue.`);
  }

  function resetCats() {
    const n = resetAllCategorisations(mode);
    setTxns(loadBankTransactions(mode));
    setError(null);
    setSuccessSkipped([]);
    setSuccess(
      n === 0
        ? "No categorisations to reset."
        : `Reset ${n} categorisation${n === 1 ? "" : "s"} — lines are unmatched again.`,
    );
  }

  function clearImports() {
    const n = clearImportedTransactions(mode);
    setTxns(loadBankTransactions(mode));
    setError(null);
    setSuccessSkipped([]);
    setSuccess(
      n === 0
        ? "No CSV imports to clear."
        : mode === "blank"
          ? `Cleared ${n} imported row${n === 1 ? "" : "s"}. Opening balance was left as-is — use Clear opening if you want that gone too.`
          : `Cleared ${n} imported row${n === 1 ? "" : "s"} (demo sample lines kept).`,
    );
  }

  function clearOpening() {
    const cleared = clearBlankOpeningBalance();
    setOpening(0);
    setOpeningSet(false);
    setOpeningDraft("");
    setError(null);
    setSuccessSkipped([]);
    setSuccess(cleared ? "Opening balance cleared — cash total is movements only until you save one again." : "Opening balance was already unset.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Banking</h1>
          <p className="text-sm text-white/70">
            {mode === "blank"
              ? `${orgLabel} cheque account — browser-side CSV only. No live bank feeds, and demo sample lines stay out of this blank ledger.`
              : "Sample balances and browser-side CSV import only — no live bank feeds or APIs."}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary !border-white/30 !bg-white/10 !text-white hover:!bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:!bg-white/10"
          onClick={() => openAssistant("Categorise unmatched bank lines")}
          disabled={!canAskAi}
          title={canAskAi ? "Ask AI to suggest account codes for unmatched lines" : "Nothing to categorise — import or unmatch a bank line first"}
        >
          <Sparkles size={16} />
          {canAskAi ? "Ask AI: categorise" : "Ask AI: nothing to categorise"}
        </button>
      </div>

      {mode === "blank" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <p className="font-semibold text-white">Business cheque account</p>
            <p className="text-xs text-slate-400">
              {orgLabel} · demo account (browser only)
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Cash total</p>
            <p className="mt-1 text-2xl font-bold text-white">{formatAUD(blankBalance)}</p>
            <p className="mt-2 text-sm text-slate-300">
              Opening{" "}
              {openingSet ? (
                formatAUD(opening)
              ) : (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-100">
                  Not set
                </span>
              )}
              {" · "}
              Movements {formatAUD(blankMovements)}
              {" · "}
              <span className="text-slate-400">cash = opening + movements</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {!ledgerReady
                ? "Loading…"
                : unmatched.length > 0
                  ? reconcileLabel(unmatched.length)
                  : txns.length === 0
                    ? "No transactions yet — set opening or import a CSV"
                    : "Reconciled"}
              {importedCount > 0 ? ` · ${importedCount} unmatched from CSV` : ""}
              {categorised.length > 0 ? ` · ${categorised.length} categorised` : ""}
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4">
              <div className="min-w-[10rem] flex-1">
                <label className="label" htmlFor="blank-opening">
                  Opening balance
                </label>
                <input
                  ref={openingInputRef}
                  id="blank-opening"
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000.00"
                  value={openingDraft}
                  onChange={(e) => setOpeningDraft(e.target.value)}
                />
              </div>
              <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={saveOpening}>
                Save opening
              </button>
              <button
                type="button"
                className="btn-secondary !px-3 !py-2 text-xs"
                onClick={clearOpening}
                disabled={!openingSet}
                title="Unset opening (cash total = movements only)"
              >
                Clear opening
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Cash total = opening + categorised movements. Unmatched lines do not move cash until you Apply.
              A starter CSV with a balance column can set opening automatically <em>only when opening is still unset</em>{" "}
              — it will not overwrite a saved opening (including $0). Unmatch, Reset categorisations, or Clear CSV
              imports drops those movements and leaves opening; use Clear opening separately.
            </p>
          </div>
          <div className="card p-5">
            <p className="font-semibold text-white">Your first bank session</p>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                  {openingSet ? "✓" : "1"}
                </span>
                <span>
                  <strong className="text-slate-100">Set opening cash.</strong>{" "}
                  {openingSet
                    ? `${formatAUD(opening)} is saved.`
                    : "Enter it on the left, or leave it unset and the starter CSV will infer $5,000 from its running balance."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                  {txns.some((t) => t.source === "import") ? "✓" : "2"}
                </span>
                <span>
                  <strong className="text-slate-100">Import transactions.</strong>{" "}
                  {txns.some((t) => t.source === "import")
                    ? `${txns.filter((t) => t.source === "import").length} CSV lines are in this cheque account.`
                    : "Try the generic starter below, or choose your own CSV and confirm the preview."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                  {categorised.length > 0 ? "✓" : "3"}
                </span>
                <span>
                  <strong className="text-slate-100">Categorise a line.</strong>{" "}
                  {categorised.length > 0
                    ? `${categorised.length} line${categorised.length === 1 ? " is" : "s are"} categorised; Unmatch or Reset stays available.`
                    : "Use Apply on a suggested account code in Reconciliation."}
                </span>
              </li>
            </ol>
            <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
              Browser-only demo; no live feed. Generic starter lines stay separate from the guest sample. Want the
              pre-loaded sample story?{" "}
              <Link href="/demo" className="font-semibold text-brand-300 underline-offset-2 hover:underline">
                Explore sample as guest
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((a) => {
            const count = a.id === CHEQUE_ACCOUNT_ID ? unmatched.length : a.toReconcile;
            return (
              <div key={a.id} className="card p-5">
                <p className="font-semibold text-white">{a.name}</p>
                <p className="text-xs text-slate-400">
                  {a.bank} · {a.accountNumber}
                </p>
                <p className="mt-3 text-2xl font-bold text-white">{formatAUD(a.balance)}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {count > 0 ? reconcileLabel(count) : "Reconciled"}
                  {a.id === CHEQUE_ACCOUNT_ID && importedCount > 0
                    ? ` · ${importedCount} from CSV`
                    : ""}
                  {a.id === CHEQUE_ACCOUNT_ID && categorised.length > 0
                    ? ` · ${categorised.length} categorised`
                    : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {mode === "sample" && (
        <div className="rounded-xl border border-brand-400/25 bg-brand-500/10 px-4 py-3 text-sm text-slate-200">
          <strong className="text-white">First visit?</strong>{" "}
          Your sample cheque already has an opening balance. Next: <strong>Try sample CSV</strong>, review and
          import the preview, then use <strong>Apply</strong> on a suggested account code below. Imported lines
          are labelled separately and can be cleared without removing the demo&apos;s pre-loaded sample.
        </div>
      )}

      <div ref={importSectionRef} id="import" className="card scroll-mt-4 space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Import bank statement (CSV)</h2>
            <p className="mt-1 text-sm text-slate-300">
              Upload a CSV with <code className="rounded bg-white/10 px-1 text-brand-200">date</code>,{" "}
              <code className="rounded bg-white/10 px-1 text-brand-200">description</code>, and either{" "}
              <code className="rounded bg-white/10 px-1 text-brand-200">amount</code> or separate{" "}
              <code className="rounded bg-white/10 px-1 text-brand-200">debit</code>/
              <code className="rounded bg-white/10 px-1 text-brand-200">credit</code> columns
              {mode === "sample" && sampleCheque ? ` for ${sampleCheque.name}` : " for your cheque account"}.
              Dates: DD/MM/YYYY. Amounts: −42.50 or ($42.50). Parsed in your browser — nothing is sent to a
              server.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={sampleCsvPath}
              download={sampleCsvDownloadName}
              className="btn-secondary shrink-0 !px-3 !py-2 text-xs"
            >
              <Download size={14} />
              Download {mode === "blank" ? "starter" : "sample"} CSV
            </a>
            <a
              href={debitCreditCsvPath}
              download={debitCreditDownloadName}
              className="btn-secondary shrink-0 !px-3 !py-2 text-xs"
              title="Same demo lines with separate Debit and Credit columns"
            >
              <Download size={14} />
              Debit/credit CSV
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
          <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            Choose CSV file
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void loadSampleCsv("amount")}
            disabled={loadingSample}
            aria-label={mode === "blank" ? "Try starter CSV" : "Try sample CSV"}
          >
            <FileSpreadsheet size={16} />
            {loadingSample ? "Loading…" : mode === "blank" ? "Try starter CSV" : "Try sample CSV"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void loadSampleCsv("debit-credit")}
            disabled={loadingSample}
            aria-label="Try debit/credit CSV"
            title="AU-style statement with separate Debit and Credit columns"
          >
            <FileSpreadsheet size={16} />
            Try debit/credit CSV
          </button>
          {fileName && !preview && <span className="text-sm text-slate-300">{fileName}</span>}
        </div>

        {preview && (
          <div className="space-y-3 rounded-lg border border-brand-400/30 bg-brand-500/10 p-4">
            <p className="text-sm font-semibold text-white">
              Preview — {preview.length} row{preview.length === 1 ? "" : "s"} from {fileName} (before
              import)
            </p>
            {skipped.length > 0 && (
              <div
                className="flex items-start gap-2 rounded-lg border border-amber-300/55 bg-amber-400/20 px-3 py-2.5 text-xs font-medium text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)]"
                role="status"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-200" aria-hidden />
                <span>
                  <span className="font-semibold text-amber-50">
                    Skipped {skipped.length} bad row{skipped.length === 1 ? "" : "s"}
                  </span>{" "}
                  <span className="font-normal text-amber-100/90">
                    (still importing the valid ones):{" "}
                    {skipped
                      .slice(0, 4)
                      .map((s) => `line ${s.line} — ${s.reason}`)
                      .join("; ")}
                    {skipped.length > 4 ? "…" : ""}.
                  </span>
                </span>
              </div>
            )}
            <div className="max-h-56 overflow-auto overflow-x-auto rounded-lg border border-white/10 bg-black/40">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {preview.map((r, i) => (
                    <tr key={i} className="text-slate-100">
                      <td className="whitespace-nowrap px-3 py-2">{formatDateAU(r.date)}</td>
                      <td className="px-3 py-2">{r.description}</td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right ${
                          r.amount < 0 ? "text-rose-300" : "text-emerald-300"
                        }`}
                      >
                        {formatAUD(r.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-slate-400">
                        {r.balance !== undefined ? formatAUD(r.balance) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={confirmImport}>
                Import {preview.length} as unmatched
              </button>
              <button type="button" className="btn-secondary" onClick={cancelPreview}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {(error || success) && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            error
              ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
              : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
          }`}
          role="status"
        >
          {error ? (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <span>{error ?? success}</span>
            {!error && successSkipped.length > 0 && (
              <p className="rounded-md border border-emerald-300/35 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-50">
                <span className="font-semibold">
                  Skipped {successSkipped.length} bad row
                  {successSkipped.length === 1 ? "" : "s"}
                </span>{" "}
                <span className="font-normal text-emerald-100/90">
                  (valid rows still imported):{" "}
                  {successSkipped
                    .slice(0, 4)
                    .map((s) => `line ${s.line} — ${s.reason}`)
                    .join("; ")}
                  {successSkipped.length > 4 ? "…" : ""}.
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      <div ref={reconSectionRef} className="card scroll-mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-semibold text-white">
              Reconciliation — {mode === "blank" ? `${orgLabel} cheque` : "Business cheque account"}
            </h2>
            <p className="text-xs text-slate-400">
              Unmatched transactions ({ledgerReady ? unmatched.length : "…"}).{" "}
              {canAskAi
                ? "Ask AI to suggest account codes, or apply a high-confidence suggestion here."
                : "Nothing to categorise right now — import a statement or unmatch a categorised line to continue."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unmatched.length > 0 && (
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={applyAllHighConfidence}
              >
                <CheckCircle2 size={14} />
                Apply all high-confidence
              </button>
            )}
            {categorised.length > 0 && (
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={resetCats}
                title="Undo Apply / Ask AI categorisations for this cheque account (demo sample and blank stay separate)"
              >
                <RotateCcw size={14} />
                Reset categorisations
              </button>
            )}
            {txns.some((t) => t.source === "import") && (
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={clearImports}
                title={
                  mode === "blank"
                    ? "Remove CSV-imported rows (opening balance kept)"
                    : "Remove CSV-imported rows (demo sample lines stay)"
                }
              >
                <Trash2 size={14} />
                Clear CSV imports
              </button>
            )}
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => openAssistant("Categorise unmatched bank lines")}
              disabled={!canAskAi}
              title={canAskAi ? "Ask AI to suggest account codes for unmatched lines" : "Nothing to categorise — import or unmatch a bank line first"}
            >
              <Sparkles size={14} />
              {canAskAi ? "Ask AI" : "Ask AI (nothing to categorise)"}
            </button>
            <Link
              href="/demo"
              className="text-xs font-semibold text-brand-300 underline-offset-2 hover:underline"
            >
              Back to overview
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {!ledgerReady ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    Loading cheque account…
                  </td>
                </tr>
              ) : unmatched.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="font-medium text-slate-200">
                      {mode === "blank" && txns.length === 0 ? "Cheque account is empty" : "All caught up"}
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                      {mode === "blank" && txns.length === 0
                        ? "Set an opening balance above, use Try starter CSV for a few generic demo lines, or upload your own statement. Nothing from the guest sample is mixed in."
                        : (
                          <>
                            No unmatched transactions
                            {categorised.length > 0
                              ? " — see Recently categorised below (Unmatch or Reset anytime)"
                              : ""}
                            . Use{" "}
                            <strong className="text-slate-200">
                              {mode === "blank" ? "Try starter CSV" : "Try sample CSV"}
                            </strong>{" "}
                            above to import a few, or Ask AI once new lines land.
                          </>
                        )}
                    </p>
                    {mode === "blank" && txns.length === 0 ? (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            openingInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            openingInputRef.current?.focus();
                          }}
                        >
                          Set opening balance
                        </button>
                        <button
                          type="button"
                          className="btn-primary !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            void loadSampleCsv("amount");
                            importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          Try starter CSV
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                          onClick={() => fileRef.current?.click()}
                        >
                          Choose your CSV
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ) : (
                unmatched
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
                  .map((t) => {
                    const hint = suggestCategory(t.description, t.amount);
                    return (
                      <tr key={t.id} className="text-slate-100">
                        <td className="whitespace-nowrap px-4 py-3">{formatDateAU(t.date)}</td>
                        <td className="px-4 py-3">{t.description}</td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                            t.amount < 0 ? "text-rose-300" : "text-emerald-300"
                          }`}
                        >
                          {formatAUD(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                            Unmatched
                          </span>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Suggest {hint.accountCode} · {hint.taxRate}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {t.source === "import" ? "CSV import" : "Sample"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className={
                              hint.confidence === "low"
                                ? "btn-secondary !px-2 !py-1 text-xs"
                                : "btn-primary !px-2 !py-1 text-xs"
                            }
                            onClick={() => quickApply(t)}
                            title={
                              hint.confidence === "low"
                                ? "Open Ask AI for a grounded suggestion"
                                : `Apply ${hint.accountCode} · ${hint.accountName}`
                            }
                          >
                            {hint.confidence === "low" ? (
                              <>
                                <Sparkles size={12} />
                                Ask AI
                              </>
                            ) : (
                              <>Apply {hint.accountCode}</>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {categorised.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="font-semibold text-white">Recently categorised</h2>
            <p className="text-xs text-slate-400">
              Applied in this browser demo (including via Ask AI). Unmatch or reset anytime — demos are not
              one-way.
            </p>
          </div>
          <ul className="divide-y divide-white/10 text-sm">
            {categorised
              .slice()
              .sort((a, b) => (b.categorisedAt ?? "").localeCompare(a.categorisedAt ?? ""))
              .map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{t.description}</p>
                    <p className="text-xs text-slate-400">
                      {t.accountCode} · {t.accountName} · {t.taxRate}
                      {t.source === "import" ? " · CSV import" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`font-semibold ${t.amount < 0 ? "text-rose-300" : "text-emerald-300"}`}
                    >
                      {formatAUD(t.amount)}
                    </p>
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => unmatch(t)}
                      title="Return this line to unmatched"
                    >
                      <Undo2 size={12} />
                      Unmatch
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
