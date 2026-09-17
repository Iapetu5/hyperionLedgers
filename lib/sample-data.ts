/** Fictional Australian sample data for the HyperionLedgers demo. */

export const DEMO_ORG = {
  name: "Harbour & Co Studio Pty Ltd",
  abn: "51 824 753 556",
  suburb: "Surry Hills",
  state: "NSW",
  postcode: "2010",
  demoLabel: "Demo organisation — sample data only",
};

export const accounts = [
  {
    id: "chk",
    name: "Business cheque account",
    bank: "Sample Commonwealth Bank",
    accountNumber: "062-000 1234 5678",
    balance: 42850.32,
    statementBalance: 41200.1,
    ledgerBalance: 42850.32,
    toReconcile: 7,
  },
  {
    id: "sav",
    name: "Business savings",
    bank: "Sample Commonwealth Bank",
    accountNumber: "062-000 9876 5432",
    balance: 86500.0,
    statementBalance: 86500.0,
    ledgerBalance: 86500.0,
    toReconcile: 0,
  },
];

/** Removed unused static payables strip — live totals use effectiveSampleBillStatus on bills[]. */
// export const billsToPay = { due, overdue, months } — was unused; do not reintroduce static overdue $.

export const tasks = [
  { id: "t1", text: "7 items to reconcile", href: "/demo/banking", urgent: true },
  { id: "t2", text: "1 quote awaiting reply", href: "/demo/quotes", urgent: false },
  { id: "t3", text: "3 overdue bills", href: "/demo/bills", urgent: true },
  { id: "t4", text: "BAS draft ready for Sep quarter", href: "/demo/tax/gst-bas", urgent: false },
];

export const recentInvoicePayments = [
  { month: "Apr", amount: 18500 },
  { month: "May", amount: 22100 },
  { month: "Jun", amount: 19800 },
  { month: "Jul", amount: 25400 },
  { month: "Aug", amount: 23900 },
  { month: "Sep", amount: 27200 },
];

export const kpis = {
  cashOnHand: 129350.32,
  netProfitYtd: 27779,
  receivables: 10670,
  payables: 2742.5,
  healthScore: 78,
  healthLabel: "Good",
  quotesAwaiting: 1,
  billsToPayCount: 3,
  lowStock: 2,
  cashForecast30: 118400,
};

export const cashForecast = [
  { label: "Today", balance: 129350 },
  { label: "30 days", balance: 118400 },
  { label: "60 days", balance: 124800 },
  { label: "90 days", balance: 131200 },
];

export type InvoiceStatus = "Draft" | "Awaiting payment" | "Paid" | "Overdue";

/** Optional tax-exclusive lines for Harbour pay/print (Xero-style tax rates). */
export type SampleDocLine = {
  description: string;
  qty: number;
  unitPrice: number;
  /** Tax-exclusive line total */
  amount: number;
  taxRate: "GST" | "GST-free";
};

