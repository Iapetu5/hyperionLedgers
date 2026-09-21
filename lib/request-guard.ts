import { getAppUrl } from "@/lib/billing";

type Bucket = { n: number; reset: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 128) : "unknown";
}

/** Returns true if the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now > current.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 4000) {
      buckets.forEach((v, k) => {
        if (now > v.reset) buckets.delete(k);
      });
    }
    return true;
  }
  if (current.n >= limit) return false;
  current.n += 1;
  return true;
}

export function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function checkoutOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(getAppUrl()).origin);
  } catch {
    /* ignore */
  }
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) allowed.add(`https://${vercel}`);
  allowed.add("http://localhost:3000");
  allowed.add("http://127.0.0.1:3000");

  if (origin) {
    return allowed.has(origin);
  }
  const host = req.headers.get("host")?.split(":")[0];
  if (!host) return false;
  return host === "localhost" || host === "127.0.0.1" || Array.from(allowed).some((o) => {
    try {
      return new URL(o).hostname === host;
    } catch {
      return false;
    }
  });
}
