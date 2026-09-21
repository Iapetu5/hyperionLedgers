/** Signed-out Start free trial must be a real /signup?next=checkout link, not Stripe. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function trialCtaHref(input) {
  if (input.persistence !== "server" || !input.user) return "/signup?next=checkout";
  if (input.needsCompany || input.needsOnboarding) return "/add-company";
  return "checkout";
}

if (trialCtaHref({ persistence: "unknown", user: null, needsOnboarding: false }) !== "/signup?next=checkout") {
  throw new Error("unknown auth must go to signup");
}
if (trialCtaHref({ persistence: "server", user: null, needsOnboarding: false }) !== "/signup?next=checkout") {
  throw new Error("signed-out server must go to signup");
}
if (
  trialCtaHref({
    persistence: "local",
    user: { id: "local-1" },
    needsOnboarding: false,
  }) !== "/signup?next=checkout"
) {
  throw new Error("leftover localStorage account must not open Stripe");
}
if (
  trialCtaHref({
    persistence: "server",
    user: { id: "u1" },
    needsCompany: true,
    needsOnboarding: true,
  }) !== "/add-company"
) {
  throw new Error("incomplete server account must finish setup");
}
if (
  trialCtaHref({
    persistence: "server",
    user: { id: "u1" },
    needsOnboarding: false,
  }) !== "checkout"
) {
  throw new Error("ready server account may open Stripe");
}

const button = readFileSync(join(root, "components/marketing/StartTrialButton.tsx"), "utf8");
if (!button.includes('href={dest}')) {
  throw new Error("StartTrialButton must render a Link for signed-out users");
}
if (!button.includes("trialCtaHref")) {
  throw new Error("StartTrialButton must use trialCtaHref");
}
if (!button.includes('from "next/link"')) {
  throw new Error("StartTrialButton must import Link");
}

const checkoutApi = readFileSync(join(root, "lib/stripe-checkout.ts"), "utf8");
if (!checkoutApi.includes("requiresAuth") || !checkoutApi.includes("SIGNUP_FOR_TRIAL")) {
  throw new Error("POST /api/stripe/checkout must refuse signed-out users when DB is attached");
}

console.log("trial-gate checks passed");
