"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronsUpDown, Package, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatAUD } from "@/lib/format";
import {
  catalogueReturnFromPath,
  filterProducts,
  findProduct,
  lineAmountFromProduct,
  lineDescriptionFromProduct,
  loadProductsForMode,
  productsAddHref,
  xeroTaxLabel,
  type Product,
  type ProductTax,
} from "@/lib/products";
import {
  lineGstFromEx,
  type LineTaxRate,
  type UserDocLineInput,
} from "@/lib/user-docs";

export type LineDraft = {
  key: string;
  description: string;
  qty: string;
  /** Tax-exclusive unit price — drives amount when qty changes */
  unitPriceEx: string;
  /** Tax-exclusive line amount (qty × unit price) */
  amountEx: string;
  taxRate: LineTaxRate;
  /** When set, amount auto-fills from catalogue price × qty */
  productId?: string;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function amountFromUnitQty(unit: number, qty: number): number {
  if (!Number.isFinite(unit) || unit <= 0) return 0;
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return round2(unit * qty);
}

export function emptyLineDraft(partial?: Partial<LineDraft>): LineDraft {
  return {
    key: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    qty: "1",
    unitPriceEx: "",
    amountEx: "",
    taxRate: "GST",
    productId: undefined,
    ...partial,
  };
}

/** Debounce Strict Mode / double-click / soft-nav ?mixed=1 on the same path (cross-page still allowed). */
let mixedOneClickLockUntil = 0;
let mixedOneClickLockPath = "";
export function tryBeginMixedOneClick(cooldownMs = 1400): boolean {
  const now = Date.now();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (now < mixedOneClickLockUntil && path === mixedOneClickLockPath) return false;
  mixedOneClickLockUntil = now + cooldownMs;
  mixedOneClickLockPath = path;
  return true;
}

/**
 * Reopen the create form when returning from Products (`?compose=1`).
 * The query is stripped on a short timer so React Strict Mode's double effect still sees it.
 */
export function useComposeQuery(open: () => void) {
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") !== "1" || params.get("mixed") === "1") return;
    openRef.current();
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(window.location.search);
      if (nextParams.get("compose") !== "1") return;
      nextParams.delete("compose");
      const qs = nextParams.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
      );
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);
}

/** Gentle two-line starter: one GST + one GST Free (tax-exclusive amounts). */
export function mixedTaxStarterDrafts(scope: "income" | "expense" = "income"): LineDraft[] {
  if (scope === "expense") {
    return [
      emptyLineDraft({
        description: "Taxable supplies",
        qty: "1",
        unitPriceEx: "500",
        amountEx: "500",
        taxRate: "GST",
      }),
      emptyLineDraft({
        description: "GST-free supplier line",
        qty: "1",
        unitPriceEx: "165",
        amountEx: "165",
        taxRate: "GST-free",
      }),
    ];
  }
  return [
    emptyLineDraft({
      description: "Design services",
      qty: "1",
      unitPriceEx: "500",
      amountEx: "500",
      taxRate: "GST",
    }),
    emptyLineDraft({
      description: "GST-free export pack",
      qty: "1",
      unitPriceEx: "200",
      amountEx: "200",
      taxRate: "GST-free",
    }),
  ];
}

export function draftsToInputs(drafts: LineDraft[]): UserDocLineInput[] {
  return drafts.map((d) => ({
    description: d.description,
    qty: Number(d.qty),
    amountExGst: Number(d.amountEx),
    taxRate: d.taxRate,
    ...(d.productId ? { productId: d.productId } : {}),
  }));
}

