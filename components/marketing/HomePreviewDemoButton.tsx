"use client";

import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";

export function HomePreviewDemoButton() {
  return (
    <GuestOnly>
      <p className="text-center text-base leading-7 text-slate-50">
        <TryDemoLink className="link-quiet marketing-tap-link" />
        <span className="marketing-note mt-1 block">Demo · sample data — not your real account</span>
      </p>
    </GuestOnly>
  );
}
