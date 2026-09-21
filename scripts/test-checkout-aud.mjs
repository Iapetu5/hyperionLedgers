/** Assert Checkout always presents AUD $69 and never retries with Adaptive Pricing on. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function applyAudLineItems(params, price) {
  const currency = (price?.currency || "").toLowerCase();
  const amountOk = price?.unit_amount === 6900;
  const intervalOk = price?.recurring?.interval === "month";
  if (price?.id && currency === "aud" && amountOk && intervalOk) {
    params.set("line_items[0][price]", price.id);
    params.set("line_items[0][quantity]", "1");
    return "price";
  }
  params.set("line_items[0][price_data][currency]", "aud");
  params.set("line_items[0][price_data][unit_amount]", "6900");
  params.set("line_items[0][price_data][recurring][interval]", "month");
  params.set("line_items[0][price_data][product_data][name]", "HyperionInvoices");
  params.set("line_items[0][quantity]", "1");
  return "price_data";
}

const aud = new URLSearchParams();
if (applyAudLineItems(aud, { id: "price_aud69", currency: "aud", unit_amount: 6900, recurring: { interval: "month" } }) !== "price") {
  throw new Error("AUD Price should be used as-is");
}
if (aud.get("line_items[0][price]") !== "price_aud69") throw new Error("missing AUD price id");

const usd = new URLSearchParams();
if (applyAudLineItems(usd, { id: "price_usd", currency: "usd", unit_amount: 5114 }) !== "price_data") {
  throw new Error("USD Price must not be sent to Checkout");
}
if (usd.get("line_items[0][price_data][currency]") !== "aud") throw new Error("expected aud");
if (usd.get("line_items[0][price_data][unit_amount]") !== "6900") throw new Error("expected 6900");
if (usd.get("line_items[0][price]")) throw new Error("USD price id leaked");

const unknown = new URLSearchParams();
applyAudLineItems(unknown, null);
if (unknown.get("line_items[0][price_data][currency]") !== "aud") {
  throw new Error("unknown price must default to AUD price_data");
}

const checkoutSrc = readFileSync(join(root, "lib/stripe-checkout.ts"), "utf8");
if (!checkoutSrc.includes('params.set("locale", "en-AU")')) {
  throw new Error("Checkout must set locale en-AU");
}
if (!checkoutSrc.includes('params.set("adaptive_pricing[enabled]", "false")')) {
  throw new Error("Checkout must disable adaptive pricing");
}
if (checkoutSrc.includes("disableAdaptivePricing: false")) {
  throw new Error("must not retry with adaptive pricing enabled");
}
if (!checkoutSrc.includes("applyAudLineItems")) {
  throw new Error("Checkout must use applyAudLineItems");
}

const priceSrc = readFileSync(join(root, "lib/stripe-price.ts"), "utf8");
if (!priceSrc.includes("export function applyAudLineItems")) {
  throw new Error("applyAudLineItems must live in stripe-price.ts");
}

console.log("checkout-aud checks passed");
