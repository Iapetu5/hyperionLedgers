/** Browser-local demo auth. Accounts stay in localStorage — never sent to a server. */

import { formatAbn, validateAbnField } from "./abn";

export const AUTH_ACCOUNTS_KEY = "hl_demo_accounts_v1";
export const AUTH_SESSION_KEY = "hl_demo_session_v1";
export const AUTH_SALT = "hyperionledgers-demo-v1";

export type GstAccountingMethod = "accruals" | "cash";
export type LedgerMode = "sample" | "blank";

/** Placeholder org name until the user saves a company on /add-company. */
export const PENDING_ORG_NAME = "Your organisation";

export type ProfilePatch = {
  abn?: string;
  businessName?: string;
  gstRegistered?: boolean;
  gstAccountingMethod?: GstAccountingMethod;
  financialYearEnd?: string;
  entityType?: string;
  businessAddress?: string;
  companyAdded?: boolean;
};

export type DemoAccount = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  businessName: string;
  abn?: string;
  entityType?: string;
  businessAddress?: string;
  companyAdded?: boolean;
  createdAt: string;
  onboardingComplete?: boolean;
  gstRegistered?: boolean;
  gstAccountingMethod?: GstAccountingMethod;
  financialYearEnd?: string;
  ledgerMode?: LedgerMode;
  hasPaidDownload?: boolean;
  subscriptionStatus?: string;
};

export type DemoSession = {
  accountId: string;
  email: string;
  loggedInAt: string;
};

export type PublicAccount = Omit<DemoAccount, "passwordHash">;

export type AuthResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; error: string };

