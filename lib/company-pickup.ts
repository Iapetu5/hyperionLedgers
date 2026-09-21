/** Add company handoff: search → select → confirm fills businessName + ABN (+ GST). */

export { searchAbrByName } from "@/lib/abn";

export const ADD_COMPANY_KEY = "hl_add_company_v1";

export const ADD_COMPANY_RETURNS = ["/signup", "/onboarding", "/demo/account", "/demo"] as const;

export type SelectedCompany = {
  legalName: string;
  abn: string;
  gstRegistered: boolean;
  entityType?: string;
  address?: string;
};

function isSafePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

/** Accepts `returnTo`, `return`, or `next`. */
export function safeAddCompanyReturn(raw: string | null | undefined): string {
  const path = (raw ?? "").split("?")[0];
  if ((ADD_COMPANY_RETURNS as readonly string[]).includes(path)) return path;
  if (isSafePath(path)) return path;
  return "/onboarding";
}

export function addCompanyHref(returnTo = "/onboarding"): string {
  const dest = safeAddCompanyReturn(returnTo);
  return `/add-company?returnTo=${encodeURIComponent(dest)}`;
}

/** Signup → Add company → organisation setup. */
export const SETUP_STEP = {
  account: "Step 1 of 3 · Your account",
  addCompany: "Step 2 of 3 · Add company",
  organisation: "Step 3 of 3 · Organisation setup",
} as const;

/** True when the org name is a real company, not the signup placeholder. */
export function isRealCompanyName(name?: string | null): boolean {
  const n = (name ?? "").trim();
  return n.length > 0 && n !== "Your organisation";
}

/** Inline Add company / Account name errors. Empty is allowed only when the field is blank on purpose. */
export function validateBusinessName(name?: string | null): string | null {
  const n = (name ?? "").trim();
  if (!n) return "Enter the business name.";
  if (n === "Your organisation") return "Use your real business name.";
  if (n.length < 2) return "Enter the full business name.";
  return null;
}

export function saveSelectedCompany(company: SelectedCompany) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADD_COMPANY_KEY, JSON.stringify(company));
}

export function readSelectedCompany(): SelectedCompany | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ADD_COMPANY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SelectedCompany;
    if (!parsed?.legalName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSelectedCompany() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADD_COMPANY_KEY);
}
