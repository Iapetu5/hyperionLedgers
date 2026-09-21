/** Report rollups from invoices/bills — blank ledger (local) or Harbour sample list. */

import { bills as sampleBills, invoices as sampleInvoices } from "@/lib/sample-data";
import { isISODateInRange } from "@/lib/bas-dates";
import { todayISO } from "@/lib/format";
import { toIsoDate } from "@/lib/iso-date";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Minimal doc shape for rollups (avoids importing user-docs — that cycle broke todayISO). */
export type ReportDoc = {
  amount: number;
  gst: number;
  status: string;
  dueDate: string;
};

export type BlankReportRollup = {
  invoiceCount: number;
  billCount: number;
  incomeExGst: number;
  incomeGst: number;
  incomeTotal: number;
  expenseExGst: number;
  expenseGst: number;
  expenseTotal: number;
  /** incomeGst − expenseGst (draft BAS net GST from listed docs). */
  netGst: number;
  netProfit: number;
  receivables: number;
  payables: number;
  cash: number;
  assets: number;
  liabilities: number;
  equity: number;
  hasActivity: boolean;
};

function invoiceExGst(inv: ReportDoc) {
  return round2(Math.max(0, inv.amount - inv.gst));
}

function billExGst(bill: ReportDoc) {
  return round2(Math.max(0, bill.amount - bill.gst));
}

function isOpenInvoice(inv: ReportDoc) {
  if (inv.status === "Paid" || inv.status === "Draft") return false;
  if (inv.dueDate < todayISO()) return true; // past due unpaid
  return inv.status === "Awaiting payment" || inv.status === "Overdue";
}

function isOpenBill(bill: ReportDoc) {
  return bill.status !== "Paid";
}

/** Core roll-up shared by blank ledger and Harbour sample lists. */
export function rollupFromDocs(invoices: ReportDoc[], bills: ReportDoc[]): BlankReportRollup {
  let incomeExGst = 0;
  let incomeGst = 0;
  let incomeTotal = 0;
  for (const inv of invoices) {
    incomeExGst = round2(incomeExGst + invoiceExGst(inv));
    incomeGst = round2(incomeGst + inv.gst);
    incomeTotal = round2(incomeTotal + inv.amount);
  }

  let expenseExGst = 0;
  let expenseGst = 0;
  let expenseTotal = 0;
  for (const bill of bills) {
    expenseExGst = round2(expenseExGst + billExGst(bill));
    expenseGst = round2(expenseGst + bill.gst);
    expenseTotal = round2(expenseTotal + bill.amount);
  }

  let receivables = 0;
  for (const inv of invoices) {
    if (isOpenInvoice(inv)) receivables = round2(receivables + inv.amount);
  }

  let payables = 0;
  for (const bill of bills) {
    if (isOpenBill(bill)) payables = round2(payables + bill.amount);
  }

  // Cash stays 0 until banking rollups land (Rhea). Equity balances the sheet.
  const cash = 0;
  const assets = round2(cash + receivables);
  const liabilities = payables;
  const equity = round2(assets - liabilities);
  const netProfit = round2(incomeExGst - expenseExGst);
  const netGst = round2(incomeGst - expenseGst);

  return {
    invoiceCount: invoices.length,
    billCount: bills.length,
    incomeExGst,
    incomeGst,
    incomeTotal,
    expenseExGst,
    expenseGst,
    expenseTotal,
    netGst,
    netProfit,
    receivables,
    payables,
    cash,
    assets,
    liabilities,
    equity,
    hasActivity: invoices.length > 0 || bills.length > 0,
  };
}

export function rollupBlankReports(invoices: ReportDoc[], bills: ReportDoc[]): BlankReportRollup {
  return rollupFromDocs(invoices, bills);
}

function sampleInvoicesAsDocs() {
  return sampleInvoices.map((i) => ({
    amount: i.amount,
    gst: i.gst,
    status: i.status,
    dueDate: i.dueDate,
    issueDate: i.issueDate,
  }));
}

function sampleBillsAsDocs() {
  return sampleBills.map((b) => ({
    amount: b.amount,
    gst: b.gst,
    status: b.status,
    dueDate: b.dueDate,
    date: b.date,
  }));
}

/** Harbour sample invoices/bills — same formulas as blank so P&L / BAS stay trustworthy. */
export function rollupSampleReports(): BlankReportRollup {
  return rollupFromDocs(sampleInvoicesAsDocs(), sampleBillsAsDocs());
}

export type DatedInvoiceDoc = ReportDoc & { issueDate: string };
export type DatedBillDoc = ReportDoc & { date: string };

/**
 * GST / trading roll-up limited to invoice issue dates and bill dates inside
 * an inclusive ISO window (AU financial year or a quarter).
 */
export function rollupDocsInIsoRange(
  invoices: DatedInvoiceDoc[],
  bills: DatedBillDoc[],
  start: string,
  end: string,
): BlankReportRollup {
  return rollupFromDocs(
    invoices.filter((inv) => isISODateInRange(toIsoDate(inv.issueDate), start, end)),
    bills.filter((bill) => isISODateInRange(toIsoDate(bill.date), start, end)),
  );
}

/** Harbour listed docs dated inside `start`–`end` (Sydney ISO calendar dates). */
export function rollupSampleReportsInIsoRange(start: string, end: string): BlankReportRollup {
  return rollupDocsInIsoRange(sampleInvoicesAsDocs(), sampleBillsAsDocs(), start, end);
}

export const EMPTY_REPORT_ROLLUP: BlankReportRollup = {
  invoiceCount: 0,
  billCount: 0,
  incomeExGst: 0,
  incomeGst: 0,
  incomeTotal: 0,
  expenseExGst: 0,
  expenseGst: 0,
  expenseTotal: 0,
  netGst: 0,
  netProfit: 0,
  receivables: 0,
  payables: 0,
  cash: 0,
  assets: 0,
  liabilities: 0,
  equity: 0,
  hasActivity: false,
};
