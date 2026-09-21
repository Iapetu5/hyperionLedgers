/** Remember that Start free trial should open Stripe only after signup + company. */

export const TRIAL_INTENT_KEY = "hl_start_trial_v1";

export function markTrialIntent() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRIAL_INTENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasTrialIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(TRIAL_INTENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearTrialIntent() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TRIAL_INTENT_KEY);
  } catch {
    /* ignore */
  }
}

export async function beginHostedCheckout(email?: string): Promise<{ url: string } | { error: string }> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(email ? { email } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    configured?: boolean;
    message?: string;
  };
  if (data.url) return { url: data.url };
  return { error: data.message || "Checkout could not start." };
}

/** After signup/company/onboarding: open Stripe only once the org exists. */
export async function continueTrialCheckout(email?: string): Promise<string | null> {
  if (!hasTrialIntent()) return null;
  const result = await beginHostedCheckout(email);
  if ("url" in result && result.url.startsWith("http")) {
    clearTrialIntent();
    window.location.assign(result.url);
    return result.url;
  }
  if ("url" in result && result.url.startsWith("/")) {
    clearTrialIntent();
    return result.url;
  }
  return "/checkout?reason=unconfigured";
}
