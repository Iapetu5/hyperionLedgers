/** Browser-only handoff after Add company → signup / onboarding / account. */

export const ADD_COMPANY_KEY = "hl_add_company_v1";

export const ADD_COMPANY_RETURNS = ["/signup", "/onboarding", "/demo/account"] as const;

export type SelectedCompany = {
  legalName: string;
  abn: string;
  gstRegistered: boolean;
};

export function safeAddCompanyReturn(raw: string | null | undefined): (typeof ADD_COMPANY_RETURNS)[number] {
  const path = (raw ?? "").split("?")[0];
  return (ADD_COMPANY_RETURNS as readonly string[]).includes(path)
    ? (path as (typeof ADD_COMPANY_RETURNS)[number])
    : "/onboarding";
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
    if (!parsed?.legalName || !parsed?.abn) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSelectedCompany() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADD_COMPANY_KEY);
}
