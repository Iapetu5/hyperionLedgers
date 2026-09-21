"use client";

import Link from "next/link";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { GoToAppLink, TryDemoLink } from "@/components/marketing/TryDemoCta";

/** Trial stays the only button. Demo / signup stay text — do not enlarge buttons. */
export function MarketingPageActions({
  pricingHref = "/pricing",
  pricingLabel = "Pricing",
}: {
  pricingHref?: string;
  pricingLabel?: string;
}) {
  return (
    <div className="marketing-cta-row">
      <StartTrialButton className="btn-marketing-primary" />
      <div className="flex flex-wrap items-center gap-x-5">
        <Link href="/signup" className="link-quiet marketing-tap-link">
          Sign up
        </Link>
        <Link href={pricingHref} className="link-quiet marketing-tap-link">
          {pricingLabel}
        </Link>
        <TryDemoLink className="link-quiet marketing-tap-link" />
        <GoToAppLink className="link-quiet marketing-tap-link" />
      </div>
    </div>
  );
}
