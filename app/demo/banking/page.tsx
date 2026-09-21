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
import { BooksSectionNav } from "@/components/demo/BooksSectionNav";
import { ConfirmDialog } from "@/components/demo/ConfirmDialog";
import { MoreMenu } from "@/components/demo/MoreMenu";
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
  MAX_BANK_CSV_ROWS,
  type ParsedBankRow,
  type ParseBankCsvSkip,
} from "@/lib/bank-csv";
import {
  blankChequeBalance,
  blankChequeMovements,
  inferOpeningFromParsedRows,
  unmatchedForAccount,
  CHEQUE_ACCOUNT_ID,
  BLANK_CHEQUE_ACCOUNT_ID,
  type BankLedgerMode,
  type BankTransaction,
} from "@/lib/bank-transactions";
import {
  appendImportedRows,
  applyCategoryToTransaction,
  clearBlankOpeningBalance,
  clearCategoryFromTransaction,
  clearImportedTransactions,
  getBlankOpeningBalance,
  hasBlankOpeningBalance,
  loadBankTransactions,
  resetAllCategorisations,
  setBlankOpeningBalance,
} from "@/lib/books-client";

function linesToApplyLabel(count: number) {
  return count === 1 ? "1 line to Apply" : `${count} lines to Apply`;
}

/** Sample has no Save opening — path is 1 Import CSV → 2 Apply. Blank is 1 Save opening → 2 Import CSV → 3 Apply. */
function bankingStepNums(mode: BankLedgerMode) {
  return mode === "sample"
    ? { opening: 0 as const, importN: 1, applyN: 2, tryCsv: "Try sample CSV" }
    : { opening: 1 as const, importN: 2, applyN: 3, tryCsv: "Try starter CSV" };
}

function morePowerHint(hasReset: boolean, hasClear: boolean) {
  if (hasReset && hasClear) return "Use More for Reset categorisations or Clear CSV imports (each asks first).";
  if (hasReset) return "Use More for Reset categorisations (asks first).";
  if (hasClear) return "Use More for Clear CSV imports (asks first).";
  return "";
}

type BankingConfirm =
  | { action: "reset"; n: number }
  | { action: "clearCsv"; n: number; applied: number }
  | { action: "clearOpening"; amount: number };

function bankingConfirmCopy(
  pending: BankingConfirm,
  mode: BankLedgerMode,
): { title: string; body: string; confirmLabel: string } {
  if (pending.action === "reset") {
    return {
      title: "Reset categorisations?",
      confirmLabel: "Reset categorisations",
      body: `Removes Apply / Ask AI categories on this cheque (${pending.n} line${
        pending.n === 1 ? "" : "s"
      }). Bank lines stay. Opening stays. CSV imports stay. Undo match on a single line does not need this.`,
    };
  }
  if (pending.action === "clearCsv") {
    const split =
      pending.applied > 0
        ? ` ${pending.applied} already Applied, ${pending.n - pending.applied} still Needs category.`
        : " None have been Applied yet.";
    return {
      title: "Clear CSV imports?",
      confirmLabel: "Clear CSV imports",
      body:
        mode === "blank"
          ? `Removes ${pending.n} imported CSV line${pending.n === 1 ? "" : "s"} and their categories.${split} Opening is kept. Guest sample lines are not on this ledger.`
          : `Removes ${pending.n} imported CSV line${pending.n === 1 ? "" : "s"} and their categories.${split} Sample cheque lines stay. Opening is not used on this sample ledger.`,
    };
  }
  return {
    title: "Clear opening?",
    confirmLabel: "Clear opening",
    body: `Unsets the saved opening of ${formatAUD(pending.amount)}. Cash total becomes movements only. CSV lines, their categories, and imports stay.`,
  };
}

function skippedRowsPhrase(skips: ParseBankCsvSkip[]) {
  return (
    skips
      .slice(0, 4)
      .map((s) => `line ${s.line} — ${s.reason}`)
      .join("; ") + (skips.length > 4 ? "…" : "")
  );
}

