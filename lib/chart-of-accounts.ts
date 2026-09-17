/** Demo chart of accounts for Harbour & Co categorisation suggestions. */

export type TaxRateCode = "GST" | "GST-free" | "BAS excluded";

export type ChartAccount = {
  code: string;
  name: string;
  type: "expense" | "income" | "asset" | "liability";
  defaultTax: TaxRateCode;
};

export const chartOfAccounts: ChartAccount[] = [
  { code: "400", name: "Design & creative services", type: "income", defaultTax: "GST" },
  { code: "404", name: "Retainer income", type: "income", defaultTax: "GST" },
  { code: "410", name: "Other income", type: "income", defaultTax: "GST" },
  { code: "420", name: "POS / merchant receipts", type: "income", defaultTax: "GST" },
  { code: "610", name: "Office supplies", type: "expense", defaultTax: "GST" },
  { code: "620", name: "Software & subscriptions", type: "expense", defaultTax: "GST" },
  { code: "630", name: "Telephone & internet", type: "expense", defaultTax: "GST" },
  { code: "640", name: "Rent — premises", type: "expense", defaultTax: "GST" },
  { code: "650", name: "Insurance", type: "expense", defaultTax: "GST-free" },
  { code: "660", name: "Freight & courier", type: "expense", defaultTax: "GST" },
  { code: "670", name: "Printing & production", type: "expense", defaultTax: "GST" },
  { code: "680", name: "Bank fees", type: "expense", defaultTax: "BAS excluded" },
  { code: "690", name: "General expenses", type: "expense", defaultTax: "GST" },
];

export type CategorySuggestion = {
  accountCode: string;
  accountName: string;
  taxRate: TaxRateCode;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type Rule = {
  test: RegExp;
  accountCode: string;
  reason: string;
  confidence?: "high" | "medium" | "low";
};

const RULES: Rule[] = [
  { test: /adobe|creative\s*cloud|figma|canva|notion|slack|github|aws|google\s*workspace|microsoft\s*365|cloudnest|software(\s*subscription)?|saas/i, accountCode: "620", reason: "Software / SaaS keyword match", confidence: "high" },
  { test: /telstra|optus|vodafone|nbn|internet|phone/i, accountCode: "630", reason: "Telecom keyword match", confidence: "high" },
  { test: /rent|landlord|studio\s*rent/i, accountCode: "640", reason: "Rent keyword match", confidence: "high" },
  { test: /officene?st|staples|officeworks|supplies/i, accountCode: "610", reason: "Office supplies keyword match", confidence: "high" },
  { test: /insurance|broker/i, accountCode: "650", reason: "Insurance keyword match", confidence: "high" },
  { test: /courier|freight|auspost|australia\s*post|metro\s*link/i, accountCode: "660", reason: "Freight keyword match", confidence: "high" },
  { test: /print|paper\s*&\s*pixel/i, accountCode: "670", reason: "Printing keyword match", confidence: "high" },
  { test: /bank\s*fee|merchant\s*fee/i, accountCode: "680", reason: "Bank fee keyword match", confidence: "high" },
  { test: /\bato\b|bas\s*instalment|payg\s*(withholding|instalment)?/i, accountCode: "690", reason: "ATO / BAS payment keyword match", confidence: "medium" },
  { test: /retainer|coastal\s*yoga/i, accountCode: "404", reason: "Retainer income match", confidence: "high" },
  { test: /client\s*receipt|invoice\s*payment|northside|maple|riverbend|bluegum/i, accountCode: "400", reason: "Client receipt / design income", confidence: "medium" },
  { test: /square|stripe|paypal|pos\s*settlement/i, accountCode: "420", reason: "Merchant settlement match", confidence: "high" },
];

export function suggestCategory(description: string, amount: number): CategorySuggestion {
  for (const rule of RULES) {
    if (rule.test.test(description)) {
      const acct = chartOfAccounts.find((a) => a.code === rule.accountCode)!;
      return {
        accountCode: acct.code,
        accountName: acct.name,
        taxRate: acct.defaultTax,
        confidence: rule.confidence ?? "medium",
        reason: rule.reason,
      };
    }
  }
  // Fallback by sign
  if (amount > 0) {
    const acct = chartOfAccounts.find((a) => a.code === "410")!;
    return {
      accountCode: acct.code,
      accountName: acct.name,
      taxRate: acct.defaultTax,
      confidence: "low",
      reason: "Positive amount — defaulting to other income",
    };
  }
  const acct = chartOfAccounts.find((a) => a.code === "690")!;
  return {
    accountCode: acct.code,
    accountName: acct.name,
    taxRate: acct.defaultTax,
    confidence: "low",
    reason: "No strong keyword match — general expenses",
  };
}