export const invoices = [
  {
    id: "INV-1042",
    contact: "Northside Café Group Pty Ltd",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    /** Mixed tax: GST only on taxable lines (2500 × 10%); GST Free line excluded from GST */
    amount: 3850,
    gst: 250,
    status: "Paid" as InvoiceStatus,
    recurring: false,
    reference: "Brand refresh + export pack",
    lineItems: [
      { description: "Brand refresh — phase 2", qty: 1, unitPrice: 2500, amount: 2500, taxRate: "GST" as const },
      { description: "GST-free export design pack", qty: 1, unitPrice: 1100, amount: 1100, taxRate: "GST-free" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "INV-1043",
    contact: "Bluegum Dental Practice",
    issueDate: "2026-09-05",
    dueDate: "2026-09-19",
    amount: 2200,
    gst: 200,
    status: "Awaiting payment" as InvoiceStatus,
    recurring: false,
    reference: "Website hosting Q3",
    lineItems: [
      { description: "Website hosting Q3", qty: 1, unitPrice: 2000, amount: 2000, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "INV-1044",
    contact: "Riverbend Legal Partners",
    issueDate: "2026-09-08",
    dueDate: "2026-09-22",
    amount: 6600,
    gst: 600,
    status: "Awaiting payment" as InvoiceStatus,
    recurring: false,
    reference: "Identity system design",
    lineItems: [
      { description: "Identity system design", qty: 1, unitPrice: 6000, amount: 6000, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "INV-R012",
    contact: "Coastal Yoga Collective",
    issueDate: "2026-09-01",
    dueDate: "2026-09-14",
    amount: 550,
    gst: 50,
    status: "Paid" as InvoiceStatus,
    recurring: true,
    reference: "Monthly retainer",
    lineItems: [
      { description: "Monthly retainer — social & email", qty: 1, unitPrice: 500, amount: 500, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "INV-1038",
    contact: "Maple & Pine Interiors",
    issueDate: "2026-08-12",
    dueDate: "2026-08-26",
    amount: 1870,
    gst: 170,
    status: "Overdue" as InvoiceStatus,
    recurring: false,
    reference: "Catalogue photography",
    lineItems: [
      { description: "Catalogue photography — half-day shoot with edited selects", qty: 1, unitPrice: 1700, amount: 1700, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
];

export const recurringTemplates = [
  { id: "REC-01", contact: "Coastal Yoga Collective", amount: 550, frequency: "Monthly", nextDate: "2026-10-01", description: "Monthly retainer — social & email" },
  { id: "REC-02", contact: "Bluegum Dental Practice", amount: 2200, frequency: "Quarterly", nextDate: "2026-12-01", description: "Hosting & support retainer" },
];

export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Declined";

export const quotes = [
  {
    id: "QU-210",
    contact: "Northside Café Group Pty Ltd",
    issueDate: "2026-09-10",
    expiryDate: "2026-09-24",
    /** Mixed tax: GST only on redesign + photography; GST Free export pack excluded from GST */
    amount: 8030,
    gst: 630,
    status: "Sent" as QuoteStatus,
    reference: "Menu redesign + photography + export pack",
    lineItems: [
      { description: "Menu redesign — print + digital", qty: 1, unitPrice: 1200, amount: 1200, taxRate: "GST" as const },
      { description: "Catalogue photography — half-day with edited selects", qty: 3, unitPrice: 1700, amount: 5100, taxRate: "GST" as const },
      { description: "GST-free export design pack", qty: 1, unitPrice: 1100, amount: 1100, taxRate: "GST-free" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "QU-209",
    contact: "Harbourfront Events Co",
    issueDate: "2026-09-08",
    expiryDate: "2026-09-12",
    amount: 4400,
    gst: 400,
    status: "Sent" as QuoteStatus,
    reference: "Event brand kit",
    lineItems: [
      { description: "Event brand kit", qty: 1, unitPrice: 4000, amount: 4000, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "QU-208",
    contact: "Riverbend Legal Partners",
    issueDate: "2026-09-02",
    expiryDate: "2026-09-16",
    amount: 12100,
    gst: 1100,
    status: "Accepted" as QuoteStatus,
    reference: "Website redesign proposal",
    lineItems: [
      { description: "Website redesign proposal", qty: 1, unitPrice: 11000, amount: 11000, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "QU-207",
    contact: "Maple & Pine Interiors",
    issueDate: "2026-08-28",
    expiryDate: "2026-09-11",
    amount: 2750,
    gst: 250,
    status: "Declined" as QuoteStatus,
    reference: "Showroom signage",
    lineItems: [
      { description: "Showroom signage", qty: 1, unitPrice: 2500, amount: 2500, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "QU-206",
    contact: "Bluegum Dental Practice",
    issueDate: "2026-09-14",
    expiryDate: "2026-09-28",
    amount: 1650,
    gst: 150,
    status: "Draft" as QuoteStatus,
    reference: "Patient brochure refresh",
    lineItems: [
      { description: "Patient brochure refresh", qty: 1, unitPrice: 1500, amount: 1500, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
];

export const bills = [
  {
    id: "BILL-2201",
    supplier: "OfficeNest Supplies Pty Ltd",
    date: "2026-09-10",
    dueDate: "2026-09-24",
    amount: 412.5,
    gst: 37.5,
    status: "Awaiting approval",
    category: "Office supplies",
    lineItems: [
      { description: "Stationery pack — A4 + envelopes", qty: 1, unitPrice: 375, amount: 375, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "BILL-2204",
    supplier: "Paper & Pixel Print Co",
    date: "2026-09-12",
    dueDate: "2026-09-26",
    /** Mixed: GST only on print run (1000 × 10%); GST Free packing inserts excluded from GST */
    amount: 1265,
    gst: 100,
    status: "Approved",
    category: "Printing",
    lineItems: [
      { description: "Print run — menus (colour)", qty: 1, unitPrice: 1000, amount: 1000, taxRate: "GST" as const },
      { description: "Export packing inserts (GST-free)", qty: 1, unitPrice: 165, amount: 165, taxRate: "GST-free" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "BILL-2195",
    supplier: "Metro Link Couriers",
    date: "2026-08-20",
    dueDate: "2026-09-03",
    amount: 880,
    gst: 80,
    status: "Overdue",
    category: "Freight",
    lineItems: [
      { description: "Metro courier — 4 drops", qty: 4, unitPrice: 200, amount: 800, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "BILL-2190",
    supplier: "Brightside Insurance Brokers",
    date: "2026-08-15",
    dueDate: "2026-08-29",
    amount: 1450,
    gst: 0,
    status: "Overdue",
    category: "Insurance",
    lineItems: [
      { description: "Public liability premium instalment", qty: 1, unitPrice: 1450, amount: 1450, taxRate: "GST-free" as const },
    ] satisfies SampleDocLine[],
  },
  {
    id: "BILL-2188",
    supplier: "CloudNest Hosting Pty Ltd",
    date: "2026-08-10",
    dueDate: "2026-08-24",
    amount: 850.5,
    gst: 77.32,
    status: "Overdue",
    category: "Software",
    lineItems: [
      { description: "Cloud hosting — monthly", qty: 1, unitPrice: 773.18, amount: 773.18, taxRate: "GST" as const },
    ] satisfies SampleDocLine[],
  },
];

export const gstBas = {
  period: "1 Jul 2026 – 30 Sep 2026 (Q1)",
  status: "Draft preview — prepared, not lodged with the ATO",
  g1: 97000, g2: 0, g3: 0, g10: 22800, g11: 41200,
  gstOnSales: 8818.18, gstOnPurchases: 5827.27, netGst: 2990.91,
  paygWithheld: 12600, paygInstalment: 4500,
};

export const basPeriods = [
  { id: "q1-26", label: "1 Jul 2026 – 30 Sep 2026 (Q1)", status: "Draft preview — not lodged", gstCollected: 8818.18, gstPaid: 5827.27, netGst: 2990.91, due: "2026-10-28" },
  { id: "q4-25", label: "1 Apr 2026 – 30 Jun 2026 (Q4)", status: "Demo period — not lodged", gstCollected: 7420, gstPaid: 5100, netGst: 2320, due: "2026-07-28" },
  { id: "q3-25", label: "1 Jan 2026 – 31 Mar 2026 (Q3)", status: "Demo period — not lodged", gstCollected: 6980, gstPaid: 4820, netGst: 2160, due: "2026-04-28" },
];

