import { needsCompany, nextSetupPath, type PublicAccount } from "@/lib/auth";

/** Query flag: send signed-out trial clicks through signup/login, then Checkout. */
export const TRIAL_CHECKOUT_NEXT = "checkout";
export const SIGNUP_FOR_TRIAL = `/signup?next=${TRIAL_CHECKOUT_NEXT}`;
export const LOGIN_FOR_TRIAL = `/login?next=${TRIAL_CHECKOUT_NEXT}`;

export function wantsTrialCheckout(next: string | null | undefined): boolean {
  const value = (next ?? "").trim().toLowerCase();
  return value === TRIAL_CHECKOUT_NEXT || value === "trial" || value === "/checkout";
}

export type TrialPersistence = "server" | "local" | "unknown";

/**
 * Stripe Checkout is only for a confirmed server session with company + setup done.
 * Everyone else — including leftover browser-local demo accounts — goes through signup.
 */
export function trialCtaHref(input: {
  user: PublicAccount | null;
  persistence: TrialPersistence;
  needsOnboarding: boolean;
}): string | "checkout" {
  if (input.persistence !== "server" || !input.user) return SIGNUP_FOR_TRIAL;
  if (needsCompany(input.user) || input.needsOnboarding) return nextSetupPath(input.user);
  return "checkout";
}
