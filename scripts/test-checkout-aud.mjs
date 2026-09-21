/** Mirrors lib/stripe-checkout.ts applyAudLineItems — Checkout must default to AUD $69. */

function applyAudLineItems(params, price) {
  const currency = (price?.currency || "").toLowerCase();
  if (price?.id && currency === "aud") {
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
if (applyAudLineItems(aud, { id: "price_aud69", currency: "aud", unit_amount: 6900 }) !== "price") {
  throw new Error("AUD Price should be used as-is");
}
if (aud.get("line_items[0][price]") !== "price_aud69") throw new Error("missing AUD price id");

const usd = new URLSearchParams();
if (applyAudLineItems(usd, { id: "price_usd", currency: "usd", unit_amount: 5111 }) !== "price_data") {
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

console.log("checkout-aud checks passed");
