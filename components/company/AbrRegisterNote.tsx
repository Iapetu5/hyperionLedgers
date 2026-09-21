"use client";

import { abrRegisterLabel } from "@/lib/platform-labels";
import { usePlatformStatus } from "@/components/platform/usePlatformStatus";

type Props = {
  /** When the search hook already knows simulated vs live, prefer that for the active search UI. */
  searchSimulated?: boolean;
  className?: string;
};

/** Honest label for ABR lookup source — never claims live when on the demo register. */
export function AbrRegisterNote({ searchSimulated, className = "text-xs text-slate-400" }: Props) {
  const { abrLive } = usePlatformStatus();
  const live = searchSimulated === undefined ? abrLive : !searchSimulated;

  return (
    <p className={className}>
      Company search uses the{" "}
      <span className="font-medium text-slate-300">{abrRegisterLabel(live)}</span>
      {live
        ? ". Matches come from abr.business.gov.au when lookup succeeds."
        : ". Set ABR_GUID on the server for live lookup; until then you can still enter your real ABN below."}
    </p>
  );
}
