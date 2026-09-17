"use client";

import { Printer } from "lucide-react";

export function PrintableDocActions({ label = "Print / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn-secondary no-print"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      {label}
    </button>
  );
}
