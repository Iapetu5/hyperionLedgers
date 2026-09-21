export type BeginCheckoutResult = { kind: "stripe" } | { kind: "path"; path: string };

/** Client-only: open Stripe Checkout, or return an in-app path (signup / error). */
export async function beginHostedCheckout(email?: string): Promise<BeginCheckoutResult> {
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email ? { email } : {}),
    });
    const data = (await res.json()) as { url?: string };
    if (data.url?.startsWith("http://") || data.url?.startsWith("https://")) {
      window.location.assign(data.url);
      return { kind: "stripe" };
    }
    if (data.url?.startsWith("/")) return { kind: "path", path: data.url };
  } catch {
    /* fall through */
  }
  return { kind: "path", path: "/checkout?reason=unconfigured" };
}
