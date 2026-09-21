import { PLAN } from "@/lib/billing";
import { stripeSecret } from "@/lib/stripe";

export const PLAN_AMOUNT_CENTS = PLAN.amountAud * 100;

type StripePrice = {
  id?: string;
  active?: boolean;
  currency?: string;
  unit_amount?: number | null;
  product?: string | { id?: string };
  recurring?: { interval?: string; interval_count?: number } | null;
};

type StripeList<T> = { data?: T[] };
type StripeProduct = { id?: string };

const cacheTtlMs = 10 * 60 * 1000;
let cache: { key: string; id: string; at: number } | null = null;

export function isAudMonthlyPlanPrice(price: StripePrice | null | undefined): boolean {
  if (!price?.id?.startsWith("price_")) return false;
  if (price.active === false) return false;
  if ((price.currency ?? "").toLowerCase() !== "aud") return false;
  if (price.unit_amount !== PLAN_AMOUNT_CENTS) return false;
  if (price.recurring?.interval !== "month") return false;
  return (price.recurring.interval_count ?? 1) === 1;
}

function productIdOf(price: StripePrice | null | undefined): string {
  if (!price?.product) return "";
  return typeof price.product === "string" ? price.product : price.product.id ?? "";
}

async function stripeGet<T>(path: string): Promise<T | null> {
  const secret = stripeSecret();
  if (!/^sk_(test|live)_/.test(secret)) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function stripePost<T>(path: string, params: URLSearchParams): Promise<T | null> {
  const secret = stripeSecret();
  if (!/^sk_(test|live)_/.test(secret)) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function listRecurringPrices(productId?: string): Promise<StripePrice[]> {
  const query = new URLSearchParams({
    active: "true",
    limit: "100",
    type: "recurring",
  });
  if (productId) query.set("product", productId);
  const listed = await stripeGet<StripeList<StripePrice>>(`prices?${query.toString()}`);
  return listed?.data ?? [];
}

async function createAudMonthlyPrice(productId: string): Promise<string | null> {
  const params = new URLSearchParams();
  params.set("product", productId);
  params.set("currency", "aud");
  params.set("unit_amount", String(PLAN_AMOUNT_CENTS));
  params.set("recurring[interval]", "month");
  params.set("recurring[interval_count]", "1");
  const created = await stripePost<StripePrice>("prices", params);
  return created?.id?.startsWith("price_") ? created.id : null;
}

async function ensureProduct(existingProductId: string): Promise<string | null> {
  if (existingProductId.startsWith("prod_")) return existingProductId;
  const params = new URLSearchParams();
  params.set("name", PLAN.name);
  params.set(
    "description",
    `${PLAN.trialDays}-day trial, then $${PLAN.amountAud} ${PLAN.currency} ${PLAN.intervalLabel}.`
  );
  const created = await stripePost<StripeProduct>("products", params);
  return created?.id?.startsWith("prod_") ? created.id : null;
}

/**
 * Prefer the env Price when it is already $69 AUD / month.
 * Otherwise reuse an existing AUD monthly Price, or create one in this Stripe account.
 */
export async function resolveAudMonthlyPriceId(preferredId: string): Promise<string> {
  const preferred = preferredId.trim();
  const now = Date.now();
  if (cache && cache.key === preferred && now - cache.at < cacheTtlMs) return cache.id;

  let resolved = preferred;
  const envPrice = preferred.startsWith("price_")
    ? await stripeGet<StripePrice>(`prices/${encodeURIComponent(preferred)}`)
    : null;

  if (!isAudMonthlyPlanPrice(envPrice)) {
    const productId = productIdOf(envPrice);
    const onProduct = productId ? await listRecurringPrices(productId) : [];
    const match =
      onProduct.find(isAudMonthlyPlanPrice) ??
      (await listRecurringPrices()).find(isAudMonthlyPlanPrice);
    if (match?.id) {
      resolved = match.id;
    } else {
      const product = await ensureProduct(productId);
      const created = product ? await createAudMonthlyPrice(product) : null;
      if (created) resolved = created;
    }
  } else {
    resolved = envPrice!.id!;
  }

  cache = { key: preferred, id: resolved, at: now };
  return resolved;
}
