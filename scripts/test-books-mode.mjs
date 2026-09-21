/** Mirrors lib/books-client.ts booksModeFromMe — signed-in server persistence must not use localStorage. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function booksModeFromMe(data) {
  const hasAccount = Boolean(data.account);
  if (data.configured === false || data.persistence === "local") {
    return { mode: "local", hasAccount: false };
  }
  if (data.persistence === "server" || data.configured === true || hasAccount) {
    return { mode: "server", hasAccount };
  }
  return { mode: hasAccount ? "server" : "local", hasAccount };
}

function usesServerBooksUi(persistence, user) {
  if (persistence === "local") return false;
  return Boolean(user);
}

function isServerBooksMode(mode, hasAccount) {
  return mode === "server" && hasAccount;
}

const signedIn = booksModeFromMe({ persistence: "server", account: { id: "u1" } });
if (!isServerBooksMode(signedIn.mode, signedIn.hasAccount)) {
  throw new Error("signed-in server persistence must use API books");
}

const signedOut = booksModeFromMe({ persistence: "server", account: null });
if (isServerBooksMode(signedOut.mode, signedOut.hasAccount)) {
  throw new Error("signed-out guests must not POST /api/books");
}

const local = booksModeFromMe({ persistence: "local", account: null });
if (local.mode !== "local") throw new Error("unconfigured me should be local");

const configuredAccount = booksModeFromMe({ configured: true, account: { id: "u2" } });
if (!isServerBooksMode(configuredAccount.mode, configuredAccount.hasAccount)) {
  throw new Error("configured + account must use server books");
}

if (!usesServerBooksUi("server", { id: "u1" })) throw new Error("server + user is server UI");
if (!usesServerBooksUi("unknown", { id: "u1" })) throw new Error("signed-in unknown must not show browser-local banner");
if (usesServerBooksUi("local", { id: "u1" })) throw new Error("explicit local stays local UI");
if (usesServerBooksUi("unknown", null)) throw new Error("guest unknown is not server UI");
if (usesServerBooksUi("server", null)) throw new Error("signed-out production must not claim organisation books");

function requireList(label, rows) {
  if (!Array.isArray(rows)) throw new Error(`${label} list was incomplete.`);
  return rows;
}

function loadFromPayload(data) {
  if (data && data.error) throw new Error(data.error);
  return requireList("Invoice", data.invoices);
}

try {
  loadFromPayload({ error: "You need to be signed in." });
  throw new Error("failed GET with error must not become an empty list");
} catch (e) {
  if (!(e instanceof Error) || e.message !== "You need to be signed in.") throw e;
}

try {
  loadFromPayload({ configured: true });
  throw new Error("missing invoices array must not become an empty list");
} catch (e) {
  if (!(e instanceof Error) || e.message !== "Invoice list was incomplete.") throw e;
}

const emptyOk = loadFromPayload({ invoices: [] });
if (emptyOk.length !== 0) throw new Error("true empty list should stay empty");

const rows = loadFromPayload({ invoices: [{ id: "INV-U-1" }] });
if (rows[0].id !== "INV-U-1") throw new Error("successful GET must keep rows");

/** Sample stays local even when the signed-in org uses Postgres. Blank + server hits /api/books/banking. */
function bankWriteUsesServer(serverEnabled, mode) {
  return Boolean(serverEnabled) && mode === "blank";
}
if (bankWriteUsesServer(true, "sample")) throw new Error("sample Apply must stay localStorage");
if (!bankWriteUsesServer(true, "blank")) throw new Error("blank signed-in Apply must use API");
if (bankWriteUsesServer(false, "blank")) throw new Error("guest blank Apply stays local");
if (bankWriteUsesServer(false, "sample")) throw new Error("guest sample Apply stays local");

