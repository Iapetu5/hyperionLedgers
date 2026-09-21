"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileText, Sparkles } from "lucide-react";
import { ExploreSampleButton, useExploreHarbourSample } from "@/components/demo/ExploreSampleButton";
import { useShowTryDemo } from "@/components/marketing/TryDemoCta";
import { DEMO_CTA } from "@/lib/brand";
const SAMPLE_CTA = DEMO_CTA;

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

function looksLikeCreate(a: EmptyStateAction) {
  return /^create\b/i.test(a.label.trim());
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  actions = [],
  hint,
  showExploreSample = false,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  hint?: string;
  /** Adds the guest demo as a secondary path — never steals primary from create CTAs. */
  showExploreSample?: boolean;
}) {
  const explore = useExploreHarbourSample();
  const showDemoCta = useShowTryDemo() && showExploreSample;
  const hasExplicitPrimary = actions.some((a) => a.primary);

  const mergedActions: EmptyStateAction[] = (() => {
    if (!showDemoCta) return actions;
    if (actions.length === 0) {
      return [
        {
          label: SAMPLE_CTA,
          primary: true,
          onClick: explore,
        },
      ];
    }
    const mapped = actions.map((a) => ({ ...a, primary: !!a.primary }));
    if (!hasExplicitPrimary) {
      const createIdx = mapped.findIndex(looksLikeCreate);
      if (createIdx >= 0) mapped[createIdx].primary = true;
    }
    return [
      ...mapped,
      {
        label: SAMPLE_CTA,
        primary: false,
        onClick: explore,
      },
    ];
  })();

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
          {mergedActions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {mergedActions.map((a) => {
                const cls = a.primary ? "btn-primary" : "btn-secondary";
                const isExplore = a.label === SAMPLE_CTA;
                if (a.href) {
                  return (
                    <Link key={a.label} href={a.href} className={cls}>
                      {a.label}
                    </Link>
                  );
                }
                return (
                  <button key={a.label} type="button" className={cls} onClick={a.onClick}>
                    {isExplore ? <Sparkles size={16} /> : null}
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
  const showDemo = useShowTryDemo();
  if (!showDemo) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1.5">
        <Sparkles size={12} className="text-brand-300" />
        Starting empty — Try a demo as a guest anytime.
      </span>
      <ExploreSampleButton primary={false} className="!px-2.5 !py-1 text-xs" />
    </div>
  );
}