export type OnboardingInput = {
  gstRegistered: boolean;
  gstAccountingMethod?: GstAccountingMethod;
  financialYearEnd: string;
  ledgerMode: LedgerMode;
  abn?: string;
  businessName?: string;
  entityType?: string;
  businessAddress?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function toPublic(account: DemoAccount): PublicAccount {
  const { passwordHash: _, ...rest } = account;
  return rest;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  return null;
}

export function validateSignup(input: {
  fullName: string;
  email: string;
  password: string;
  businessName?: string;
  abn?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.fullName.trim()) errors.fullName = "Enter your full name.";
  const emailErr = validateEmail(input.email);
  if (emailErr) errors.email = emailErr;
  const pwErr = validatePassword(input.password);
  if (pwErr) errors.password = pwErr;
  const abnErr = validateAbnField(input.abn ?? "", false);
  if (abnErr) errors.abn = abnErr;
  return errors;
}

export async function hashPassword(email: string, password: string): Promise<string> {
  const payload = `${email.trim().toLowerCase()}:${password}:${AUTH_SALT}`;
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function listAccounts(): DemoAccount[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(AUTH_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: DemoAccount[]) {
  localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getSession(): DemoSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

function saveSession(session: DemoSession | null) {
  if (session) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getCurrentAccount(): PublicAccount | null {
  const session = getSession();
  if (!session) return null;
  const account = listAccounts().find(
    (a) => a.id === session.accountId || a.email === session.email.toLowerCase()
  );
  return account ? toPublic(account) : null;
}

/** New sign-ups have onboardingComplete === false. Legacy (field missing) = already onboarded. */
export function needsOnboarding(account: PublicAccount | null | undefined): boolean {
  if (!account) return false;
  return account.onboardingComplete === false;
}

/** True when a new account has not saved a company on the Add company page yet. */
export function needsCompany(account: PublicAccount | null | undefined): boolean {
  if (!account || account.onboardingComplete !== false) return false;
  if (account.companyAdded === true) return false;
  const name = account.businessName?.trim() ?? "";
  return !name || name === PENDING_ORG_NAME;
}

/** Next signed-in destination after signup, login, or saving a company. */
export function nextSetupPath(account: PublicAccount | null | undefined): string {
  if (!account) return "/signup";
  if (needsCompany(account)) return "/add-company";
  if (needsOnboarding(account)) return "/onboarding";
  return "/demo";
}

export function usesSampleData(account: PublicAccount | null | undefined): boolean {
  if (!account) return true; // guests see Harbour & Co sample
  return account.ledgerMode !== "blank";
}

export async function signUp(input: {
  fullName: string;
  email: string;
  password: string;
  businessName?: string;
  abn?: string;
  entityType?: string;
  businessAddress?: string;
}): Promise<AuthResult> {
  if (!isBrowser()) return { ok: false, error: "Sign-up is only available in the browser." };
  const errors = validateSignup(input);
  if (Object.keys(errors).length > 0) return { ok: false, error: Object.values(errors)[0] };
  const email = input.email.trim().toLowerCase();
  const accounts = listAccounts();
  if (accounts.some((a) => a.email === email)) {
    return { ok: false, error: "An account with this email already exists. Try logging in." };
  }
  const passwordHash = await hashPassword(email, input.password);
  const named = input.businessName?.trim() ?? "";
  const account: DemoAccount = {
    id: crypto.randomUUID(),
    fullName: input.fullName.trim(),
    email,
    passwordHash,
    businessName: named || PENDING_ORG_NAME,
    abn: input.abn?.trim() ? formatAbn(input.abn) : undefined,
    entityType: input.entityType?.trim() || undefined,
    businessAddress: input.businessAddress?.trim() || undefined,
    companyAdded: Boolean(named && named !== PENDING_ORG_NAME),
    createdAt: new Date().toISOString(),
    onboardingComplete: false,
  };
  accounts.push(account);
  saveAccounts(accounts);
  saveSession({ accountId: account.id, email: account.email, loggedInAt: new Date().toISOString() });
  return { ok: true, account: toPublic(account) };
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  if (!isBrowser()) return { ok: false, error: "Log-in is only available in the browser." };
  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, error: emailErr };
  if (!password) return { ok: false, error: "Enter your password." };
  const normalised = email.trim().toLowerCase();
  const account = listAccounts().find((a) => a.email === normalised);
  if (!account) return { ok: false, error: "Incorrect email or password." };
  const passwordHash = await hashPassword(normalised, password);
  if (passwordHash !== account.passwordHash) return { ok: false, error: "Incorrect email or password." };
  saveSession({ accountId: account.id, email: account.email, loggedInAt: new Date().toISOString() });
  return { ok: true, account: toPublic(account) };
}

export function logOut() {
  if (!isBrowser()) return;
  saveSession(null);
}

export function completeOnboarding(input: OnboardingInput): AuthResult {
  if (!isBrowser()) return { ok: false, error: "Onboarding is only available in the browser." };
  const session = getSession();
  if (!session) return { ok: false, error: "You need to be signed in." };
  const abnErr = validateAbnField(input.abn ?? "", false);
  if (abnErr) return { ok: false, error: abnErr };
  const accounts = listAccounts();
  const idx = accounts.findIndex(
    (a) => a.id === session.accountId || a.email === session.email.toLowerCase()
  );
  if (idx < 0) return { ok: false, error: "Account not found." };
  const updated: DemoAccount = {
    ...accounts[idx],
    onboardingComplete: true,
    gstRegistered: input.gstRegistered,
    gstAccountingMethod: input.gstRegistered
      ? input.gstAccountingMethod ?? "accruals"
      : undefined,
    financialYearEnd: input.financialYearEnd.trim() || "30 June",
    ledgerMode: input.ledgerMode,
    abn: input.abn?.trim() ? formatAbn(input.abn) : accounts[idx].abn,
    ...(input.businessName?.trim()
      ? { businessName: input.businessName.trim(), companyAdded: true }
      : {}),
    ...(input.entityType !== undefined
      ? { entityType: input.entityType.trim() || undefined }
      : {}),
    ...(input.businessAddress !== undefined
      ? { businessAddress: input.businessAddress.trim() || undefined }
      : {}),
  };
  accounts[idx] = updated;
  saveAccounts(accounts);
  return { ok: true, account: toPublic(updated) };
}

export function skipOnboarding(): AuthResult {
  return completeOnboarding({
    gstRegistered: true,
    gstAccountingMethod: "accruals",
    financialYearEnd: "30 June",
    ledgerMode: "sample",
  });
}

export function updateAccountProfile(patch: ProfilePatch): AuthResult {
  if (!isBrowser()) return { ok: false, error: "Only available in the browser." };
  const session = getSession();
  if (!session) return { ok: false, error: "You need to be signed in." };
  if (patch.abn !== undefined) {
    const abnErr = validateAbnField(patch.abn, false);
    if (abnErr) return { ok: false, error: abnErr };
  }
  const accounts = listAccounts();
  const idx = accounts.findIndex(
    (a) => a.id === session.accountId || a.email === session.email.toLowerCase()
  );
  if (idx < 0) return { ok: false, error: "Account not found." };
  const updated: DemoAccount = {
    ...accounts[idx],
    ...(patch.businessName !== undefined ? { businessName: patch.businessName.trim() } : {}),
    ...(patch.abn !== undefined
      ? { abn: patch.abn.trim() ? formatAbn(patch.abn) : undefined }
      : {}),
    ...(patch.gstRegistered !== undefined ? { gstRegistered: patch.gstRegistered } : {}),
    ...(patch.gstAccountingMethod !== undefined
      ? { gstAccountingMethod: patch.gstAccountingMethod }
      : {}),
    ...(patch.financialYearEnd !== undefined
      ? { financialYearEnd: patch.financialYearEnd }
      : {}),
    ...(patch.entityType !== undefined ? { entityType: patch.entityType.trim() || undefined } : {}),
    ...(patch.businessAddress !== undefined
      ? { businessAddress: patch.businessAddress.trim() || undefined }
      : {}),
    ...(patch.companyAdded !== undefined ? { companyAdded: patch.companyAdded } : {}),
  };
  accounts[idx] = updated;
  saveAccounts(accounts);
  return { ok: true, account: toPublic(updated) };
}

export const DEMO_ORG_LABEL = "This is a demo with sample data — not your real account.";
