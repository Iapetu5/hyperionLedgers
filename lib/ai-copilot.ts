/**
 * HyperionInvoices AI bookkeeping copilot — client-side rules + retrieval.
 * Grounded in Harbour & Co sample ledger. No external LLM required.
 */

import { getNextBasDue } from "@/lib/bas-dates";
import { suggestCategory, type CategorySuggestion } from "@/lib/chart-of-accounts";
import { formatAUD, formatDateAU } from "@/lib/format";
import { getInvoiceStatus, getQuoteStatus } from "@/lib/public-docs";
import {
  loadBankTransactions,
  unmatchedForAccount,
  CHEQUE_ACCOUNT_ID,
  BLANK_CHEQUE_ACCOUNT_ID,
  type BankTransaction,
} from "@/lib/bank-transactions";
import {
  DEMO_ORG,
  accounts,
  bills,
  gstBas,
  invoices,
  kpis,
  quotes,
  recurringTemplates,
  tasks,
} from "@/lib/sample-data";
import {
  blankNextInsight,
  effectiveBillStatus,
  effectiveInvoiceStatus,
  effectiveQuoteStatus,
  effectiveSampleBillStatus,
  loadUserBills,
  loadUserInvoices,
  loadUserQuotes,
  type UserInvoice,
  type UserQuote,
} from "@/lib/user-docs";

export const AI_DISCLAIMER =
  "Demo assistance only — not a registered tax agent, and does not lodge with the ATO.";

export type AiActionKind = "link" | "apply-category" | "prompt";

export type AiAction = {
  id: string;
  label: string;
  kind: AiActionKind;
  href?: string;
  prompt?: string;
  txnId?: string;
  category?: CategorySuggestion;
};

export type AiCitation = {
  label: string;
  value: string;
  source: string;
};

export type AiIntent =
  | "next"
  | "bas"
  | "categorise"
  | "chase_overdue"
  | "cash"
  | "invoices"
  | "bills"
  | "quotes"
  | "draft_doc"
  | "profit"
  | "banking"
  | "help"
  | "unknown";

export type AiReply = {
  intent: AiIntent;
  prose: string;
  citations: AiCitation[];
  actions: AiAction[];
  chips: string[];
  disclaimer: string;
};

export const defaultAiGreeting =
  "G'day — I'm the HyperionInvoices copilot for Harbour & Co. I read this demo ledger (cash, invoices, bills, banking, BAS) and suggest next steps. Ask “what next?”, about BAS due, or to categorise an unmatched bank line.";

export const SUGGESTED_CHIPS = [
  "What should I do next?",
  "When is BAS due?",
  "Categorise unmatched bank lines",
  "Chase overdue invoices",
  "Draft invoice suggestion",
];

export const blankAiGreeting =
  "G'day — you're on a blank ledger (no Harbour sample figures here). Create an invoice or quote — Create mixed-tax sample (one click), or pick Products on a line — add a mixed-tax bill (Approve / Mark paid), or open Banking for your own cheque account (opening balance + starter CSV). Past-due invoices show Overdue and Sent quotes past expiry show Expired automatically (Draft stays Draft). Explore Harbour & Co as a guest for the full sample story. Ask “what next?” for a short checklist.";

export const BLANK_SUGGESTED_CHIPS = [
  "What should I do next?",
  "How do I create an invoice?",
  "Invoice tip: mixed tax / products",
  "Blank banking / starter CSV",
  "Explore sample data",
];

export type CopilotContext = {
  /** Signed-in blank ledger — avoid pretending Harbour KPIs apply */
  blankLedger?: boolean;
  orgName?: string;
};

function overdueInvoices() {
  return invoices.filter((i) => {
    const stored = getInvoiceStatus(i.id, i.status) as
      | "Draft"
      | "Awaiting payment"
      | "Paid"
      | "Overdue";
    return effectiveInvoiceStatus({ status: stored, dueDate: i.dueDate }) === "Overdue";
  });
}

function overdueBills() {
  return bills.filter(
    (b) => effectiveSampleBillStatus(b.id, b.status, b.dueDate) === "Overdue",
  );
}

/** Sum of sample bills currently Overdue under effectiveSampleBillStatus. */
function overdueBillsTotal() {
  return overdueBills().reduce((sum, b) => sum + b.amount, 0);
}

/** Sum of unpaid sample bills not yet overdue (Awaiting approval / Approved). */
function dueBillsTotal() {
  return bills
    .filter((b) => {
      const st = effectiveSampleBillStatus(b.id, b.status, b.dueDate);
      return st === "Awaiting approval" || st === "Approved";
    })
    .reduce((sum, b) => sum + b.amount, 0);
}

/** Sum of sample invoices currently Overdue under effectiveInvoiceStatus. */
function overdueInvoicesTotal() {
  return overdueInvoices().reduce((sum, i) => sum + i.amount, 0);
}

const INV_STORED: UserInvoice["status"][] = ["Draft", "Awaiting payment", "Paid", "Overdue"];
const QUOTE_STORED: UserQuote["status"][] = ["Draft", "Sent", "Accepted", "Declined"];

/** Same resolver the invoice list uses: public pay-page override, then Sydney due-date rule. */
function userInvoiceDisplay(inv: UserInvoice): UserInvoice["status"] {
  const raw = getInvoiceStatus(inv.id, inv.status);
  const stored = (INV_STORED.includes(raw as UserInvoice["status"]) ? raw : inv.status) as UserInvoice["status"];
  return effectiveInvoiceStatus({ status: stored, dueDate: inv.dueDate });
}

function userQuoteDisplay(q: UserQuote) {
  const raw = getQuoteStatus(q.id, q.status);
  const stored = (QUOTE_STORED.includes(raw as UserQuote["status"]) ? raw : q.status) as UserQuote["status"];
  return effectiveQuoteStatus({ status: stored, expiryDate: q.expiryDate });
}

