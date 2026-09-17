"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/demo/EmptyState";
import { ExploreSampleButton } from "@/components/demo/ExploreSampleButton";
import { formatAUD } from "@/lib/format";
import {
  SAMPLE_PRODUCTS,
  createUserProduct,
  deleteUserProduct,
  filterProducts,
  loadProductsForMode,
  loadUserProducts,
  updateUserProduct,
  xeroTaxLabel,
  type Product,
  type ProductTax,
} from "@/lib/products";

function isSampleId(id: string) {
  return id.startsWith("PRD-") && !id.startsWith("PRD-U-");
}

export default function ProductsPage() {
  const { usesSampleData } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  /** Avoid SSR/first-paint flash of “no match” before local catalogue loads */
  const [catalogueReady, setCatalogueReady] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tax, setTax] = useState<ProductTax>("GST");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [taxFilter, setTaxFilter] = useState<"all" | ProductTax>("all");

  const reload = useCallback(() => {
    setRows(loadProductsForMode(usesSampleData));
    setCatalogueReady(true);
  }, [usesSampleData]);

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener("hl-products-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("hl-products-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reload]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setTax("GST");
    setCode("");
    setEditingId(null);
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const unitPriceExGst = Number(price);
    if (editingId) {
      const res = updateUserProduct(editingId, { name, description, unitPriceExGst, tax, code });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      resetForm();
      setOk(`Updated ${res.name}.`);
      reload();
      return;
    }
    const res = createUserProduct({ name, description, unitPriceExGst, tax, code });
    if ("error" in res) {
      setError(res.error);
      return;
    }
    resetForm();
    setOk(`Added ${res.name} — pick it on an invoice, quote, or bill line (qty × price fills the amount).`);
    reload();
  }

  function onEdit(p: Product) {
    if (isSampleId(p.id)) {
      setError("Harbour sample products are read-only — add your own product instead.");
      setOk(null);
      return;
    }
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || "");
    setPrice(String(p.unitPriceExGst));
    setTax(p.tax);
    setCode(p.code || "");
    setError(null);
    setOk(`Editing ${p.id}`);
    document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onDelete(id: string) {
    if (!deleteUserProduct(id)) {
      setError("Could not delete that product (sample rows stay in Harbour demo).");
      return;
    }
    if (editingId === id) resetForm();
    setOk("Product removed.");
    reload();
  }

  const userOnly = useMemo(() => loadUserProducts(), [rows]);
  const blankEmpty = !usesSampleData && catalogueReady && rows.length === 0;

  useEffect(() => {
    if (!blankEmpty) return;
    const el = document.getElementById("prd-name") as HTMLInputElement | null;
    // Soft focus for first-product path — don't steal focus mid-edit
    if (el && !name && !editingId) {
      const t = window.setTimeout(() => el.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [blankEmpty, name, editingId]);

  const filtered = useMemo(
    () => filterProducts(rows, query, { tax: taxFilter }),
    [rows, query, taxFilter],
  );

  const showCatalogueTools = rows.length >= 4;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <p className="text-sm text-white/70">
          {usesSampleData
            ? "Harbour & Co sample catalogue below — add your own products for the line-item dropdown. Unit prices are tax-exclusive; line tax uses Xero-style GST on Income / GST Free Income."
            : blankEmpty
              ? "Your blank org has an empty catalogue — add a first product below, then pick it on invoice, quote, or bill lines (qty × price fills the amount)."
              : "Blank ledger catalogue — add products here, then pick them on invoice/quote/bill lines (qty × price fills the amount). Prices are tax-exclusive."}
        </p>
      </div>

      <form id="product-form" className="card scroll-mt-4 space-y-4 p-5" onSubmit={onSubmit}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-white">
            {editingId ? `Edit ${editingId}` : blankEmpty ? "Add your first product" : "Add product"}
          </h2>
          <span className="text-xs text-slate-400">AU demo · unit price tax-exclusive · Tax maps to GST on Income / GST Free Income · browser only</span>
        </div>
        {blankEmpty && (
          <div className="flex items-start gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-cyan-200" />
            <span>
              Name + unit price (ex tax) is enough. After you save, open{" "}
              <Link href="/demo/invoices" className="font-semibold text-white underline-offset-2 hover:underline">
                Invoices
              </Link>{" "}
              and pick the product from the line dropdown — quantity multiplies the price automatically.
            </span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="prd-name">
              Name
            </label>
            <input
              id="prd-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Catalogue photography"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="prd-desc">
              Description <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="prd-desc"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Half-day shoot with edited selects"
            />
          </div>
          <div>
            <label className="label" htmlFor="prd-price">
              Unit price <span className="font-semibold text-cyan-200/90">(ex tax)</span>
            </label>
            <input
              id="prd-price"
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="550.00"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Enter the tax-exclusive amount. Line GST is applied separately (GST on Income / GST Free Income).
            </p>
          </div>
          <div>
            <label className="label" htmlFor="prd-tax">
              Tax
            </label>
            <select
              id="prd-tax"
              className="input"
              value={tax}
              onChange={(e) => setTax(e.target.value as ProductTax)}
            >
              <option value="GST">GST on Income (10%)</option>
              <option value="GST-free">GST Free Income</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="prd-code">
              Code (optional)
            </label>
            <input
              id="prd-code"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BRAND"
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {ok && <p className="text-sm text-emerald-300">{ok}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            {editingId ? (
              <>
                <Pencil size={16} />
                Save product
              </>
            ) : (
              <>
                <Plus size={16} />
                Add product
              </>
            )}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                resetForm();
                setOk(null);
              }}
            >
              <X size={16} />
              Cancel
            </button>
          )}
          <Link href="/demo/invoices" className="btn-secondary">
            Create invoice
          </Link>
          <Link href="/demo/quotes" className="btn-secondary">
            Create quote
          </Link>
        </div>
      </form>

      {!catalogueReady ? (
        <div className="card px-4 py-8 text-center text-sm text-slate-400">Loading catalogue…</div>
      ) : blankEmpty ? (
        <div className="space-y-3">
          <EmptyState
            icon={Package}
            title="Catalogue is empty"
            description="Use the form above for your first product. Once saved, it appears in invoice, quote, and bill line pickers — no Harbour sample catalogue is mixed into this blank org."
            actions={[
              {
                label: "Focus add form",
                primary: true,
                onClick: () => {
                  document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  (document.getElementById("prd-name") as HTMLInputElement | null)?.focus();
                },
              },
              { label: "Create invoice", href: "/demo/invoices" },
              { label: "Back to overview", href: "/demo" },
            ]}
            hint="Tip: keep unit prices tax-exclusive — line tax (GST on Income / GST Free Income) is chosen on the document."
          />
          <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-400">
            <span>Want sample figures instead?</span>
            <ExploreSampleButton primary={false} className="!px-2.5 !py-1 text-xs" label="Open Harbour & Co as guest" />
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <div className="space-y-3 border-b border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-white">Catalogue</h2>
                <p className="text-xs text-slate-400">
                  {usesSampleData ? (
                    <>
                      {SAMPLE_PRODUCTS.length} Harbour sample
                      {userOnly.length ? ` · ${userOnly.length} you added` : ""} · used by
                      invoice/quote/bill line dropdowns
                    </>
                  ) : (
                    <>
                      {rows.length} product{rows.length === 1 ? "" : "s"} · prices shown{" "}
                      <span className="font-semibold text-slate-300">ex tax</span>
                    </>
                  )}
                </p>
              </div>
              <p className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-100">
                Unit prices are ex tax
              </p>
            </div>
            {showCatalogueTools && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    className="input !py-1.5 !pl-8 text-sm"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, code, description — any word order…"
                    aria-label="Search products"
                  />
                </div>
                <select
                  className="input !w-auto !py-1.5 text-sm"
                  value={taxFilter}
                  onChange={(e) => setTaxFilter(e.target.value as "all" | ProductTax)}
                  aria-label="Filter by tax"
                >
                  <option value="all">All tax types</option>
                  <option value="GST">GST on Income</option>
                  <option value="GST-free">GST Free Income</option>
                </select>
                {(query || taxFilter !== "all") && (
                  <button
                    type="button"
                    className="btn-secondary !px-2.5 !py-1.5 text-xs"
                    onClick={() => {
                      setQuery("");
                      setTaxFilter("all");
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {showCatalogueTools && (query || taxFilter !== "all") && (
              <p className="text-xs text-slate-400">
                Showing {filtered.length} of {rows.length}
                {filtered.length === 0 ? " — try a different search or tax filter." : ""}
              </p>
            )}
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">
                  Unit price
                  <span className="ml-1 font-normal normal-case tracking-normal text-cyan-200/80">
                    (ex tax)
                  </span>
                </th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    {rows.length === 0
                      ? "No products in this catalogue yet."
                      : "No products match this search — try clearing filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3 font-medium">
                      {p.name}
                      {p.description ? (
                        <div className="text-xs text-slate-400">{p.description}</div>
                      ) : (
                        <div className="text-xs text-slate-500">{p.id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.code || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="tabular-nums">{formatAUD(p.unitPriceExGst)}</span>
                      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        ex tax
                      </span>
                    </td>
                    <td className="px-4 py-3">{xeroTaxLabel(p.tax)}</td>
                    <td className="px-4 py-3">
                      {isSampleId(p.id) ? (
                        <span className="text-xs text-slate-500">Sample (read-only)</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary !px-2 !py-1 text-xs"
                            onClick={() => onEdit(p)}
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-secondary !px-2 !py-1 text-xs"
                            onClick={() => onDelete(p.id)}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
