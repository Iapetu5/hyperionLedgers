"use client";

import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";

export function HomePreviewDemoButton() {
  return (
    <GuestOnly>
      <p className="text-center text-base leading-7 text-slate-50">
        <TryDemoLink className="link-quiet" />
        <span className="mt-1 block text-sm text-slate-200">Demo · sample data — not your real account</span>
      </p>
    </GuestOnly>
  );
}
