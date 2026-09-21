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
  if (persistence === "server") return true;
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

console.log("books-mode checks passed");