/** Blank-ledger user invoices past due (display status), unpaid — demo-local only. */
function overdueUserInvoices() {
  return loadUserInvoices().filter((i) => userInvoiceDisplay(i) === "Overdue");
}

function awaitingPaymentUserInvoices() {
  return loadUserInvoices().filter((i) => userInvoiceDisplay(i) === "Awaiting payment");
}

function userReceivablesTotal() {
  return loadUserInvoices()
    .filter((i) => {
      const st = userInvoiceDisplay(i);
      return st === "Awaiting payment" || st === "Overdue";
    })
    .reduce((sum, i) => sum + i.amount, 0);
}

/** Blank-ledger user bills past due (display status), unpaid — demo-local only. */
function overdueUserBills() {
  return loadUserBills().filter(
    (b) => effectiveBillStatus(b) === "Overdue",
  );
}

/** Blank-ledger user quotes still Sent (not expired/accepted/declined). */
function awaitingUserQuotes() {
  return loadUserQuotes().filter((q) => userQuoteDisplay(q) === "Sent");
}

/** Blank-ledger user quotes past expiry (display status) — demo-local only. */
function expiredUserQuotes() {
  return loadUserQuotes().filter((q) => userQuoteDisplay(q) === "Expired");
}

function pickUnmatched(blankLedger = false): BankTransaction[] {
  const mode = blankLedger ? "blank" : "sample";
  const accountId = blankLedger ? BLANK_CHEQUE_ACCOUNT_ID : CHEQUE_ACCOUNT_ID;
  return unmatchedForAccount(loadBankTransactions(mode), accountId);
}

function detectIntent(question: string): AiIntent {
  const q = question.toLowerCase().trim();
  if (/\b(categoris|categoriz|uncategor|unmatched|bank\s*line|reconcile|account\s*code|suggest\s*(a\s*)?(category|code))\b/.test(q)) return "categorise";
  if (/\b(bas|gst|lodg|quarter|payg)\b/.test(q)) return "bas";
  if (/\b(chase|maple|pine|inv-?1038|overdue\s*invoice)\b/.test(q)) return "chase_overdue";
  if (/\b(what\s*(should\s*i\s*)?do\s*next|what\s*next|priorit|next\s*action|to[\s-]?do)\b/.test(q)) return "next";
  if (/\b(how\s*(do\s*i\s*)?create\s*(an?\s*)?invoice|create\s*(an?\s*)?invoice)\b/.test(q)) return "invoices";
  if (/\b(how\s*(do\s*i\s*)?create\s*(an?\s*)?quote|create\s*(an?\s*)?quote)\b/.test(q)) return "quotes";
  if (/\b(explore\s*sample|sample\s*data|harbour)\b/.test(q)) return "help";
  if (/\b(draft|suggest).*(invoice|bill)|invoice\s*suggest|bill\s*suggest\b/.test(q)) return "draft_doc";
  if (/\b(cash|liquidity|forecast|on\s*hand)\b/.test(q)) return "cash";
  if (/\b(profit|p\s*&\s*l|pnl|margin)\b/.test(q)) return "profit";
  if (/\b(quote|proposal)\b/.test(q)) return "quotes";
  if (/\b(print).*(bills?|supplier)|(bills?|supplier).*(print)\b/.test(q)) return "bills";
  if (/\b(bills?|payable|supplier)\b/.test(q)) return "bills";
  if (/\b(invoice|receivable|customer)\b/.test(q)) return "invoices";
  if (/\b(blank\s*banking|starter\s*csv|opening\s*balance)\b/.test(q)) return "banking";
  if (/\b(bank|csv|import|reconcil)\b/.test(q)) return "banking";
  if (/\b(help|what\s*can\s*you|how\s*do\s*you)\b/.test(q)) return "help";
  if (/\boverdue\b/.test(q)) return "next";
  return "unknown";
}

