/** Query flag: send signed-out trial clicks through signup/login, then Checkout. */
export const TRIAL_CHECKOUT_NEXT = "checkout";
export const SIGNUP_FOR_TRIAL = `/signup?next=${TRIAL_CHECKOUT_NEXT}`;
export const LOGIN_FOR_TRIAL = `/login?next=${TRIAL_CHECKOUT_NEXT}`;

export function wantsTrialCheckout(next: string | null | undefined): boolean {
  const value = (next ?? "").trim().toLowerCase();
  return value === TRIAL_CHECKOUT_NEXT || value === "trial" || value === "/checkout";
}