function bankingWhereNext(opts: {
  mode: BankLedgerMode;
  openingSet: boolean;
  hasImport: boolean;
  unmatchedCount: number;
  categorisedCount: number;
}) {
  const n = bankingStepNums(opts.mode);
  const step1Done = opts.mode === "sample" || opts.openingSet;
  if (!step1Done) {
    return `Next: ${n.opening} Save opening. Then ${n.importN} Import CSV → ${n.applyN} Apply.`;
  }
  if (opts.unmatchedCount > 0) {
    if (opts.hasImport || opts.mode === "sample") {
      return `Next: ${n.applyN} Apply on a line below. Or ${n.importN} Import CSV for more.`;
    }
    return `Next: ${n.importN} Import CSV, then ${n.applyN} Apply.`;
  }
  if (opts.categorisedCount > 0) {
    const more = morePowerHint(true, opts.hasImport);
    return more ? `You’re done. ${more}` : "You’re done.";
  }
  return `Next: ${n.importN} Import CSV, then ${n.applyN} Apply.`;
}

function bankingPathHint(mode: BankLedgerMode, step1Done: boolean) {
  const n = bankingStepNums(mode);
  if (mode === "sample") {
    return `Path: ${n.importN} Import CSV → ${n.applyN} Apply. Sample opening is already in. Debit/credit samples live under More. No live bank feed.`;
  }
  return step1Done
    ? `Path: ${n.importN} Import CSV → ${n.applyN} Apply. Opening is already saved — skip ${n.opening} Save opening. Debit/credit samples live under More. No live bank feed.`
    : `Path: ${n.opening} Save opening → ${n.importN} Import CSV → ${n.applyN} Apply. Debit/credit samples live under More. No live bank feed.`;
}

