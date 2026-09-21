/** Mirrors lib/books-client.ts booksModeFromMe — signed-in server persistence must not use localStorage. */

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

console.log("books-mode checks passed");