/** Rebuild editor drafts from stored tax-exclusive line items. */
export function lineItemsToDrafts(
  items:
    | {
        description: string;
        qty: number;
        amount: number;
        unitPrice?: number;
        taxRate?: LineTaxRate;
        productId?: string;
      }[]
    | undefined,
): LineDraft[] {
  if (!items?.length) return [emptyLineDraft()];
  return items.map((item) => {
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
    const amount = Number.isFinite(item.amount) && item.amount > 0 ? item.amount : 0;
    let unit =
      Number.isFinite(item.unitPrice) && (item.unitPrice as number) > 0
        ? (item.unitPrice as number)
        : amount > 0
          ? round2(amount / qty)
          : 0;
    return emptyLineDraft({
      description: item.description,
      qty: String(qty),
      unitPriceEx: unit > 0 ? String(unit) : "",
      amountEx: amount > 0 ? String(amount) : "",
      taxRate: item.taxRate === "GST-free" ? "GST-free" : "GST",
      productId: item.productId || undefined,
    });
  });
}

export function lineDraftsSubtotal(drafts: LineDraft[]): number {
  return drafts.reduce((sum, d) => {
    const n = Number(d.amountEx);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export function lineDraftsGst(drafts: LineDraft[]): number {
  return drafts.reduce((sum, d) => {
    const n = Number(d.amountEx);
    if (!Number.isFinite(n) || n <= 0) return sum;
    return sum + lineGstFromEx(n, d.taxRate);
  }, 0);
}

export function lineDraftsTotal(drafts: LineDraft[]): number {
  return Math.round((lineDraftsSubtotal(drafts) + lineDraftsGst(drafts)) * 100) / 100;
}

function productTaxToLine(tax: ProductTax): LineTaxRate {
  return tax === "GST-free" ? "GST-free" : "GST";
}

/** Typeahead once the catalogue is large enough that a plain select is hard to scan. */
const TYPEAHEAD_MIN = 5;

/** Advance to the next field in this line. Enter must never submit the parent form. */
function focusNextLineField(from: HTMLElement) {
  const root = from.closest("[data-line-card]");
  if (!root) return;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("input, select, textarea")).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.tabIndex < 0) return false;
    const type = (el as HTMLInputElement).type;
    return type !== "hidden" && type !== "checkbox" && type !== "radio";
  });
  const idx = nodes.indexOf(from);
  const next = idx >= 0 ? nodes[idx + 1] : undefined;
  next?.focus();
}

function onLineFieldKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  focusNextLineField(e.currentTarget);
}