export default function BankingPage() {
  const { usesSampleData, user, loading, persistence } = useAuth();
  const mode: BankLedgerMode = usesSampleData ? "sample" : "blank";
  const chequeAccountId = mode === "blank" ? BLANK_CHEQUE_ACCOUNT_ID : CHEQUE_ACCOUNT_ID;
  const fileRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
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
  /** Memory-only — refresh is Cancel. Never persist this; writes happen only after confirm. */
  const [pendingConfirm, setPendingConfirm] = useState<BankingConfirm | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [applyAllBusy, setApplyAllBusy] = useState(false);
  const [parseBusy, setParseBusy] = useState(false);
  const [truncatedNote, setTruncatedNote] = useState<string | null>(null);
  const importLock = useRef(false);
  const applyAllLock = useRef(false);
  const unmatchLock = useRef<string | null>(null);

  const reload = useCallback(async () => {
    setTxns(await loadBankTransactions(mode));
    if (mode === "blank") {
      const hasOpening = await hasBlankOpeningBalance();
      const o = await getBlankOpeningBalance();
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
    if (loading || persistence === "unknown") return;
    void reload();
    setLedgerReady(true);
  }, [reload, loading, persistence]);

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
    const onUpdate = () => void reload();
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
  const hasImport = txns.some((t) => t.source === "import");
  const canAskAi = unmatched.length > 0;
  const steps = bankingStepNums(mode);
  const hasReset = categorised.length > 0;
  const step1Done = mode === "sample" || openingSet;
  const whereNext = bankingWhereNext({
    mode,
    openingSet,
    hasImport,
    unmatchedCount: unmatched.length,
    categorisedCount: categorised.length,
  });

  function jumpToStep(step: 1 | 2 | 3) {
    if (step === 1) {
      openingInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      openingInputRef.current?.focus();
      return;
    }
    if (step === 2) {
      importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => importButtonRef.current?.focus(), 320);
      return;
    }
    reconSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
      setSkipped(result.skipped ?? []);
      setSuccess(null);
      setSuccessSkipped([]);
      setTruncatedNote(null);
      setFileName(label);
      return;
    }
    setFileName(label);
    setPreview(result.rows);
    setSkipped(result.skipped);
    setError(null);
    setSuccessSkipped([]);
    setTruncatedNote(
      result.truncated
        ? `This demo reads at most ${MAX_BANK_CSV_ROWS} transactions so Banking stays usable. ${result.truncated} row${
            result.truncated === 1 ? "" : "s"
          } after that were not previewed. Split the statement by month and import again.`
        : null,
    );
    if (result.skipped.length > 0) {
      setSuccess(null);
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
      setError("Nothing was imported. This file is empty. Upload a CSV with date, description and amount columns.");
      return;
    }
    if (file.size > 2_000_000) {
      setError("This CSV is too large for this demo (max 2 MB). Split the statement or export a shorter date range.");
      return;
    }
    setParseBusy(true);
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
    try {
      const text = await file.text();
      applyParsed(text, file.name);
    } catch {
      setError("Could not read this CSV. Try a smaller file (max 2 MB, 500 transactions).");
      setPreview(null);
      setTruncatedNote(null);
    } finally {
      setParseBusy(false);
    }
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
    if (!preview?.length) {
      setError("Nothing was imported. The preview is empty — no valid rows to add.");
      setSuccess(null);
      return;
    }
    if (importLock.current) return;
    importLock.current = true;
    setImportBusy(true);
    void (async () => {
      try {
      const beforeImportCount = txns.filter((x) => x.source === "import").length;
      const skippedSnapshot = skipped;
      let openingNote = "";
      if (mode === "blank") {
        const inferred = inferOpeningFromParsedRows(preview);
        if (inferred != null) {
          if (!(await hasBlankOpeningBalance())) {
            const savedOpening = await setBlankOpeningBalance(inferred);
            setOpening(savedOpening);
            setOpeningSet(true);
            setOpeningDraft(String(savedOpening));
            openingNote = ` Opening balance set to ${formatAUD(inferred)} from the CSV running balance (only because none was saved yet).`;
          } else {
            const savedOpening = await getBlankOpeningBalance();
            if (savedOpening !== inferred) {
              openingNote = ` Saved opening kept at ${formatAUD(savedOpening)}. CSV running balance suggested ${formatAUD(inferred)} — use Save opening to replace.`;
            }
          }
        }
      }
      const next = await appendImportedRows(preview, chequeAccountId, mode);
      const added = next.filter((x) => x.source === "import").length - beforeImportCount;
      const offered = preview.length;
      const dupes = Math.max(0, offered - added);
      const dupeNote =
        dupes === 0
          ? ""
          : ` Skipped ${dupes} duplicate${dupes === 1 ? "" : "s"} (same date, description and amount as a line already on this cheque or earlier in this file).`;
      setTxns(next);
      setSuccess(
        added === 0
          ? `Nothing new was imported.${dupeNote} Cash did not change.${openingNote}`
          : `Imported ${added} new transaction${added === 1 ? "" : "s"}.${dupeNote} Next: ${steps.applyN} Apply on a line below.${openingNote}`,
      );
      setSuccessSkipped(skippedSnapshot);
      setPreview(null);
      setSkipped([]);
      setFileName(null);
      setTruncatedNote(null);
      if (fileRef.current) fileRef.current.value = "";
      requestAnimationFrame(() => {
        reconSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      } catch {
        setError(
          "Import did not finish. Check the cheque below — duplicate rows are never added twice. Opening only changes if none was saved yet.",
        );
        setSuccess(null);
      } finally {
        importLock.current = false;
        setImportBusy(false);
      }
    })();
  }

  function saveOpening() {
    const raw = openingDraft.trim();
    if (raw === "") {
      setError("Enter an opening balance (use Clear opening to leave it unset).");
      setSuccess(null);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setError("Opening balance must be a number.");
      setSuccess(null);
      return;
    }
    const prevSet = openingSet;
    const prev = opening;
    void (async () => {
      const saved = await setBlankOpeningBalance(n);
      setOpening(saved);
      setOpeningSet(true);
      setOpeningDraft(String(saved));
      setError(null);
      setSuccess(
        prevSet && prev !== saved
          ? `Replaced opening ${formatAUD(prev)} with ${formatAUD(saved)}. CSV lines and categories stay. Next: ${steps.importN} Import CSV below.`
          : `Opening saved as ${formatAUD(saved)}. Next: ${steps.importN} Import CSV below.`,
      );
    })();
  }

  function cancelPreview() {
    setPreview(null);
    setSkipped([]);
    setFileName(null);
    setError(null);
    setTruncatedNote(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function quickApply(t: BankTransaction) {
    const suggestion = suggestCategory(t.description, t.amount);
    if (suggestion.confidence === "low") {
      openAssistant(`Categorise unmatched bank line: ${t.description}`);
      return;
    }
    void (async () => {
      const updated = await applyCategoryToTransaction(t.id, suggestion);
      if (!updated) {
        setError(`Could not apply a category to “${t.description}”. Try refreshing Banking.`);
        setSuccess(null);
        return;
      }
      const fresh = await loadBankTransactions(mode);
      setTxns(fresh);
      setError(null);
      const remaining = unmatchedForAccount(fresh, chequeAccountId).length;
      const left =
        remaining === 0 ? "Nothing left to Apply." : `${linesToApplyLabel(remaining)} still marked Needs category.`;
      setSuccess(
        `Applied ${suggestion.accountCode} — ${suggestion.accountName} to “${t.description}”. ${
          remaining === 0
            ? `${left} ${morePowerHint(true, hasImport)} Undo match below.`
            : `${left} Next: ${steps.applyN} Apply the next line.`
        }`.replace(/\s+/g, " ").trim(),
      );
    })();
  }

  function applyAllHighConfidence() {
    if (applyAllLock.current) return;
    applyAllLock.current = true;
    setApplyAllBusy(true);
    void (async () => {
      let applied = 0;
      let skippedNoSuggestion = 0;
      let failed = 0;
      try {
      const lines = unmatchedForAccount(await loadBankTransactions(mode), chequeAccountId);
      for (const t of lines) {
        const suggestion = suggestCategory(t.description, t.amount);
        if (suggestion.confidence !== "high") {
          skippedNoSuggestion += 1;
          continue;
        }
        try {
          if (await applyCategoryToTransaction(t.id, suggestion)) applied += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      const fresh = await loadBankTransactions(mode);
      setTxns(fresh);
      setError(null);
      const remaining = unmatchedForAccount(fresh, chequeAccountId).length;
      const left =
        remaining === 0 ? "Nothing left to Apply." : `${linesToApplyLabel(remaining)} still marked Needs category.`;
      const skipBit =
        skippedNoSuggestion > 0
          ? ` Skipped ${skippedNoSuggestion} (no confident category — still Needs category).`
          : "";
      const failBit =
        failed > 0 ? ` Could not apply ${failed} line${failed === 1 ? "" : "s"} (left unmatched).` : "";
      setSuccess(
        applied === 0
          ? remaining === 0
            ? `Nothing left to Apply. Next: ${steps.importN} Import CSV.`
            : `Applied 0 lines.${skipBit}${failBit} ${left} Next: Ask AI under More, or ${steps.applyN} Apply on a remaining line.`
          : remaining === 0
            ? `Applied ${applied} line${applied === 1 ? "" : "s"}.${skipBit}${failBit} ${left} ${morePowerHint(true, hasImport)}`.trim()
            : `Applied ${applied} line${applied === 1 ? "" : "s"}.${skipBit}${failBit} ${left} Next: ${steps.applyN} Apply, or Ask AI under More.`,
      );
      } catch {
        setError(
          `Apply all stopped. Applied ${applied}. Skipped ${skippedNoSuggestion} (no confident category). Could not apply ${failed}. Skipped and failed lines stay Needs category.`,
        );
        setSuccess(null);
        try {
          setTxns(await loadBankTransactions(mode));
        } catch {
          /* leave the table as last shown */
        }
      } finally {
        applyAllLock.current = false;
        setApplyAllBusy(false);
      }
    })();
  }

  function unmatch(t: BankTransaction) {
    if (unmatchLock.current === t.id) return;
    unmatchLock.current = t.id;
    void (async () => {
      try {
        const updated = await clearCategoryFromTransaction(t.id);
        if (!updated) {
          setError(`Could not undo match for “${t.description}”. Cash and categories are unchanged.`);
          setSuccess(null);
          return;
        }
        const fresh = await loadBankTransactions(mode);
        setTxns(fresh);
        setError(null);
        const cashBit =
          mode === "blank"
            ? ` Cash is now ${formatAUD(blankChequeBalance(fresh, opening))} (that line is no longer in movements).`
            : " Sample cheque cash is unchanged — only the category came off.";
        setSuccess(
          `Undid match for “${t.description}”.${cashBit} Next: ${steps.applyN} Apply on that line below.`,
        );
      } catch {
        setError(`Could not undo match for “${t.description}”. Check the line below — it may still be categorised.`);
        setSuccess(null);
        try {
          setTxns(await loadBankTransactions(mode));
        } catch {
          /* leave the table as last shown */
        }
      } finally {
        if (unmatchLock.current === t.id) unmatchLock.current = null;
      }
    })();
  }

  function resetCats() {
    void (async () => {
      const n = await resetAllCategorisations(mode);
      setTxns(await loadBankTransactions(mode));
      setError(null);
      setSuccess(
        n === 0
          ? `Nothing to reset. Next: ${steps.applyN} Apply, or ${steps.importN} Import CSV.`
          : `Reset ${n} categorisation${n === 1 ? "" : "s"}. Bank lines, opening, and CSV imports stayed. Next: ${steps.applyN} Apply on a line below.`,
      );
    })();
  }

  function clearImports() {
    void (async () => {
      const n = await clearImportedTransactions(mode);
      setTxns(await loadBankTransactions(mode));
      setError(null);
      setSuccess(
        n === 0
          ? `No CSV imports to clear. Next: ${steps.importN} Import CSV, or ${steps.applyN} Apply.`
          : mode === "blank"
            ? `Cleared ${n} imported row${n === 1 ? "" : "s"} and their categories. Opening left as-is. Next: ${steps.importN} Import CSV, or ${steps.applyN} Apply on remaining lines.`
            : `Cleared ${n} imported row${n === 1 ? "" : "s"} and their categories (sample lines kept). Next: ${steps.applyN} Apply, or ${steps.importN} Import CSV.`,
      );
    })();
  }

  function clearOpening() {
    void (async () => {
      const cleared = await clearBlankOpeningBalance();
      setOpening(0);
      setOpeningSet(false);
      setOpeningDraft("");
      setError(null);
      setSuccess(
        cleared
          ? "Opening cleared. CSV lines, categories, and imports stayed. Next: 1 Save opening."
          : "Opening was already unset. Next: 1 Save opening, or 2 Import CSV.",
      );
    })();
  }

  function runPendingConfirm() {
    const pending = pendingConfirm;
    setPendingConfirm(null);
    if (!pending) return;
    if (pending.action === "reset") resetCats();
    else if (pending.action === "clearCsv") clearImports();
    else clearOpening();
  }

  const confirmCopy = pendingConfirm ? bankingConfirmCopy(pendingConfirm, mode) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Banking</h1>
          <BooksSectionNav />
          <p className="text-sm text-white/70">
            {mode === "blank"
              ? `${orgLabel} cheque account — browser-side CSV only. No live bank feeds, and demo sample lines stay out of this blank ledger.`
              : "Sample balances and browser-side CSV import only — no live bank feeds or APIs."}
          </p>
        </div>
      </div>

      {mode === "blank" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <p className="font-semibold text-white">1. Opening balance</p>
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
                  ? linesToApplyLabel(unmatched.length)
                  : txns.length === 0
                    ? openingSet
                      ? "Next: 2 Import CSV"
                      : "Next: 1 Save opening, then 2 Import CSV"
                    : "Nothing to Apply"}
              {importedCount > 0 ? ` · ${importedCount} from CSV to Apply` : ""}
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
              <MoreMenu buttonClassName="btn-secondary !px-3 !py-2 text-xs" title="More opening actions">
                <button
                  type="button"
                  className="btn-quiet-danger !px-3 !py-2 text-xs"
                  onClick={() => setPendingConfirm({ action: "clearOpening", amount: opening })}
                  disabled={!openingSet}
                  title="Unset opening (cash total = movements only) — asks first"
                >
                  Clear opening
                </button>
              </MoreMenu>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Cash total = opening + categorised movements. Unmatched lines do not move cash until you Apply.
              A starter CSV with a balance column can set opening automatically <em>only when opening is still unset</em>{" "}
              — it will not overwrite a saved opening (including $0). If the CSV suggests a different amount, Banking
              says so and keeps the saved figure. Undo match stays one click. Reset categorisations, Clear CSV
              imports, and Clear opening ask first.
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
                  <strong className="text-slate-100">1 Save opening.</strong>{" "}
                  {openingSet
                    ? `${formatAUD(opening)} is saved. Next: 2 Import CSV below.`
                    : "Enter it on the left, then Save opening — or leave it unset and the starter CSV will infer $5,000 from its running balance."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                  {hasImport ? "✓" : "2"}
                </span>
                <span>
                  <strong className="text-slate-100">2 Import CSV.</strong>{" "}
                  {hasImport
                    ? `${txns.filter((t) => t.source === "import").length} CSV lines are in. Next: 3 Apply on a line below.`
                    : "Use Import CSV below, or Try starter CSV, then confirm the preview."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                  {categorised.length > 0 ? "✓" : "3"}
                </span>
                <span>
                  <strong className="text-slate-100">3 Apply.</strong>{" "}
                  {categorised.length > 0
                    ? `${categorised.length} line${categorised.length === 1 ? " is" : "s are"} categorised. ${
                        unmatched.length > 0
                          ? "Next: 3 Apply the next line."
                          : "You’re done — Reset categorisations and Clear CSV imports are under More."
                      }`
                    : "Use Apply on a suggested account code below. Undo match puts a line back."}
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
                  {count > 0 ? linesToApplyLabel(count) : "Nothing to Apply"}
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

      {!(error || success) && (
      <div className="rounded-xl border border-brand-400/25 bg-brand-500/10 px-4 py-3 text-sm text-slate-200">
        <p>
          <strong className="text-white">Where next?</strong> {whereNext}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {!step1Done && (
            <button
              type="button"
              className="font-semibold text-brand-300 underline-offset-2 hover:underline"
              onClick={() => jumpToStep(1)}
            >
              Go to {steps.opening} Save opening
            </button>
          )}
          <button
            type="button"
            className="font-semibold text-brand-300 underline-offset-2 hover:underline"
            onClick={() => jumpToStep(2)}
          >
            Go to {steps.importN} Import CSV
          </button>
          <button
            type="button"
            className="font-semibold text-brand-300 underline-offset-2 hover:underline"
            onClick={() => jumpToStep(3)}
          >
            Go to {steps.applyN} Apply
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-400">{bankingPathHint(mode, step1Done)}</p>
      </div>
      )}

      <div ref={importSectionRef} id="import" className="card scroll-mt-4 space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-white">
            {steps.importN}. Import CSV
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Upload a CSV with <code className="rounded bg-white/10 px-1 text-brand-200">date</code>,{" "}
            <code className="rounded bg-white/10 px-1 text-brand-200">description</code>, and either{" "}
            <code className="rounded bg-white/10 px-1 text-brand-200">amount</code> or separate{" "}
            <code className="rounded bg-white/10 px-1 text-brand-200">debit</code>/
            <code className="rounded bg-white/10 px-1 text-brand-200">credit</code> columns
            {mode === "sample" && sampleCheque ? ` for ${sampleCheque.name}` : " for your cheque account"}.
            Dates: DD/MM/YYYY. Amounts: −42.50 or ($42.50). Parsed in your browser — nothing is sent to a
            server. No live bank feed. Rows already on this cheque (same date, description and amount), or
            repeated in the file, are skipped — cash does not increase twice; the result says how many were
            imported vs skipped. This demo reads at most 2 MB and {MAX_BANK_CSV_ROWS} transactions — a larger
            file gets a clear stop message, not a hung page. If any rows fail to parse, that list stays on this
            page after import until you Import CSV again.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
          <button
            ref={importButtonRef}
            type="button"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => fileRef.current?.click()}
            disabled={parseBusy || importBusy}
          >
            <Upload size={16} />
            {parseBusy ? "Reading CSV…" : "Import CSV"}
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
          <MoreMenu align="left" buttonClassName="btn-secondary" title="More import options">
            <a
              href={sampleCsvPath}
              download={sampleCsvDownloadName}
              className="btn-secondary !px-3 !py-2 text-xs"
            >
              <Download size={14} />
              Download {mode === "blank" ? "starter" : "sample"} CSV
            </a>
            <button
              type="button"
              className="btn-secondary !px-3 !py-2 text-xs"
              onClick={() => void loadSampleCsv("debit-credit")}
              disabled={loadingSample}
              aria-label="Try debit/credit CSV"
              title="AU-style statement with separate Debit and Credit columns"
            >
              <FileSpreadsheet size={16} />
              Try debit/credit CSV
            </button>
            <a
              href={debitCreditCsvPath}
              download={debitCreditDownloadName}
              className="btn-secondary !px-3 !py-2 text-xs"
              title="Same demo lines with separate Debit and Credit columns"
            >
              <Download size={14} />
              Download debit/credit CSV
            </a>
          </MoreMenu>
          {fileName && !preview && <span className="text-sm text-slate-300">{fileName}</span>}
        </div>

        {preview && preview.length > 0 && (
          <div className="space-y-3 rounded-lg border border-brand-400/30 bg-brand-500/10 p-4">
            <p className="text-sm font-semibold text-white">
              Preview — {preview.length} row{preview.length === 1 ? "" : "s"} from {fileName} (before
              import)
            </p>
            {truncatedNote && (
              <div
                className="flex items-start gap-2 rounded-lg border border-amber-300/55 bg-amber-400/20 px-3 py-2.5 text-xs font-medium text-amber-50"
                role="status"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-200" aria-hidden />
                <span>{truncatedNote}</span>
              </div>
            )}
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
                    (still importing the valid ones): {skippedRowsPhrase(skipped)}.
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
                  {preview.slice(0, 25).map((r, i) => (
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
            {preview.length > 25 && (
              <p className="text-xs text-slate-400">
                Showing the first 25 of {preview.length} rows in this preview. Import still uses all{" "}
                {preview.length} listed above.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmImport}
                disabled={importBusy}
              >
                {importBusy ? "Importing…" : "Import CSV"}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelPreview}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {!preview && (successSkipped.length > 0 || (error && skipped.length > 0)) && (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-300/55 bg-amber-400/20 px-3 py-2.5 text-sm font-medium text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)]"
          role="status"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-200" aria-hidden />
          <span>
            {(() => {
              const rows = successSkipped.length > 0 ? successSkipped : skipped;
              const imported = successSkipped.length > 0;
              return (
                <>
                  <span className="font-semibold">
                    Skipped {rows.length} bad row{rows.length === 1 ? "" : "s"}
                  </span>{" "}
                  <span className="font-normal text-amber-100/90">
                    {imported
                      ? "(valid rows were still imported — this note stays until the next Import CSV): "
                      : "(nothing was imported — every listed row was skipped): "}
                    {skippedRowsPhrase(rows)}.
                  </span>
                </>
              );
            })()}
          </span>
        </div>
      )}

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
          <span>{error ?? success}</span>
        </div>
      )}

      <div ref={reconSectionRef} className="card scroll-mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-semibold text-white">
              {steps.applyN}. Apply — {mode === "blank" ? `${orgLabel} cheque` : "Business cheque account"}
            </h2>
            <p className="text-xs text-slate-400">
              {ledgerReady ? (
                unmatched.length > 0 ? (
                  <>
                    {linesToApplyLabel(unmatched.length)}. Apply on a line, or Apply all.
                    Apply all only writes confident categories and says how many applied vs skipped.
                  </>
                ) : (
                  <>
                    Nothing left to Apply.
                    {morePowerHint(hasReset, hasImport) ? ` ${morePowerHint(hasReset, hasImport)}` : ""}
                  </>
                )
              ) : (
                "Loading…"
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unmatched.length > 0 && (
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={applyAllHighConfidence}
                disabled={applyAllBusy}
                title="Applies only the high-confidence suggestions"
              >
                <CheckCircle2 size={14} />
                {applyAllBusy ? "Applying…" : "Apply all"}
              </button>
            )}
            <MoreMenu buttonClassName="btn-secondary !px-3 !py-1.5 text-xs" title="More categorise actions">
              {categorised.length > 0 && (
                <button
                  type="button"
                  className="btn-quiet-danger !px-3 !py-1.5 text-xs"
                  onClick={() => setPendingConfirm({ action: "reset", n: categorised.length })}
                  disabled={applyAllBusy || importBusy}
                  title="Undo Apply / Ask AI categorisations for this cheque account — asks first (demo sample and blank stay separate)"
                >
                  <RotateCcw size={14} />
                  Reset categorisations
                </button>
              )}
              {txns.some((t) => t.source === "import") && (
                <button
                  type="button"
                  className="btn-quiet-danger !px-3 !py-1.5 text-xs"
                  onClick={() =>
                    setPendingConfirm({
                      action: "clearCsv",
                      n: txns.filter((t) => t.source === "import").length,
                      applied: txns.filter((t) => t.source === "import" && t.matched).length,
                    })
                  }
                  title={
                    mode === "blank"
                      ? "Remove CSV-imported rows (opening kept) — asks first"
                      : "Remove CSV-imported rows (demo sample lines stay) — asks first"
                  }
                  disabled={applyAllBusy || importBusy}
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
                title={
                  canAskAi
                    ? "Ask AI to suggest account codes for unmatched lines"
                    : "Nothing to categorise — import or undo match a bank line first"
                }
              >
                <Sparkles size={14} />
                {canAskAi ? "Ask AI" : "Ask AI (nothing to categorise)"}
              </button>
            </MoreMenu>
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
                <th className="doc-actions-col px-4 py-3">Action</th>
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
                      {mode === "blank" && txns.length === 0 ? "Cheque account is empty" : "You’re done"}
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                      {mode === "blank" && txns.length === 0
                        ? openingSet
                          ? `Opening is already saved. Use ${steps.importN} Import CSV above. ${steps.tryCsv} adds a few generic demo lines. Nothing from the guest sample is mixed in.`
                          : `Use ${steps.opening} Save opening above, then ${steps.importN} Import CSV. ${steps.tryCsv} adds a few generic demo lines. Nothing from the guest sample is mixed in.`
                        : categorised.length > 0
                          ? `Nothing left to Apply. ${morePowerHint(hasReset, hasImport)}${hasReset ? " Undo match below." : ""} Use ${steps.importN} Import CSV if you have another statement.`
                          : `Nothing left to Apply. Use ${steps.importN} Import CSV or ${steps.tryCsv} above, then ${steps.applyN} Apply.`}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {mode === "blank" && txns.length === 0 && !openingSet ? (
                        <button
                          type="button"
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            openingInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            openingInputRef.current?.focus();
                          }}
                        >
                          Save opening
                        </button>
                      ) : null}
                      {mode === "blank" && txns.length === 0 ? (
                        <button
                          type="button"
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                          onClick={() => {
                            void loadSampleCsv("amount");
                            importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          Try starter CSV
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn-primary !px-3 !py-1.5 text-xs"
                        onClick={() => {
                          importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          fileRef.current?.click();
                        }}
                      >
                        Import CSV
                      </button>
                    </div>
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
                            Needs category
                          </span>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Suggest {hint.accountCode} · {hint.taxRate}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {t.source === "import" ? "CSV import" : "Sample"}
                        </td>
                        <td className="doc-actions-col px-4 py-3">
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
                              <>Apply</>
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
              Applied in this browser demo (including via Ask AI). Undo match below is one click. Reset
              categorisations under More asks what it removes.
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
                      title="Return this line to unmatched — cash movements follow the category on a blank cheque"
                    >
                      <Undo2 size={12} />
                      Undo match
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
      {confirmCopy && (
        <ConfirmDialog
          open
          title={confirmCopy.title}
          body={confirmCopy.body}
          confirmLabel={confirmCopy.confirmLabel}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={runPendingConfirm}
        />
      )}
    </div>
  );
}
