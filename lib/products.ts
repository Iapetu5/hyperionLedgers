/** Browser-local product catalogue for HyperionInvoices demos (AU / Xero-style tax). */

export type ProductTax = "GST" | "GST-free";

export type Product = {
  id: string;
  name: string;
  /** Optional longer blurb appended into line description when selected */
  description?: string;
  /** Unit price in AUD, tax-exclusive (Xero-style). GST applies only via line tax rate. */
  unitPriceExGst: number;
  /** Maps to Xero "GST on Income/Expenses" vs "GST Free Income/Expenses" on lines */
  tax: ProductTax;
  /** Optional SKU / code */
  code?: string;
};

const USER_KEY = "hl_demo_user_products_v1";

/** Harbour & Co sample catalogue (guest / sample org only). Prices are tax-exclusive. */
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "PRD-101",
    name: "Catalogue photography",
    description: "Half-day product / catalogue shoot with edited selects",
    unitPriceExGst: 1700,
    tax: "GST",
    code: "PHOTO",
  },
  {
    id: "PRD-102",
    name: "Menu redesign",
    description: "Print + digital menu layout and artwork",
    unitPriceExGst: 1200,
    tax: "GST",
    code: "MENU",
  },
  {
    id: "PRD-103",
    name: "Courier fee",
    description: "Metro courier / hand delivery",
    unitPriceExGst: 45,
    tax: "GST",
    code: "COURIER",
  },
  {
    id: "PRD-104",
    name: "Monthly retainer — social & email",
    unitPriceExGst: 500,
    tax: "GST",
    code: "RET-M",
  },
  {
    id: "PRD-105",
    name: "Brand refresh package",
    unitPriceExGst: 3500,
    tax: "GST",
    code: "BRAND",
  },
  {
    id: "PRD-106",
    name: "GST-free export design pack",
    unitPriceExGst: 1100,
    tax: "GST-free",
    code: "EXPORT",
  },
];

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Normalise legacy unitPriceIncGst rows to tax-exclusive. */
function normalizeProduct(raw: Record<string, unknown>): Product | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  const tax: ProductTax = raw.tax === "GST-free" ? "GST-free" : "GST";
  let unitPriceExGst = Number(raw.unitPriceExGst);
  if (!Number.isFinite(unitPriceExGst) || unitPriceExGst <= 0) {
    const legacyInc = Number(raw.unitPriceIncGst);
    if (Number.isFinite(legacyInc) && legacyInc > 0) {
      unitPriceExGst = tax === "GST" ? round2(legacyInc / 1.1) : round2(legacyInc);
    } else {
      return null;
    }
  }
  return {
    id: raw.id,
    name: raw.name,
    description: typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : undefined,
    unitPriceExGst: round2(unitPriceExGst),
    tax,
    code: typeof raw.code === "string" && raw.code.trim() ? raw.code.trim() : undefined,
  };
}

export function loadUserProducts(): Product[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => normalizeProduct(row as Record<string, unknown>))
      .filter((p): p is Product => Boolean(p));
  } catch {
    return [];
  }
}

function saveUserProducts(rows: Product[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("hl-products-updated", { detail: { count: rows.length } }));
}

/** Catalogue for the current org mode: sample list or user-created only. */
export function loadProductsForMode(usesSampleData: boolean): Product[] {
  if (usesSampleData) {
    const user = loadUserProducts();
    const sampleIds = new Set(SAMPLE_PRODUCTS.map((p) => p.id));
    const extras = user.filter((p) => !sampleIds.has(p.id));
    return [...SAMPLE_PRODUCTS, ...extras];
  }
  return loadUserProducts();
}