function ProductTypeahead({
  id,
  products,
  value,
  taxScope,
  onPick,
}: {
  id: string;
  products: Product[];
  value?: string;
  taxScope: "income" | "expense";
  onPick: (productId: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** 0 = Custom line; 1..n = filtered products */
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = findProduct(products, value);

  const filtered = useMemo(
    () => filterProducts(products, query, { limit: 40 }),
    [products, query],
  );

  /** Options: custom clear + filtered products */
  const optionCount = 1 + filtered.length;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [open, query]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, optionCount - 1)));
  }, [optionCount]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-opt-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filtered]);

  function pick(productId: string) {
    onPick(productId);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery("");
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, optionCount - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery("");
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Home" && open) {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End" && open) {
      e.preventDefault();
      setActiveIndex(Math.max(0, optionCount - 1));
      return;
    }
    if (e.key === "Enter") {
      // Always swallow Enter. When the list is closed, implicit form submit
      // would create the document and resetForm() — wiping the page.
      e.preventDefault();
      if (!open || e.nativeEvent.isComposing) {
        if (!e.nativeEvent.isComposing) focusNextLineField(e.currentTarget);
        return;
      }
      if (activeIndex === 0) {
        pick("");
        return;
      }
      const p = filtered[activeIndex - 1];
      if (p) pick(p.id);
      return;
    }
  }

  const activeDesc =
    open && optionCount > 0 ? `${listId}-opt-${activeIndex}` : undefined;

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex gap-1">
        <div className="relative min-w-0 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            ref={inputRef}
            id={id}
            className="input !py-2 !pl-8 !pr-8"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeDesc}
            autoComplete="off"
            value={open ? query : selected ? selected.name : ""}
            placeholder={selected ? selected.name : "Search products…"}
            onFocus={() => {
              setOpen(true);
              setQuery("");
              setActiveIndex(0);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Toggle product list"
            tabIndex={-1}
            onClick={() => {
              const willOpen = !open;
              setOpen(willOpen);
              if (willOpen) {
                setQuery("");
                setActiveIndex(0);
                // Keep focus on the combobox so Arrow/Enter still work after toggle.
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
          >
            <ChevronsUpDown size={14} />
          </button>
        </div>
        {selected && (
          <button
            type="button"
            className="btn-secondary !px-2 !py-2 text-xs"
            title="Switch to custom line"
            aria-label="Clear product"
            onClick={() => pick("")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          ref={listRef}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/15 bg-slate-950/95 p-1 shadow-xl shadow-black/40 backdrop-blur-xl"
        >
          <button
            type="button"
            id={`${listId}-opt-0`}
            data-opt-index={0}
            role="option"
            aria-selected={activeIndex === 0}
            className={`flex w-full items-start rounded-md px-2.5 py-2 text-left text-sm ${
              activeIndex === 0 ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10"
            }`}
            onMouseEnter={() => setActiveIndex(0)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("")}
          >
            <span className="font-medium">Custom line…</span>
            <span className="ml-auto text-[11px] text-slate-500">type your own</span>
          </button>
          {filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-slate-500">No products match “{query.trim()}”.</p>
          ) : (
            filtered.map((p, i) => {
              const idx = i + 1;
              const isActive = activeIndex === idx;
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`${listId}-opt-${idx}`}
                  data-opt-index={idx}
                  role="option"
                  aria-selected={isSelected || isActive}
                  className={`flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left text-sm ${
                    isActive
                      ? "bg-brand-500/25 text-brand-50"
                      : isSelected
                        ? "bg-brand-500/15 text-brand-100 hover:bg-white/10"
                        : "text-slate-100 hover:bg-white/10"
                  }`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p.id)}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[11px] text-slate-400">
                    {formatAUD(p.unitPriceExGst)} ex tax · {xeroTaxLabel(p.tax, taxScope)}
                    {p.code ? ` · ${p.code}` : ""}
                  </span>
                </button>
              );
            })
          )}
          {products.length > filtered.length && query.trim() && (
            <p className="border-t border-white/10 px-2.5 py-1.5 text-[11px] text-slate-500">
              Showing {filtered.length} of {products.length} — refine search to narrow further.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LineItemsEditor({
  lines,
  onChange,
  idPrefix = "li",
  /** income → GST on Income / GST Free Income; expense → GST on Expenses / GST Free Expenses */
  taxScope = "income",
  amountHint = "Amount (ex tax)",
}: {
  lines: LineDraft[];
  onChange: (next: LineDraft[]) => void;
  idPrefix?: string;
  taxScope?: "income" | "expense";
  amountHint?: string;
}) {
  const { usesSampleData } = useAuth();
  const pathname = usePathname() || "";
  const addProductHref = productsAddHref(catalogueReturnFromPath(pathname));
  const [products, setProducts] = useState<Product[]>([]);
  /** Avoid SSR/hydration flash of the empty-catalogue CTA before client load. */
  const [catalogueReady, setCatalogueReady] = useState(false);

  const reloadProducts = useCallback(() => {
    setProducts(loadProductsForMode(usesSampleData));
    setCatalogueReady(true);
  }, [usesSampleData]);

  useEffect(() => {
    reloadProducts();
    const onUpdate = () => reloadProducts();
    window.addEventListener("hl-products-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("hl-products-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reloadProducts]);

  // Drop productId when the catalogue no longer has that row (deleted product / mode switch)
  // so Edit doesn't show "Custom" while still persisting a stale id on save.
  useEffect(() => {
    if (!catalogueReady) return;
    let changed = false;
    const next = lines.map((l) => {
      if (l.productId && !findProduct(products, l.productId)) {
        changed = true;
        return { ...l, productId: undefined };
      }
      return l;
    });
    if (changed) onChange(next);
  }, [catalogueReady, products, lines, onChange]);

  function update(key: string, patch: Partial<LineDraft>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function applyProduct(key: string, productId: string) {
    if (!productId) {
      update(key, { productId: undefined });
      return;
    }
    const product = findProduct(products, productId);
    if (!product) return;
    const line = lines.find((l) => l.key === key);
    const qty = line?.qty && Number(line.qty) > 0 ? line.qty : "1";
    const amount = lineAmountFromProduct(product, Number(qty));
    update(key, {
      productId: product.id,
      description: lineDescriptionFromProduct(product),
      qty,
      unitPriceEx: String(product.unitPriceExGst),
      amountEx: amount > 0 ? String(amount) : "",
      taxRate: productTaxToLine(product.tax),
    });
  }

  function changeQty(key: string, qty: string) {
    const line = lines.find((l) => l.key === key);
    if (!line) return;
    const product = findProduct(products, line.productId);
    if (product) {
      const amount = lineAmountFromProduct(product, Number(qty));
      update(key, {
        qty,
        unitPriceEx: String(product.unitPriceExGst),
        amountEx: amount > 0 ? String(amount) : "",
        description: lineDescriptionFromProduct(product),
        taxRate: productTaxToLine(product.tax),
      });
      return;
    }
    // Custom line: keep unit price, auto-total amount (qty × unit)
    const unit = Number(line.unitPriceEx);
    if (Number.isFinite(unit) && unit > 0) {
      const amount = amountFromUnitQty(unit, Number(qty));
      update(key, {
        qty,
        amountEx: amount > 0 ? String(amount) : "",
      });
      return;
    }
    // No unit yet — if amount already set at qty 1, derive unit then scale
    const prevQty = Number(line.qty);
    const prevAmt = Number(line.amountEx);
    if (
      Number.isFinite(prevAmt) &&
      prevAmt > 0 &&
      Number.isFinite(prevQty) &&
      prevQty > 0 &&
      Number.isFinite(Number(qty)) &&
      Number(qty) > 0
    ) {
      const unitDerived = round2(prevAmt / prevQty);
      const amount = amountFromUnitQty(unitDerived, Number(qty));
      update(key, {
        qty,
        unitPriceEx: String(unitDerived),
        amountEx: amount > 0 ? String(amount) : "",
      });
      return;
    }
    update(key, { qty });
  }

  function changeUnitPrice(key: string, unitPriceEx: string) {
    const line = lines.find((l) => l.key === key);
    if (!line) return;
    const qty = Number(line.qty);
    const unit = Number(unitPriceEx);
    const amount = amountFromUnitQty(unit, qty);
    update(key, {
      unitPriceEx,
      amountEx: amount > 0 ? String(amount) : unitPriceEx === "" ? "" : line.amountEx,
      productId: undefined,
    });
  }

  function changeAmountEx(key: string, amountEx: string) {
    const line = lines.find((l) => l.key === key);
    if (!line) return;
    const qty = Number(line.qty);
    const amount = Number(amountEx);
    let unitPriceEx = line.unitPriceEx;
    if (Number.isFinite(amount) && amount > 0 && Number.isFinite(qty) && qty > 0) {
      unitPriceEx = String(round2(amount / qty));
    } else if (amountEx === "") {
      // Keep unit so qty can still drive a future total
    }
    update(key, {
      amountEx,
      unitPriceEx,
      productId: undefined,
    });
  }

  function addLine() {
    onChange([...lines, emptyLineDraft()]);
  }

  function removeLine(key: string) {
    if (lines.length <= 1) {
      onChange([emptyLineDraft()]);
      return;
    }
    onChange(lines.filter((l) => l.key !== key));
  }

  const subtotal = lineDraftsSubtotal(lines);
  const gst = lineDraftsGst(lines);
  const total = lineDraftsTotal(lines);
  const fromProduct = (line: LineDraft) => Boolean(line.productId && findProduct(products, line.productId));

  const gstLabel = taxScope === "expense" ? "GST on Expenses" : "GST on Income";
  const freeLabel = taxScope === "expense" ? "GST Free Expenses" : "GST Free Income";
  const catalogueEmpty = catalogueReady && products.length === 0;
  const addTaxHint = taxScope === "expense" ? "GST on Expenses or GST Free Expenses" : "GST on Income or GST Free";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Line items</p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={catalogueEmpty ? addProductHref : "/demo/products"}
            target={catalogueEmpty ? undefined : "_blank"}
            rel={catalogueEmpty ? undefined : "noopener noreferrer"}
            title={
              catalogueEmpty
                ? "Add one product, then return to this form and pick it"
                : "Opens in a new tab — keeps this form open"
            }
            className="btn-secondary !px-2.5 !py-1 text-xs"
          >
            <Package size={12} />
            {catalogueEmpty ? "Add a product" : "Products"}
          </Link>
          <button type="button" className="btn-secondary !px-2.5 !py-1 text-xs" onClick={addLine}>
            <Plus size={12} />
            Add line
          </button>
        </div>
      </div>

      {catalogueEmpty && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-cyan-400/30 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-50">
          <span>
            Catalogue is empty, so there is nothing to pick yet. Add one product — name, price (ex tax), and {addTaxHint} — then return here and select it. Quantity fills the line amount. GST is added only on taxable lines.
          </span>
          <Link href={addProductHref} className="btn-primary !px-2.5 !py-1 text-xs shrink-0">
            <Package size={12} />
            Add a product
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {lines.map((line, idx) => {
          const locked = fromProduct(line);
          const showProductPicker = products.length > 0;
          const showAddProduct = catalogueEmpty;
          const productField = showProductPicker ? (
              <div className="min-w-0">
                <label className="label" htmlFor={`${idPrefix}-prod-${idx}`}>
                  Product{lines.length > 1 ? ` ${idx + 1}` : ""}
                  {products.length >= TYPEAHEAD_MIN ? (
                    <span className="ml-1 font-normal normal-case tracking-normal text-slate-500">
                      · type to filter
                    </span>
                  ) : null}
                </label>
                {products.length >= TYPEAHEAD_MIN ? (
                  <ProductTypeahead
                    id={`${idPrefix}-prod-${idx}`}
                    products={products}
                    value={line.productId}
                    taxScope={taxScope}
                    onPick={(productId) => applyProduct(line.key, productId)}
                  />
                ) : (
                  <select
                    id={`${idPrefix}-prod-${idx}`}
                    className="input"
                    value={
                      line.productId && findProduct(products, line.productId) ? line.productId : ""
                    }
                    onKeyDown={onLineFieldKeyDown}
                    onChange={(e) => applyProduct(line.key, e.target.value)}
                  >
                    <option value="">Custom line…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatAUD(p.unitPriceExGst)} · {xeroTaxLabel(p.tax, taxScope)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
          ) : null;
          const addProductField = (
              <div className="min-w-0">
                <label className="label" htmlFor={`${idPrefix}-add-${idx}`}>
                  Product{lines.length > 1 ? ` ${idx + 1}` : ""}
                </label>
                <Link
                  id={`${idPrefix}-add-${idx}`}
                  href={addProductHref}
                  className="flex min-h-[2.5rem] w-full items-center justify-between gap-2 rounded-lg border border-dashed border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-left text-sm text-cyan-50 transition hover:border-cyan-300/60 hover:bg-cyan-500/15"
                >
                  <span className="truncate">Add a product, then pick it here</span>
                  <Plus size={14} className="shrink-0 text-cyan-200" />
                </Link>
              </div>
          );
          const descriptionField = (
              <div className="min-w-0">
                <label className="label" htmlFor={`${idPrefix}-desc-${idx}`}>
                  Description
                </label>
                <input
                  id={`${idPrefix}-desc-${idx}`}
                  className="input"
                  value={line.description}
                  onChange={(e) =>
                    update(line.key, { description: e.target.value, productId: undefined })
                  }
                  onKeyDown={onLineFieldKeyDown}
                  placeholder={taxScope === "expense" ? "Supplier line…" : "Description…"}
                  readOnly={locked}
                  title={locked ? "Tied to product — switch to Custom to edit" : undefined}
                />
              </div>
          );
          const qtyField = (
              <div>
                <label className="label" htmlFor={`${idPrefix}-qty-${idx}`}>
                  Qty
                </label>
                <input
                  id={`${idPrefix}-qty-${idx}`}
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.qty}
                  onChange={(e) => changeQty(line.key, e.target.value)}
                  onKeyDown={onLineFieldKeyDown}
                />
              </div>
          );
          const unitField = (
              <div>
                <label className="label" htmlFor={`${idPrefix}-unit-${idx}`}>
                  Unit (ex tax)
                </label>
                <input
                  id={`${idPrefix}-unit-${idx}`}
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.unitPriceEx}
                  onChange={(e) => changeUnitPrice(line.key, e.target.value)}
                  onKeyDown={onLineFieldKeyDown}
                  placeholder=""
                  readOnly={locked}
                  title={
                    locked
                      ? "From product — switch to Custom to override"
                      : "Qty × unit fills the line amount"
                  }
                />
              </div>
          );
          const amountField = (
              <div>
                <label className="label" htmlFor={`${idPrefix}-amt-${idx}`}>
                  {amountHint}
                </label>
                <input
                  id={`${idPrefix}-amt-${idx}`}
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.amountEx}
                  onChange={(e) => changeAmountEx(line.key, e.target.value)}
                  onKeyDown={onLineFieldKeyDown}
                  placeholder=""
                  readOnly={locked}
                  title={locked ? "Auto from product × qty — switch to Custom to override" : "Edits unit = amount ÷ qty"}
                />
              </div>
          );
          const taxField = (
              <div className="min-w-0">
                <label className="label" htmlFor={`${idPrefix}-tax-${idx}`}>
                  Tax rate
                </label>
                <select
                  id={`${idPrefix}-tax-${idx}`}
                  className="input !pr-8 text-xs sm:text-sm"
                  title={
                    locked
                      ? "Tied to product — switch to Custom to change tax"
                      : line.taxRate === "GST-free"
                        ? freeLabel
                        : `${gstLabel} (10%)`
                  }
                  value={line.taxRate}
                  disabled={locked}
                  onKeyDown={onLineFieldKeyDown}
                  onChange={(e) =>
                    update(line.key, {
                      taxRate: e.target.value === "GST-free" ? "GST-free" : "GST",
                      productId: undefined,
                    })
                  }
                >
                  <option value="GST">{gstLabel} (10%)</option>
                  <option value="GST-free">{freeLabel}</option>
                </select>
              </div>
          );
          const removeBtn = (
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-2 text-xs"
                  onClick={() => removeLine(line.key)}
                  title={lines.length <= 1 ? "Clear line" : "Remove line"}
                  aria-label={lines.length <= 1 ? "Clear line" : "Remove line"}
                >
                  <Trash2 size={14} />
                </button>
              </div>
          );
          return (
            <div
              key={line.key}
              data-line-card=""
              className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3"
            >
              {/* Product picker + description on their own row so mid-width chrome does not crush placeholders */}
              {showProductPicker || showAddProduct ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                  {showProductPicker ? productField : addProductField}
                  {descriptionField}
                </div>
              ) : null}
              <div
                className={
                  showProductPicker || showAddProduct
                    ? "grid grid-cols-1 gap-2 sm:grid-cols-[4.5rem_7rem_7.5rem_minmax(10rem,1fr)_auto]"
                    : "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.3fr)_4.5rem_7rem_7.5rem_minmax(10rem,1fr)_auto]"
                }
              >
                {showProductPicker || showAddProduct ? null : descriptionField}
                {qtyField}
                {unitField}
                {amountField}
                {taxField}
                {removeBtn}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ml-auto max-w-xs space-y-1 text-sm text-slate-300">
        <div className="flex justify-between">
          <span>Subtotal (ex tax)</span>
          <span className="text-white">{formatAUD(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST</span>
          <span className="text-white">{formatAUD(gst)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
          <span>Total</span>
          <span>{formatAUD(total)}</span>
        </div>
      </div>

      {subtotal <= 0 && (
        <p className="ml-auto max-w-xs text-[11px] text-slate-500">
          Totals stay $0 until you enter a unit price or line amount (qty × unit auto-totals).
        </p>
      )}
    </div>
  );
}
