/** Mirrors lib/books-client.ts booksModeFromMe — signed-in server persistence must not use localStorage. */

function booksModeFromMe(data) {
  const hasAccount = Boolean(data.account);
  if (data.persistence === "server") return { mode: "server", hasAccount };
  if (data.persistence === "local") return { mode: "local", hasAccount: false };
  return { mode: hasAccount ? "server" : "local", hasAccount };
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

console.log("books-mode checks passed");