function nextId(existing: Product[]) {
  let max = 0;
  for (const p of existing) {
    const m = p.id.match(/^PRD-U-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `PRD-U-${String(max + 1).padStart(3, "0")}`;
}

function isSampleProductId(id: string) {
  return id.startsWith("PRD-") && !id.startsWith("PRD-U-");
}

export function createUserProduct(input: {
  name: string;
  unitPriceExGst: number;
  tax?: ProductTax;
  code?: string;
  description?: string;
}): Product | { error: string } {
  const name = input.name.trim();
  if (!name) return { error: "Enter a product name." };
  const price = Number(input.unitPriceExGst);
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Enter a unit price greater than zero (tax exclusive)." };
  }
  if (price > 1_000_000) return { error: "Price is too large for this demo." };
  const tax: ProductTax = input.tax === "GST-free" ? "GST-free" : "GST";
  const existing = loadUserProducts();
  const row: Product = {
    id: nextId(existing),
    name,
    description: (input.description || "").trim() || undefined,
    unitPriceExGst: round2(price),
    tax,
    code: (input.code || "").trim() || undefined,
  };
  saveUserProducts([row, ...existing]);
  return row;
}

export function updateUserProduct(
  id: string,
  input: {
    name: string;
    unitPriceExGst: number;
    tax?: ProductTax;
    code?: string;
    description?: string;
  },
): Product | { error: string } {
  if (isSampleProductId(id)) {
    return { error: "Demo sample products are read-only — add your own instead." };
  }
  const existing = loadUserProducts();
  const idx = existing.findIndex((p) => p.id === id);
  if (idx < 0) return { error: "Product not found." };
  const name = input.name.trim();
  if (!name) return { error: "Enter a product name." };
  const price = Number(input.unitPriceExGst);
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a unit price greater than zero (tax exclusive)." };
  if (price > 1_000_000) return { error: "Price is too large for this demo." };
  const tax: ProductTax = input.tax === "GST-free" ? "GST-free" : "GST";
  const row: Product = {
    ...existing[idx],
    name,
    description: (input.description || "").trim() || undefined,
    unitPriceExGst: round2(price),
    tax,
    code: (input.code || "").trim() || undefined,
  };
  const next = [...existing];
  next[idx] = row;
  saveUserProducts(next);
  return row;
}

export function deleteUserProduct(id: string): boolean {
  if (isSampleProductId(id)) return false;
  const existing = loadUserProducts();
  const next = existing.filter((p) => p.id !== id);
  if (next.length === existing.length) return false;
  saveUserProducts(next);
  return true;
}

/** Line amount (tax exclusive) from product unit price × qty. */
export function lineAmountFromProduct(product: Product, qty: number): number {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return round2(product.unitPriceExGst * q);
}

export function findProduct(products: Product[], id: string | undefined | null): Product | undefined {
  if (!id) return undefined;
  return products.find((p) => p.id === id);
}

/** Description filled into a line when a product is picked. */
export function lineDescriptionFromProduct(product: Product): string {
  if (product.description?.trim()) return `${product.name} — ${product.description.trim()}`;
  return product.name;
}

export function isSampleProduct(id: string): boolean {
  return isSampleProductId(id);
}

/** Xero AU labels for product / line tax. */
export function xeroTaxLabel(tax: ProductTax, scope: "income" | "expense" = "income"): string {
  if (tax === "GST-free") {
    return scope === "expense" ? "GST Free Expenses" : "GST Free Income";
  }
  return scope === "expense" ? "GST on Expenses" : "GST on Income";
}

/** Shared catalogue search haystack (name, description, code, id). */
export function productSearchHaystack(p: Product): string {
  return `${p.name} ${p.description || ""} ${p.code || ""} ${p.id}`.toLowerCase();
}

/** True when product matches a free-text query (empty query matches all).
 *  Tokens (whitespace-split) all must appear in the haystack — order-independent.
 *  A single contiguous phrase still works via the full-string check first.
 */
export function productMatchesQuery(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = productSearchHaystack(p);
  if (hay.includes(q)) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return false;
  return tokens.every((t) => hay.includes(t));
}

/** Filter catalogue by text + optional tax — shared by Products page and line typeahead. */
export function filterProducts(
  products: Product[],
  query: string,
  opts?: { tax?: ProductTax | "all"; limit?: number },
): Product[] {
  const tax = opts?.tax ?? "all";
  let out = products.filter((p) => {
    if (tax !== "all" && p.tax !== tax) return false;
    return productMatchesQuery(p, query);
  });
  if (opts?.limit != null && opts.limit >= 0) out = out.slice(0, opts.limit);
  return out;
}


/** Where a blank-catalogue "add a product" detour should return. */
export type CatalogueReturnKind = "invoice" | "quote" | "bill";

const CATALOGUE_RETURN: Record<
  CatalogueReturnKind,
  { path: string; noun: string; returnLabel: string }
> = {
  invoice: { path: "/demo/invoices", noun: "invoice", returnLabel: "Return to invoice" },
  quote: { path: "/demo/quotes", noun: "quote", returnLabel: "Return to quote" },
  bill: { path: "/demo/bills", noun: "bill", returnLabel: "Return to bill" },
};

export function parseCatalogueReturn(value: string | null | undefined): CatalogueReturnKind | null {
  if (value === "invoice" || value === "quote" || value === "bill") return value;
  return null;
}

export function catalogueReturnFromPath(pathname: string): CatalogueReturnKind | null {
  if (pathname === "/demo/invoices" || pathname.startsWith("/demo/invoices/")) return "invoice";
  if (pathname === "/demo/quotes" || pathname.startsWith("/demo/quotes/")) return "quote";
  if (pathname === "/demo/bills" || pathname.startsWith("/demo/bills/")) return "bill";
  return null;
}

/** Product form, scrolled to the name/price/tax fields, remembering which document to reopen. */
export function productsAddHref(kind: CatalogueReturnKind | null): string {
  return kind ? `/demo/products?from=${kind}#product-form` : "/demo/products#product-form";
}

export function catalogueReturnComposeHref(kind: CatalogueReturnKind): string {
  return `${CATALOGUE_RETURN[kind].path}?compose=1`;
}

export function catalogueReturnMeta(kind: CatalogueReturnKind) {
  return CATALOGUE_RETURN[kind];
}
