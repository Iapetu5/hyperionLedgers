"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileText, Sparkles } from "lucide-react";

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  actions = [],
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  hint?: string;
}) {
  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.22), transparent 65%)",
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-200">
          <Icon size={22} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-300">{description}</p>
          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((a) => {
                const cls = a.primary ? "btn-primary" : "btn-secondary";
                if (a.href) {
                  return (
                    <Link key={a.label} href={a.href} className={cls}>
                      {a.label}
                    </Link>
                  );
                }
                return (
                  <button key={a.label} type="button" className={cls} onClick={a.onClick}>
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
          {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export function BlankLedgerHint() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1.5">
        <Sparkles size={12} className="text-brand-300" />
        Starting empty — create an invoice, quote, or bill when you are ready.
      </span>
    </div>
  );
}
