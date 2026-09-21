"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { TaxDocPrintView } from "@/components/pay/TaxDocPrintView";
import {
  getPublicInvoice,
  getPublicQuote,
  type PublicInvoice,
  type PublicQuote,
} from "@/lib/public-docs";

export function PrintDocButton({
  kind,
  id,
  compact,
}: {
  kind: "invoice" | "quote";
  id: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<PublicInvoice | PublicQuote | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function openPrint() {
    const d = kind === "invoice" ? getPublicInvoice(id) : getPublicQuote(id);
    setDoc(d);
    setOpen(true);
  }

  function doPrint() {
    window.print();
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "btn-secondary !px-2 !py-1 text-xs" : "btn-secondary"}
        onClick={openPrint}
      >
        <Printer size={compact ? 12 : 16} />
        {compact ? "Print" : "Print / PDF"}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 print:static print:inset-auto print:bg-transparent print:p-0">
            <div className="relative my-6 w-full max-w-2xl print:my-0 print:max-w-none">
              <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {kind === "invoice" ? "Tax invoice" : "Quote"} preview
                </p>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary" onClick={doPrint} disabled={!doc}>
                    <Printer size={16} />
                    Print / PDF
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
              </div>
              <div id="tax-doc-print" className="doc-card overflow-hidden p-0 print:rounded-none print:border print:border-slate-300 print:shadow-none">
                {doc ? (
                  <div className="p-6 print:p-0">
                    <TaxDocPrintView doc={doc} />
                  </div>
                ) : (
                  <p className="p-6 text-sm text-slate-600">Document not found.</p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
