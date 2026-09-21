"use client";

import { GuestOnly } from "@/components/marketing/TryDemoCta";
import { usePlatformStatus } from "@/components/platform/usePlatformStatus";
import { windowsDownloadLabel } from "@/lib/platform-labels";

export function HomeHeroLead() {
  const { windowsInstallerReady } = usePlatformStatus();

  return (
    <p className="marketing-lead">
      HyperionInvoices keeps the books for a small Australian business. Try it free for 14 days.
      Then it is $69 a month. You can stop anytime. {windowsDownloadLabel(windowsInstallerReady)}
      <GuestOnly>
        {" "}
        Or try a demo first — that path uses sample data, not your real account.
      </GuestOnly>
    </p>
  );
}
