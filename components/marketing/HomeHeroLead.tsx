"use client";

import { GuestOnly } from "@/components/marketing/TryDemoCta";

export function HomeHeroLead() {
  return (
    <p className="marketing-lead">
      HyperionInvoices keeps the books for a small Australian business. Try it free for 14 days.
      Then it is $69 a month. You can stop anytime. After you pay, you can download the Windows app.
      <GuestOnly>
        {" "}
        Or try a demo first — that path uses sample data, not your real account.
      </GuestOnly>
    </p>
  );
}
