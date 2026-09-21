import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";
import { cookieSecure } from "@/lib/request-guard";
import type { GstAccountingMethod, LedgerMode, OnboardingInput, ProfilePatch, PublicAccount } from "@/lib/auth";
import { formatAbn, validateAbnField } from "@/lib/abn";
import { PENDING_ORG_NAME, validateLogin, validateSignup } from "@/lib/auth";

const scrypt = promisify(scryptCb);
export const SESSION_COOKIE = "hl_session";
const SESSION_DAYS = 30;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
};

type OrgRow = {
  id: string;
  user_id: string;
  name: string;
  abn: string | null;
  gst_registered: boolean | null;
  gst_accounting_method: string | null;
  financial_year_end: string | null;
  ledger_mode: string | null;
  onboarding_complete: boolean;
  created_at: string;
  has_paid_download?: boolean | null;
  subscription_status?: string | null;
  entity_type?: string | null;
  address?: string | null;
  company_added?: boolean | null;
};

function sessionSecret(): string | null {
  const value = process.env.SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return value || null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function encodeCookie(token: string): string {
  const secret = sessionSecret();
  if (!secret) return token;
  const sig = createHmac("sha256", secret).update(token).digest("hex");
  return `${token}.${sig}`;
}

function decodeCookie(value: string | undefined): string | null {
  if (!value) return null;
  const secret = sessionSecret();
  if (!secret) return value.includes(".") ? value.split(".")[0] : value;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const token = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(token).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 32)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), 32)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function toPublic(user: UserRow, org: OrgRow): PublicAccount {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    businessName: org.name,
    abn: org.abn || undefined,
    entityType: org.entity_type || undefined,
    businessAddress: org.address || undefined,
    companyAdded: org.company_added ?? undefined,
    createdAt: new Date(user.created_at).toISOString(),
    onboardingComplete: org.onboarding_complete,
    gstRegistered: org.gst_registered ?? undefined,
    gstAccountingMethod: (org.gst_accounting_method as GstAccountingMethod | null) ?? undefined,
    financialYearEnd: org.financial_year_end ?? undefined,
    ledgerMode: (org.ledger_mode as LedgerMode | null) ?? undefined,
    hasPaidDownload: Boolean(org.has_paid_download),
    subscriptionStatus: org.subscription_status ?? undefined,
  };
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, encodeCookie(token), {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function loadOrg(userId: string): Promise<OrgRow | null> {
  const rows = (await db()`
    SELECT * FROM organisations WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
  `) as OrgRow[];
  return rows[0] ?? null;
}

/** Signed-in org row + public account — used by server-backed books APIs. */
export async function getSessionOrg(): Promise<{ orgId: string; account: PublicAccount } | null> {
  const account = await getSessionAccount();
  if (!account) return null;
  const org = await loadOrg(account.id);
  if (!org) return null;
  return { orgId: org.id, account };
}

export async function getSessionAccount(): Promise<PublicAccount | null> {
  if (!isDbConfigured()) return null;
  await ensureSchema();
  const token = decodeCookie(cookies().get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = (await db()`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > now()
    LIMIT 1
  `) as UserRow[];
  const user = rows[0];
  if (!user) return null;
  const org = await loadOrg(user.id);
  if (!org) return null;
  return toPublic(user, org);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const id = crypto.randomUUID();
  await db()`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (${id}, ${userId}, ${hashToken(token)}, now() + interval '30 days')
  `;
  setSessionCookie(token);
}

export async function destroySession(): Promise<void> {
  if (!isDbConfigured()) {
    clearSessionCookie();
    return;
  }
  await ensureSchema();
  const token = decodeCookie(cookies().get(SESSION_COOKIE)?.value);
  if (token) {
    const tokenHash = hashToken(token);
    await db()`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
  }
  clearSessionCookie();
}

export async function signUpServer(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  await ensureSchema();
  const errors = validateSignup(input);
  if (Object.keys(errors).length > 0) return { ok: false, error: Object.values(errors)[0] };
  const email = input.email.trim().toLowerCase();
  const existing = (await db()`SELECT id FROM users WHERE email = ${email} LIMIT 1`) as { id: string }[];
  if (existing[0]) return { ok: false, error: "An account with this email already exists. Try logging in." };
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);
  await db()`
    INSERT INTO users (id, email, password_hash, full_name)
    VALUES (${userId}, ${email}, ${passwordHash}, ${input.fullName.trim()})
  `;
  await db()`
    INSERT INTO organisations (id, user_id, name, abn, onboarding_complete, ledger_mode, company_added)
    VALUES (${orgId}, ${userId}, ${PENDING_ORG_NAME}, ${null}, false, 'blank', ${false})
  `;
  await createSession(userId);
  const account = await getSessionAccount();
  if (!account) return { ok: false, error: "Account was created but the session did not start." };
  return { ok: true, account };
}

export async function logInServer(
  email: string,
  password: string
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  await ensureSchema();
  const fieldErrors = validateLogin(email, password);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: Object.values(fieldErrors)[0] };
  }
  const normalised = email.trim().toLowerCase();
  const rows = (await db()`SELECT * FROM users WHERE email = ${normalised} LIMIT 1`) as UserRow[];
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { ok: false, error: "Incorrect email or password." };
  }
  await createSession(user.id);
  const account = await getSessionAccount();
  if (!account) return { ok: false, error: "Logged in but the session did not start." };
  return { ok: true, account };
}

export async function completeOnboardingServer(
  input: OnboardingInput
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  await ensureSchema();
  const account = await getSessionAccount();
  if (!account) return { ok: false, error: "You need to be signed in." };
  const abnErr = validateAbnField(input.abn ?? "", false);
  if (abnErr) return { ok: false, error: abnErr };
  const abn = input.abn?.trim() ? formatAbn(input.abn) : account.abn ?? null;
  const fyEnd = (input.financialYearEnd ?? "30 June").trim() || "30 June";
  const name = input.businessName?.trim() || account.businessName;
  const companyAdded = Boolean(name && name !== PENDING_ORG_NAME);
  const entityType =
    input.entityType !== undefined ? input.entityType.trim() || null : account.entityType ?? null;
  const address =
    input.businessAddress !== undefined
      ? input.businessAddress.trim() || null
      : account.businessAddress ?? null;
  await db()`
    UPDATE organisations
    SET
      onboarding_complete = true,
      gst_registered = ${input.gstRegistered},
      gst_accounting_method = ${input.gstRegistered ? input.gstAccountingMethod ?? "accruals" : null},
      financial_year_end = ${fyEnd},
      ledger_mode = ${input.ledgerMode},
      abn = ${abn},
      name = ${name},
      entity_type = ${entityType},
      address = ${address},
      company_added = ${companyAdded}
    WHERE user_id = ${account.id}
  `;
  const next = await getSessionAccount();
  if (!next) return { ok: false, error: "Could not save setup." };
  return { ok: true, account: next };
}

export async function updateProfileServer(
  patch: ProfilePatch
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  await ensureSchema();
  const account = await getSessionAccount();
  if (!account) return { ok: false, error: "You need to be signed in." };
  if (patch.abn !== undefined) {
    const abnErr = validateAbnField(patch.abn, false);
    if (abnErr) return { ok: false, error: abnErr };
  }
  const name = patch.businessName !== undefined ? patch.businessName.trim() : account.businessName;
  const abn =
    patch.abn !== undefined ? (patch.abn.trim() ? formatAbn(patch.abn) : null) : account.abn ?? null;
  const gstRegistered = patch.gstRegistered ?? account.gstRegistered ?? null;
  const gstMethod = patch.gstAccountingMethod ?? account.gstAccountingMethod ?? null;
  const fy = patch.financialYearEnd ?? account.financialYearEnd ?? null;
  const entityType =
    patch.entityType !== undefined ? patch.entityType.trim() || null : account.entityType ?? null;
  const address =
    patch.businessAddress !== undefined
      ? patch.businessAddress.trim() || null
      : account.businessAddress ?? null;
  const companyAdded = patch.companyAdded ?? account.companyAdded ?? false;
  await db()`
    UPDATE organisations
    SET
      name = ${name},
      abn = ${abn},
      gst_registered = ${gstRegistered},
      gst_accounting_method = ${gstMethod},
      financial_year_end = ${fy},
      entity_type = ${entityType},
      address = ${address},
      company_added = ${companyAdded}
    WHERE user_id = ${account.id}
  `;
  const next = await getSessionAccount();
  if (!next) return { ok: false, error: "Could not save profile." };
  return { ok: true, account: next };
}