function replyNext(): AiReply {
  const overdueInv = overdueInvoices();
  const odBills = overdueBills();
  const odBillsTotal = overdueBillsTotal();
  const maple = overdueInv.find((i) => i.id === "INV-1038") ?? overdueInv[0];
  const unmatched = pickUnmatched();
  const nextBas = getNextBasDue();
  const quotesAwaiting = quotes.filter((q) => {
    const stored = getQuoteStatus(q.id, q.status) as UserQuote["status"];
    return effectiveQuoteStatus({ status: stored, expiryDate: q.expiryDate }) === "Sent";
  }).length;
  const quotesExpired = quotes.filter((q) => {
    const stored = getQuoteStatus(q.id, q.status) as UserQuote["status"];
    return effectiveQuoteStatus({ status: stored, expiryDate: q.expiryDate }) === "Expired";
  }).length;

  const citations: AiCitation[] = [
    { label: "Cash on hand", value: formatAUD(kpis.cashOnHand), source: "kpis.cashOnHand" },
  ];
  if (odBills.length) {
    citations.push({
      label: "Overdue bills",
      value: formatAUD(odBillsTotal),
      source: "overdueBills · effectiveSampleBillStatus",
    });
  }
  if (maple) {
    citations.push({
      label: `${maple.id} · ${maple.contact}`,
      value: `${formatAUD(maple.amount)} overdue (due ${formatDateAU(maple.dueDate)})`,
      source: "invoices sample",
    });
  }
  if (quotesAwaiting) {
    citations.push({
      label: "Quotes awaiting",
      value: String(quotesAwaiting),
      source: "quotes · effectiveQuoteStatus",
    });
  }
  if (quotesExpired) {
    citations.push({
      label: "Expired quotes",
      value: String(quotesExpired),
      source: "quotes · effectiveQuoteStatus",
    });
  }
  if (unmatched.length) {
    citations.push({ label: "Unmatched bank lines", value: String(unmatched.length), source: "cheque account reconciliation" });
  }
  if (nextBas) {
    citations.push({ label: "Next BAS due", value: formatDateAU(nextBas.dueDate), source: nextBas.quarterLabel });
  }

  const priorityBits: string[] = [];
  if (odBills.length) {
    priorityBits.push(
      `clear overdue bills totalling ${formatAUD(odBillsTotal)} (${odBills.length} supplier${odBills.length === 1 ? "" : "s"})`,
    );
  }
  if (maple) {
    priorityBits.push(`chase ${maple.contact} on ${maple.id} (${formatAUD(maple.amount)} overdue)`);
  }
  const priority =
    priorityBits.length > 0
      ? `Priority: ${priorityBits.join(", and ")}.`
      : quotesAwaiting > 0
        ? `Overdue payables and receivables look clear — ${quotesAwaiting} quote${quotesAwaiting === 1 ? "" : "s"} still awaiting a reply.`
        : quotesExpired > 0
          ? `Overdue payables and receivables look clear — ${quotesExpired} expired quote${quotesExpired === 1 ? "" : "s"} could be refreshed or archived.`
          : "Overdue payables and receivables look clear for now.";

  const prose = [
    `Cash looks healthy (${formatAUD(kpis.cashOnHand)} on hand).`,
    priority,
    unmatched.length ? `There are also ${unmatched.length} unmatched bank lines ready to categorise.` : "",
    nextBas ? `Next BAS lodgement window is ${formatDateAU(nextBas.dueDate)} for ${nextBas.quarterLabel} (demo draft only).` : "",
  ].filter(Boolean).join(" ");

  const actions: AiAction[] = [];
  if (odBills.length) {
    actions.push({ id: "bills", label: "Review overdue bills", kind: "link", href: "/demo/bills" });
  }
  if (maple) {
    actions.push({ id: "chase-pay", label: `Open ${maple.id} payment page`, kind: "link", href: `/pay/invoice/${maple.id}` });
    actions.push({ id: "chase-list", label: "Invoices list", kind: "link", href: "/demo/invoices" });
  }
  if (!odBills.length && !maple && quotesAwaiting > 0) {
    actions.push({ id: "quotes", label: "Review quotes awaiting", kind: "link", href: "/demo/quotes" });
  }
  if (!odBills.length && !maple && quotesAwaiting === 0 && quotesExpired > 0) {
    actions.push({ id: "quotes-ex", label: "Review expired quotes", kind: "link", href: "/demo/quotes" });
  }
  if (unmatched.length) {
    actions.push({ id: "cat", label: "Categorise bank lines", kind: "prompt", prompt: "Categorise unmatched bank lines" });
  }
  if (nextBas) {
    actions.push({ id: "bas", label: "Open GST & BAS", kind: "link", href: "/demo/tax/gst-bas" });
  }
  if (actions.length === 0) {
    actions.push({ id: "inv", label: "Invoices list", kind: "link", href: "/demo/invoices" });
  }

  return {
    intent: "next",
    prose,
    citations,
    actions,
    chips: [
      "When is BAS due?",
      "Categorise unmatched bank lines",
      maple ? `Chase ${maple.contact}` : "What should I do next?",
    ],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyBas(): AiReply {
  const next = getNextBasDue();
  const dueLabel = next ? formatDateAU(next.dueDate) : "—";
  const period = next?.quarterLabel ?? gstBas.period;
  const prose = next
    ? `Next BAS due date for ${DEMO_ORG.name} is ${dueLabel} (${period}). The Jul–Sep 2026 draft shows net GST of about ${formatAUD(gstBas.netGst)} payable, plus PAYG figures in the sample. This is a simulated draft only — HyperionInvoices does not lodge with the ATO and this is not tax advice.`
    : `Sample BAS draft for ${gstBas.period} shows net GST ${formatAUD(gstBas.netGst)}. No upcoming due date was calculated. Demo only — no ATO lodgement.`;

  return {
    intent: "bas",
    prose,
    citations: [
      { label: "Next BAS due", value: dueLabel, source: next ? `${next.quarterLabel} · bas-dates` : "n/a" },
      { label: "Net GST (draft)", value: formatAUD(gstBas.netGst), source: "gstBas sample · Jul–Sep 2026" },
      { label: "Period status", value: gstBas.status, source: "gstBas.status" },
    ],
    actions: [
      { id: "bas-page", label: "Open GST & BAS", kind: "link", href: "/demo/tax/gst-bas" },
      { id: "next", label: "What should I do next?", kind: "prompt", prompt: "What should I do next?" },
    ],
    chips: ["What should I do next?", "Chase overdue invoices"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyCategorise(question: string, blankLedger = false): AiReply {
  const unmatched = pickUnmatched(blankLedger);
  if (unmatched.length === 0) {
    return {
      intent: "categorise",
      prose: blankLedger
        ? "No unmatched bank lines on your blank cheque account right now. On Banking: set an opening balance if needed, Try starter CSV for a few generic lines, or upload your own statement — then Ask AI again to categorise. Unmatch undoes an Apply on a line."
        : "No unmatched bank lines right now. On Banking: Try sample CSV to import more, use Unmatch on a categorised line, or Reset categorisations to put sample lines back in the queue. Clear CSV imports removes imported rows only.",
      citations: blankLedger
        ? [{ label: "Ledger mode", value: "Blank", source: "own cheque · browser CSV" }]
        : [],
      actions: [{ id: "bank", label: "Go to Banking", kind: "link", href: blankLedger ? "/demo/banking" : "/demo/banking#import" }],
      chips: blankLedger
        ? ["Blank banking / starter CSV", "What should I do next?"]
        : ["What should I do next?", "When is BAS due?"],
      disclaimer: AI_DISCLAIMER,
    };
  }

  const q = question.toLowerCase();
  const target =
    unmatched.find((t) => q.includes(t.description.toLowerCase().slice(0, 12))) ??
    unmatched.find((t) => /adobe|telstra|rent|officene/i.test(t.description)) ??
    unmatched[0];

  const suggestion = suggestCategory(target.description, target.amount);
  const safe = suggestion.confidence === "high" || suggestion.confidence === "medium";

  const others = unmatched
    .filter((t) => t.id !== target.id)
    .slice(0, 3)
    .map((t) => {
      const s = suggestCategory(t.description, t.amount);
      return `${t.description} → ${s.accountCode} ${s.accountName}`;
    });

  const prose = [
    `For unmatched line “${target.description}” (${formatAUD(target.amount)} on ${formatDateAU(target.date)}), I suggest account ${suggestion.accountCode} — ${suggestion.accountName} (${suggestion.taxRate}).`,
    `Reason: ${suggestion.reason} (${suggestion.confidence} confidence).`,
    safe ? "You can apply this in one click — it stays in this browser demo only." : "Confidence is low — review before applying.",
    others.length ? `Other unmatched: ${others.join("; ")}.` : "",
  ].filter(Boolean).join(" ");

  const actions: AiAction[] = [];
  if (safe) {
    actions.push({
      id: `apply-${target.id}`,
      label: `Apply ${suggestion.accountCode} · ${suggestion.accountName}`,
      kind: "apply-category",
      txnId: target.id,
      category: suggestion,
    });
  }
  actions.push({ id: "bank", label: "Open Banking", kind: "link", href: "/demo/banking" });

  const second = unmatched.find((t) => t.id !== target.id);
  if (second) {
    const s2 = suggestCategory(second.description, second.amount);
    if (s2.confidence === "high" || s2.confidence === "medium") {
      actions.push({
        id: `apply-${second.id}`,
        label: `Also apply to ${second.description.slice(0, 28)}…`,
        kind: "apply-category",
        txnId: second.id,
        category: s2,
      });
    }
  }

  return {
    intent: "categorise",
    prose,
    citations: [
      { label: "Bank line", value: `${target.description} · ${formatAUD(target.amount)}`, source: `${target.source} · ${target.id}` },
      { label: "Suggested account", value: `${suggestion.accountCode} ${suggestion.accountName}`, source: suggestion.reason },
      { label: "Tax rate", value: suggestion.taxRate, source: "chart of accounts default" },
      { label: "Unmatched remaining", value: String(unmatched.length), source: "cheque account" },
    ],
    actions,
    chips: ["Categorise unmatched bank lines", "What should I do next?", "When is BAS due?"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyChase(): AiReply {
  const maple = invoices.find((i) => i.id === "INV-1038")!;
  const mapleStatus = effectiveInvoiceStatus({
    status: getInvoiceStatus(maple.id, maple.status) as UserInvoice["status"],
    dueDate: maple.dueDate,
  });
  const overdue = overdueInvoices();
  const odTotal = overdueInvoicesTotal();
  const top = overdue.find((i) => i.id === "INV-1038") ?? overdue[0];

  if (top) {
    return {
      intent: "chase_overdue",
      prose: `${top.contact} owes ${formatAUD(top.amount)} on ${top.id} (due ${formatDateAU(top.dueDate)}, status Overdue) for “${top.reference}”. Harbour sample overdue invoices total ${formatAUD(odTotal)} across ${overdue.length} customer${overdue.length === 1 ? "" : "s"}. Share the customer payment link or follow up from the invoices list. Demo only — no live email send.`,
      citations: [
        { label: top.id, value: `${formatAUD(top.amount)} · ${top.contact}`, source: `due ${formatDateAU(top.dueDate)} · Overdue` },
        { label: "Overdue invoices", value: formatAUD(odTotal), source: "overdueInvoices · effectiveInvoiceStatus" },
      ],
      actions: [
        { id: "pay", label: `Open /pay/invoice/${top.id}`, kind: "link", href: `/pay/invoice/${top.id}` },
        { id: "inv", label: "Invoices list", kind: "link", href: "/demo/invoices" },
      ],
      chips: ["What should I do next?", "When is BAS due?"],
      disclaimer: AI_DISCLAIMER,
    };
  }

  const mapleNote =
    mapleStatus === "Paid"
      ? `${maple.contact} on ${maple.id} is already Paid (due ${formatDateAU(maple.dueDate)}) — nothing left to chase.`
      : mapleStatus === "Awaiting payment"
        ? `${maple.id} (${maple.contact}) is Awaiting payment, due ${formatDateAU(maple.dueDate)} — not overdue yet.`
        : mapleStatus === "Draft"
          ? `${maple.id} is still a Draft — not open for a chase.`
          : `${maple.id} status is ${mapleStatus}.`;
  const odBills = overdueBills();
  const billNote = odBills.length
    ? ` Overdue bills still total ${formatAUD(overdueBillsTotal())} across ${odBills.length} supplier${odBills.length === 1 ? "" : "s"}.`
    : "";

  return {
    intent: "chase_overdue",
    prose: `No Harbour invoices are overdue right now. ${mapleNote}${billNote} Demo only — no live email send.`,
    citations: [
      { label: maple.id, value: `${formatAUD(maple.amount)} · ${mapleStatus}`, source: `due ${formatDateAU(maple.dueDate)} · effectiveInvoiceStatus` },
      { label: "Overdue invoices", value: formatAUD(0), source: "overdueInvoices · effectiveInvoiceStatus" },
    ],
    actions: [
      { id: "inv", label: "Invoices list", kind: "link", href: "/demo/invoices" },
      ...(odBills.length
        ? [{ id: "bills", label: "Review overdue bills", kind: "link" as const, href: "/demo/bills" }]
        : []),
    ],
    chips: ["What should I do next?", "When is BAS due?"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyCash(): AiReply {
  const cheque = accounts.find((a) => a.id === "chk");
  const odBills = overdueBillsTotal();
  return {
    intent: "cash",
    prose: `${DEMO_ORG.name} shows ${formatAUD(kpis.cashOnHand)} cash on hand (cheque ${formatAUD(cheque?.balance ?? 0)} + savings). 30-day forecast sits around ${formatAUD(kpis.cashForecast30)}. Clear overdue bills (${formatAUD(odBills)}) to protect the runway.`,
    citations: [
      { label: "Cash on hand", value: formatAUD(kpis.cashOnHand), source: "kpis" },
      { label: "30-day forecast", value: formatAUD(kpis.cashForecast30), source: "kpis.cashForecast30" },
      { label: "Overdue bills", value: formatAUD(odBills), source: "overdueBills · effectiveSampleBillStatus" },
    ],
    actions: [
      { id: "bank", label: "Banking", kind: "link", href: "/demo/banking" },
      { id: "next", label: "What next?", kind: "prompt", prompt: "What should I do next?" },
    ],
    chips: SUGGESTED_CHIPS.slice(0, 3),
    disclaimer: AI_DISCLAIMER,
  };
}

function replyInvoices(): AiReply {
  const overdue = overdueInvoices();
  const maple = overdue.find((i) => i.id === "INV-1038") ?? overdue[0];
  const mapleNote = maple
    ? ` — notably ${maple.id} ${maple.contact} (${formatAUD(maple.amount)})`
    : "";
  const awaiting = invoices.filter((i) => {
      const stored = getInvoiceStatus(i.id, i.status) as
        | "Draft"
        | "Awaiting payment"
        | "Paid"
        | "Overdue";
      return effectiveInvoiceStatus({ status: stored, dueDate: i.dueDate }) === "Awaiting payment";
    }).length;
  return {
    intent: "invoices",
    prose: `${invoices.length} sample invoices on file. ${overdue.length} overdue${mapleNote}. ${awaiting} awaiting payment.`,
    citations: overdue.map((i) => ({
      label: i.id,
      value: `${formatAUD(i.amount)} · ${i.contact}`,
      source: `due ${formatDateAU(i.dueDate)}`,
    })),
    actions: [
      { id: "list", label: "Invoices", kind: "link", href: "/demo/invoices" },
      ...(maple
        ? [{ id: "chase", label: `Chase ${maple.id}`, kind: "link" as const, href: `/pay/invoice/${maple.id}` }]
        : []),
    ],
    chips: maple ? [`Chase ${maple.contact}`, "What should I do next?"] : ["What should I do next?", "When is BAS due?"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyBills(): AiReply {
  const od = overdueBills();
  const odTotal = overdueBillsTotal();
  const dueTotal = dueBillsTotal();
  return {
    intent: "bills",
    prose: `Overdue bills total ${formatAUD(odTotal)} across ${od.length} suppliers (${od.map((b) => b.supplier.split(" ")[0]).join(", ")}…). Due this cycle: ${formatAUD(dueTotal)}. Tip: Harbour (and your own) bills use Print for an internal summary only — there is no public vendor pay URL like invoices.`,
    citations: [
      { label: "Overdue total", value: formatAUD(odTotal), source: "overdueBills · effectiveSampleBillStatus" },
      ...od.map((b) => ({
        label: b.id,
        value: `${formatAUD(b.amount)} · ${b.supplier}`,
        source: b.category,
      })),
      { label: "Due soon", value: formatAUD(dueTotal), source: "unpaid · not overdue · effectiveSampleBillStatus" },
      { label: "Print", value: "Internal summary only", source: "no /pay route for bills" },
    ],
    actions: [{ id: "bills", label: "Open bills", kind: "link", href: "/demo/bills" }],
    chips: ["What should I do next?", "When is BAS due?", "How do bills print?"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyQuotes(): AiReply {
  const withDisplay = quotes.map((q) => {
    const stored = getQuoteStatus(q.id, q.status) as UserQuote["status"] | string;
    const status = (["Draft", "Sent", "Accepted", "Declined"].includes(stored)
      ? stored
      : q.status) as "Draft" | "Sent" | "Accepted" | "Declined";
    return {
      ...q,
      display: effectiveQuoteStatus({ status, expiryDate: q.expiryDate }),
    };
  });
  const awaiting = withDisplay.filter((q) => q.display === "Sent");
  const expired = withDisplay.filter((q) => q.display === "Expired");
  const expiredNote =
    expired.length > 0
      ? ` ${expired.length} expired automatically from expiry date (${expired.map((q) => q.id).join(", ")}).`
      : "";
  return {
    intent: "quotes",
    prose: `${awaiting.length} quotes await replies (${awaiting.map((q) => q.id).join(", ") || "none"}).${expiredNote}`,
    citations: [
      ...awaiting.map((q) => ({
        label: q.id,
        value: `${formatAUD(q.amount)} · ${q.contact}`,
        source: q.display,
      })),
      ...expired.map((q) => ({
        label: q.id,
        value: `${formatAUD(q.amount)} · expired ${formatDateAU(q.expiryDate)}`,
        source: "effectiveQuoteStatus",
      })),
    ],
    actions: [{ id: "q", label: "Quotes", kind: "link", href: "/demo/quotes" }],
    chips: ["Draft invoice suggestion", "What should I do next?"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyDraft(): AiReply {
  const tmpl = recurringTemplates[0];
  const accepted = quotes.find((q) => q.status === "Accepted");
  return {
    intent: "draft_doc",
    prose: accepted
      ? `Suggestion: draft an invoice from accepted quote ${accepted.id} (${accepted.contact}, ${formatAUD(accepted.amount)}) for “${accepted.reference}”. Recurring template ${tmpl.id} is also due ${formatDateAU(tmpl.nextDate)} for ${tmpl.contact}. Demo only — open Invoices to continue.`
      : `Recurring template ${tmpl.id} (${tmpl.contact}, ${formatAUD(tmpl.amount)}) is next on ${formatDateAU(tmpl.nextDate)}.`,
    citations: [
      accepted
        ? { label: accepted.id, value: `${formatAUD(accepted.amount)} · Accepted`, source: accepted.contact }
        : { label: tmpl.id, value: formatAUD(tmpl.amount), source: tmpl.contact },
    ],
    actions: [
      { id: "inv", label: "Invoices", kind: "link", href: "/demo/invoices" },
      { id: "quotes", label: "Quotes", kind: "link", href: "/demo/quotes" },
    ],
    chips: ["What should I do next?", "Chase overdue invoices"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyProfit(): AiReply {
  return {
    intent: "profit",
    prose: `Sample YTD net profit is about ${formatAUD(kpis.netProfitYtd)}. Health score ${kpis.healthScore} (${kpis.healthLabel}). Design services drive revenue; wages and rent are the largest costs in this demo story.`,
    citations: [
      { label: "Net profit YTD", value: formatAUD(kpis.netProfitYtd), source: "kpis" },
      { label: "Health", value: `${kpis.healthScore} · ${kpis.healthLabel}`, source: "kpis" },
    ],
    actions: [{ id: "rep", label: "Reports", kind: "link", href: "/demo/reports" }],
    chips: SUGGESTED_CHIPS.slice(0, 3),
    disclaimer: AI_DISCLAIMER,
  };
}

function replyBanking(): AiReply {
  const unmatched = pickUnmatched();
  const cheque = accounts.find((a) => a.id === "chk")!;
  return {
    intent: "banking",
    prose: `Cheque account balance ${formatAUD(cheque.balance)} with ${unmatched.length} unmatched lines. CSV import runs in the browser — no live bank feed. After Apply / Ask AI, use Unmatch on a line or Reset categorisations; Clear CSV imports drops imported rows only.`,
    citations: [
      { label: "Cheque balance", value: formatAUD(cheque.balance), source: cheque.name },
      { label: "Unmatched", value: String(unmatched.length), source: "reconciliation" },
    ],
    actions: [
      { id: "bank", label: "Banking", kind: "link", href: "/demo/banking" },
      { id: "cat", label: "Categorise unmatched", kind: "prompt", prompt: "Categorise unmatched bank lines" },
    ],
    chips: ["Categorise unmatched bank lines", "What should I do next?"],
    disclaimer: AI_DISCLAIMER,
  };
}

function replyHelp(): AiReply {
  return {
    intent: "help",
    prose: `I ground answers in the ${DEMO_ORG.name} sample ledger: cash, invoices (incl. INV-1038), bills, banking unmatched lines (Unmatch / Reset / Clear CSV on Banking), and BAS due dates. Try the chips below. ${AI_DISCLAIMER}`,
    citations: [
      { label: "Org", value: DEMO_ORG.name, source: "DEMO_ORG" },
      { label: "Open tasks", value: String(tasks.length), source: "tasks" },
    ],
    actions: [],
    chips: SUGGESTED_CHIPS,
    disclaimer: AI_DISCLAIMER,
  };
}

function replyUnknown(): AiReply {
  return {
    intent: "unknown",
    prose: "I couldn’t match that to a ledger intent. Try asking about what’s next, BAS due, categorising bank lines, chasing INV-1038, cash, or drafting an invoice from sample data.",
    citations: [],
    actions: [{ id: "next", label: "What should I do next?", kind: "prompt", prompt: "What should I do next?" }],
    chips: SUGGESTED_CHIPS,
    disclaimer: AI_DISCLAIMER,
  };
}

function replyBlankNext(orgName?: string): AiReply {
  const who = orgName || "your organisation";
  const odInv = overdueUserInvoices();
  const odBills = overdueUserBills();
  const odBillsTotal = odBills.reduce((sum, b) => sum + b.amount, 0);
  const chase = odInv[0];
  const awaiting = awaitingUserQuotes();
  const ex = expiredUserQuotes();
  const awaitingPay = awaitingPaymentUserInvoices();
  const receivables = userReceivablesTotal();
  const hasAnyDocs =
    loadUserInvoices().length + loadUserQuotes().length + loadUserBills().length > 0;
  const statusNote =
    " Past-due unpaid invoices show Overdue and Sent quotes past expiry show Expired automatically (Draft stays Draft).";

  const priority = blankNextInsight({
    overdueBillAmounts: odBills.map((b) => b.amount),
    overdueInvoice: chase,
    quotesAwaiting: awaiting.length,
    quotesExpired: ex.length,
    receivables,
    hasAnyDocs,
  });

  const prose = [
    `${who} is on a blank starting ledger (no Harbour sample KPIs).`,
    priority,
    statusNote.trim(),
  ].join(" ");

  const citations: AiCitation[] = [
    { label: "Ledger mode", value: "Blank", source: "onboarding choice" },
    { label: "Org", value: who, source: "session" },
  ];
  if (odBills.length) {
    citations.push({
      label: "Your overdue bills",
      value: formatAUD(odBillsTotal),
      source: "user bills · effectiveBillStatus",
    });
  }
  if (chase) {
    citations.push({
      label: `${chase.id} · ${chase.contact}`,
      value: `${formatAUD(chase.amount)} overdue (due ${formatDateAU(chase.dueDate)})`,
      source: "user invoices · effectiveInvoiceStatus",
    });
  }
  if (receivables > 0) {
    citations.push({
      label: "Receivables",
      value: formatAUD(receivables),
      source: "user invoices · effectiveInvoiceStatus",
    });
  }
  if (awaitingPay.length) {
    const first = awaitingPay[0];
    citations.push({
      label: `${first.id} · ${first.contact}`,
      value: `${formatAUD(first.amount)} awaiting payment`,
      source: "user invoices · effectiveInvoiceStatus",
    });
  }
  if (awaiting.length) {
    citations.push({
      label: "Quotes awaiting",
      value: String(awaiting.length),
      source: "user quotes · effectiveQuoteStatus",
    });
  }
  if (ex.length) {
    citations.push({
      label: "Expired quotes",
      value: String(ex.length),
      source: "user quotes · effectiveQuoteStatus",
    });
  }

  const actions: AiAction[] = [];
  if (odBills.length) {
    actions.push({ id: "bills", label: "Review overdue bills", kind: "link", href: "/demo/bills" });
  }
  if (chase) {
    actions.push({ id: "chase-pay", label: `Open ${chase.id} payment page`, kind: "link", href: `/pay/invoice/${chase.id}` });
    actions.push({ id: "chase-list", label: "Invoices list", kind: "link", href: "/demo/invoices" });
  }
  if (!odBills.length && !chase && awaiting.length > 0) {
    actions.push({ id: "quotes", label: "Review quotes awaiting", kind: "link", href: "/demo/quotes" });
  }
  if (!odBills.length && !chase && awaiting.length === 0 && ex.length > 0) {
    actions.push({ id: "quotes-ex", label: "Review expired quotes", kind: "link", href: "/demo/quotes" });
  }
  if (actions.length === 0) {
    if (loadUserInvoices().length > 0) {
      actions.push({ id: "inv", label: "Review invoices", kind: "link", href: "/demo/invoices" });
      const open = awaitingPay[0] ?? odInv[0];
      if (open) {
        actions.push({
          id: "pay",
          label: `Pay link · ${open.id}`,
          kind: "link",
          href: `/pay/invoice/${encodeURIComponent(open.id)}`,
        });
      }
    } else {
      actions.push({ id: "inv", label: "Create mixed-tax invoice", kind: "link", href: "/demo/invoices?mixed=1" });
      actions.push({ id: "qu", label: "Create mixed-tax quote", kind: "link", href: "/demo/quotes?mixed=1" });
      actions.push({ id: "bill", label: "Create mixed-tax bill", kind: "link", href: "/demo/bills?mixed=1" });
    }
    actions.push({ id: "sample", label: "Overview", kind: "link", href: "/demo" });
  }

  return {
    intent: "next",
    prose,
    citations,
    actions,
    chips: BLANK_SUGGESTED_CHIPS,
    disclaimer: AI_DISCLAIMER,
  };
}

function replyBlankRedirect(intent: AiIntent, orgName?: string): AiReply {
  const who = orgName || "your organisation";
  if (intent === "invoices") {
    return {
      intent,
      prose: `On ${who}'s blank ledger, open Invoices and use Create invoice (contact, tax-exclusive lines, GST on Income / GST Free Income). Tip: “Create mixed-tax sample” (or ?mixed=1) one-click creates a GST on Income + GST Free Income invoice — then open the pay link for the nebula tax-invoice header. Past-due unpaid rows show Overdue automatically (Draft stays Draft; same idea as bills). No Harbour sample list is mixed in.`,
      citations: [{ label: "Ledger mode", value: "Blank", source: "onboarding choice" }],
      actions: [
        { id: "inv-mixed", label: "Create mixed-tax sample", kind: "link", href: "/demo/invoices?mixed=1" },
        { id: "inv", label: "Open Invoices", kind: "link", href: "/demo/invoices" },
        { id: "next", label: "What should I do next?", kind: "prompt", prompt: "What should I do next?" },
      ],
      chips: BLANK_SUGGESTED_CHIPS,
      disclaimer: AI_DISCLAIMER,
    };
  }
  if (intent === "quotes" || intent === "draft_doc") {
    const expired = expiredUserQuotes();
    const expiredNote =
      expired.length > 0
        ? ` You already have ${expired.length} expired quote${expired.length === 1 ? "" : "s"} (e.g. ${expired[0].id}) — open Quotes to refresh or archive.`
        : "";
    return {
      intent,
      prose: `On ${who}'s blank ledger, open Quotes and use Create quote — same flow as invoices (14-day expiry, customer link, nebula header). Tip: “Create mixed-tax sample” or ?mixed=1 one-click creates a GST on Income + GST Free Income quote. Accept/decline is simulated on the public page. Sent quotes past expiry show Expired automatically (Draft stays Draft) — same idea as invoice Overdue.${expiredNote}`,
      citations: [
        { label: "Ledger mode", value: "Blank", source: "onboarding choice" },
        ...expired.slice(0, 3).map((q) => ({
          label: q.id,
          value: `${formatAUD(q.amount)} · expired ${formatDateAU(q.expiryDate)}`,
          source: "user quotes · effectiveQuoteStatus",
        })),
      ],
      actions: [
        { id: "qu", label: "Create mixed-tax sample", kind: "link", href: "/demo/quotes?mixed=1" },
        { id: "quotes-list", label: "Open Quotes", kind: "link", href: "/demo/quotes" },
        { id: "inv", label: "Open Invoices", kind: "link", href: "/demo/invoices" },
      ],
      chips: BLANK_SUGGESTED_CHIPS,
      disclaimer: AI_DISCLAIMER,
    };
  }
  if (intent === "categorise" || intent === "banking" || intent === "cash") {
    return {
      intent,
      prose: `${who}'s blank ledger has its own cheque account (not Harbour balances). On Banking: set an opening balance so cash total is clear, Try starter CSV for a few generic lines, or upload your own statement — then categorise unmatched lines (Apply / Ask AI / Unmatch). Harbour sample KPIs stay in the guest demo.`,
      citations: [
        { label: "Ledger mode", value: "Blank", source: "onboarding choice" },
        { label: "Cheque", value: "blank-chk · browser CSV", source: "/demo/banking" },
      ],
      actions: [
        { id: "bank", label: "Open Banking", kind: "link", href: "/demo/banking" },
        { id: "next", label: "What should I do next?", kind: "prompt", prompt: "What should I do next?" },
      ],
      chips: BLANK_SUGGESTED_CHIPS,
      disclaimer: AI_DISCLAIMER,
    };
  }
  if (intent === "bills") {
    return {
      intent,
      prose: `On ${who}'s blank ledger, open Bills to create a supplier bill (multi-line). Tip: “Create mixed-tax sample” or ?mixed=1 one-click creates a GST on Expenses + GST Free Expenses bill — then Approve / Mark paid on the status strip. Print works for an internal summary (same as Harbour sample bills) — there is no public pay URL for bills. Harbour overdue sample totals live in the guest demo.`,
      citations: [
        { label: "Ledger mode", value: "Blank", source: "onboarding choice" },
        { label: "Print", value: "Internal summary only", source: "no /pay route for bills" },
      ],
      actions: [
        { id: "bills-mixed", label: "Create mixed-tax sample", kind: "link", href: "/demo/bills?mixed=1" },
        { id: "bills", label: "Open Bills", kind: "link", href: "/demo/bills" },
        { id: "next", label: "What should I do next?", kind: "prompt", prompt: "What should I do next?" },
      ],
      chips: [...BLANK_SUGGESTED_CHIPS.slice(0, 3), "How do bills print?"],
      disclaimer: AI_DISCLAIMER,
    };
  }
  if (intent === "chase_overdue") {
    const od = overdueUserInvoices();
    if (od.length > 0) {
      const top = od[0];
      const total = od.reduce((s, i) => s + i.amount, 0);
      return {
        intent,
        prose: `${who} has ${od.length} overdue invoice${od.length === 1 ? "" : "s"} totalling ${formatAUD(total)} (e.g. ${top.id} ${top.contact}, due ${formatDateAU(top.dueDate)}). Share the customer pay link or follow up from the invoices list. Demo-local only — status flips to Overdue from the due date when unpaid.`,
        citations: od.slice(0, 3).map((i) => ({
          label: i.id,
          value: `${formatAUD(i.amount)} · due ${formatDateAU(i.dueDate)}`,
          source: "user invoices · effectiveInvoiceStatus",
        })),
        actions: [
          { id: "inv", label: "Open Invoices", kind: "link", href: "/demo/invoices" },
          { id: "pay", label: `Pay link · ${top.id}`, kind: "link", href: `/pay/invoice/${encodeURIComponent(top.id)}` },
        ],
        chips: BLANK_SUGGESTED_CHIPS,
        disclaimer: AI_DISCLAIMER,
      };
    }
    return {
      intent,
      prose: `${who} has no overdue user invoices yet. Create an invoice and set a past due date (or wait until due) to see Overdue automatically — or explore Harbour & Co as a guest to chase sample INV-1038 Maple & Pine.`,
      citations: [{ label: "Ledger mode", value: "Blank", source: "onboarding choice" }],
      actions: [
        { id: "inv", label: "Create mixed-tax invoice", kind: "link", href: "/demo/invoices?mixed=1" },
        { id: "sample", label: "Overview / explore sample", kind: "link", href: "/demo" },
      ],
      chips: BLANK_SUGGESTED_CHIPS,
      disclaimer: AI_DISCLAIMER,
    };
  }

  const topic =
    intent === "bas"
      ? "BAS due dates and GST drafts"
      : intent === "profit"
          ? "profit KPIs"
          : "Harbour sample facts";
  return {
    intent,
    prose: `${who} is blank — I don't have ${topic} for this org yet. Create your own invoice/quote here, use Banking (own cheque + starter CSV), or explore Harbour & Co as a guest where those sample answers live.`,
    citations: [{ label: "Ledger mode", value: "Blank", source: "onboarding choice" }],
    actions: [
      { id: "inv", label: "Mixed-tax invoice", kind: "link", href: "/demo/invoices?mixed=1" },
      { id: "qu", label: "Quotes", kind: "link", href: "/demo/quotes" },
      { id: "bank", label: "Banking", kind: "link", href: "/demo/banking" },
      { id: "next", label: "What should I do next?", kind: "prompt", prompt: "What should I do next?" },
    ],
    chips: BLANK_SUGGESTED_CHIPS,
    disclaimer: AI_DISCLAIMER,
  };
}

/** Main entry — pattern-match intent and retrieve facts from sample + local bank state. */
export function getCopilotReply(question: string, ctx?: CopilotContext): AiReply {
  const intent = detectIntent(question || "");
  if (ctx?.blankLedger) {
    if (intent === "categorise") {
      return replyCategorise(question, true);
    }
    if (intent === "next" || intent === "help" || intent === "unknown") {
      return replyBlankNext(ctx.orgName);
    }
    // Light redirect for sample-tied topics — keep engine intact for guest/sample mode
    return replyBlankRedirect(intent, ctx.orgName);
  }
  switch (intent) {
    case "next":
      return replyNext();
    case "bas":
      return replyBas();
    case "categorise":
      return replyCategorise(question);
    case "chase_overdue":
      return replyChase();
    case "cash":
      return replyCash();
    case "invoices":
      return replyInvoices();
    case "bills":
      return replyBills();
    case "quotes":
      return replyQuotes();
    case "draft_doc":
      return replyDraft();
    case "profit":
      return replyProfit();
    case "banking":
      return replyBanking();
    case "help":
      return replyHelp();
    default:
      return replyUnknown();
  }
}

/** Plain-text helper for older call sites. */
export function getAiReply(question: string): string {
  const r = getCopilotReply(question);
  return `${r.prose}\n\n(${r.disclaimer})`;
}