function catOverridesPutStatus(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return 400;
  return null;
}
if (catOverridesPutStatus([]) !== 400) throw new Error("array catOverrides must 400");
if (catOverridesPutStatus(null) !== 400) throw new Error("null catOverrides must 400");
if (catOverridesPutStatus("x") !== 400) throw new Error("string catOverrides must 400");
if (catOverridesPutStatus(undefined) !== null) throw new Error("omitted catOverrides must skip");
if (catOverridesPutStatus({}) !== null) throw new Error("object map catOverrides must be accepted");

function booksApplyWhere(server, blank) {
  if (!blank) return "it stays in this browser demo only";
  return server ? "it saves to your organisation books" : "it stays in this browser";
}
if (booksApplyWhere(true, false) !== "it stays in this browser demo only") {
  throw new Error("sample Apply copy stays demo-local");
}
if (booksApplyWhere(true, true) !== "it saves to your organisation books") {
  throw new Error("signed-in blank Apply copy must name organisation books");
}
if (booksApplyWhere(false, true) !== "it stays in this browser") {
  throw new Error("guest blank Apply copy stays in this browser");
}

function loadBankFromPayload(data) {
  if (data && data.error) throw new Error(data.error);
  if (
    !Array.isArray(data.imports) ||
    data.catOverrides == null ||
    typeof data.catOverrides !== "object" ||
    Array.isArray(data.catOverrides)
  ) {
    throw new Error("Banking payload was incomplete.");
  }
  return { imports: data.imports, catOverrides: data.catOverrides };
}

try {
  loadBankFromPayload({ error: "You need to be signed in." });
  throw new Error("failed banking GET with error must not become empty imports");
} catch (e) {
  if (!(e instanceof Error) || e.message !== "You need to be signed in.") throw e;
}

try {
  loadBankFromPayload({ imports: [], catOverrides: [] });
  throw new Error("array catOverrides must not become an empty map");
} catch (e) {
  if (!(e instanceof Error) || e.message !== "Banking payload was incomplete.") throw e;
}

const emptyBank = loadBankFromPayload({ imports: [], catOverrides: {} });
if (emptyBank.imports.length !== 0) throw new Error("true empty banking GET should stay empty");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const aiAssistant = readFileSync(join(root, "components/demo/AiAssistant.tsx"), "utf8");
if (aiAssistant.includes('from "@/lib/bank-transactions"')) {
  throw new Error("Ask AI must apply categories through books-client, not localStorage helpers");
}
if (!aiAssistant.includes('from "@/lib/books-client"')) {
  throw new Error("Ask AI must import applyCategoryToTransaction from books-client");
}
if (!aiAssistant.includes("mode: blankLedger ? \"blank\" : \"sample\"")) {
  throw new Error("Ask AI apply must pass ledger mode so sample never writes org_bank_data");
}

const bankingRoute = readFileSync(join(root, "app/api/books/banking/route.ts"), "utf8");
if (!bankingRoute.includes("requireBooksDb") || !bankingRoute.includes("booksWriteError")) {
  throw new Error("banking PUT/GET must use books-route helpers");
}
if (!bankingRoute.includes("Array.isArray(body.catOverrides)")) {
  throw new Error("banking PUT must reject array catOverrides");
}

const booksClient = readFileSync(join(root, "lib/books-client.ts"), "utf8");
if (!booksClient.includes("mode !== \"blank\"")) {
  throw new Error("books-client apply/clear must keep sample mode on localStorage");
}
if (booksClient.includes("catch {\n    return null;")) {
  throw new Error("apply/clear must not swallow save failures as null");
}

const copilot = readFileSync(join(root, "lib/ai-copilot.ts"), "utf8");
if (!copilot.includes("loadBankTransactionsBooks(\"blank\")")) {
  throw new Error("blank-ledger Ask AI must load banking from books-client");
}
if (!copilot.includes("export async function getCopilotReply")) {
  throw new Error("getCopilotReply must be async so blank books can load from the API");
}

console.log("books-mode checks passed");

