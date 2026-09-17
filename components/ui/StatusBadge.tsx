/** Dark-glass friendly status chips (readable on nebula tables and doc headers). */
const styles: Record<string, string> = {
  Paid: "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/30",
  Accepted: "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/30",
  "Awaiting payment": "bg-amber-500/20 text-amber-100 ring-1 ring-inset ring-amber-400/30",
  Sent: "bg-sky-500/20 text-sky-200 ring-1 ring-inset ring-sky-400/30",
  Overdue: "bg-rose-500/25 text-rose-200 ring-1 ring-inset ring-rose-400/35",
  Expired: "bg-rose-500/25 text-rose-200 ring-1 ring-inset ring-rose-400/35",
  Draft: "bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15",
  Declined: "bg-slate-500/25 text-slate-300 ring-1 ring-inset ring-slate-400/25",
  Approved: "bg-sky-500/20 text-sky-200 ring-1 ring-inset ring-sky-400/30",
  "Awaiting approval": "bg-amber-500/20 text-amber-100 ring-1 ring-inset ring-amber-400/30",
};

/** Stronger chips for nebula doc-header (dark gradient) — intentional on the brand strip. */
const headerStyles: Record<string, string> = {
  Paid: "bg-emerald-400/25 text-emerald-50 ring-1 ring-inset ring-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]",
  Accepted: "bg-emerald-400/25 text-emerald-50 ring-1 ring-inset ring-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]",
  "Awaiting payment": "bg-amber-400/25 text-amber-50 ring-1 ring-inset ring-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.22)]",
  Sent: "bg-cyan-400/25 text-cyan-50 ring-1 ring-inset ring-cyan-300/50 shadow-[0_0_12px_rgba(34,211,238,0.22)]",
  Overdue: "bg-rose-400/30 text-rose-50 ring-1 ring-inset ring-rose-300/55 shadow-[0_0_12px_rgba(251,113,133,0.28)]",
  Expired: "bg-rose-400/30 text-rose-50 ring-1 ring-inset ring-rose-300/55 shadow-[0_0_12px_rgba(251,113,133,0.28)]",
  Draft: "bg-white/15 text-white ring-1 ring-inset ring-white/30",
  Declined: "bg-slate-400/25 text-slate-100 ring-1 ring-inset ring-slate-300/40",
  Approved: "bg-cyan-400/25 text-cyan-50 ring-1 ring-inset ring-cyan-300/50 shadow-[0_0_12px_rgba(34,211,238,0.22)]",
  "Awaiting approval": "bg-amber-400/25 text-amber-50 ring-1 ring-inset ring-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.22)]",
};

export function StatusBadge({
  status,
  tone = "default",
}: {
  status: string;
  /** Use on nebula doc headers so the chip reads as part of the brand strip */
  tone?: "default" | "header";
}) {
  const map = tone === "header" ? headerStyles : styles;
  const fallback =
    tone === "header"
      ? "bg-white/15 text-white ring-1 ring-inset ring-cyan-300/40 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
      : "bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
        map[status] ?? fallback
      }`}
    >
      {status}
    </span>
  );
}
