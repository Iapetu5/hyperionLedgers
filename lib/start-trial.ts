import { beginHostedCheckout } from "@/lib/begin-checkout";

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

export function trialCheckoutOpened(url: string | null | undefined): boolean {
  return url === "stripe" || Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

/** After signup/company/onboarding: open Stripe only once the org exists. */
export async function continueTrialCheckout(email?: string): Promise<string | null> {
  if (!hasTrialIntent()) return null;
  const result = await beginHostedCheckout(email);
  if (result.kind === "stripe") {
    clearTrialIntent();
    return "stripe";
  }
  clearTrialIntent();
  return result.path;
}
