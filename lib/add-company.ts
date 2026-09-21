/** Browser-only handoff after Add company → signup / onboarding / account. */

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

/** Accepts `returnTo`, `return`, or `next` from Iapetus and this PR. */
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
