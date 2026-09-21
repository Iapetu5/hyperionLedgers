"use client";

import Link from "next/link";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { GoToAppLink, TryDemoLink } from "@/components/marketing/TryDemoCta";

export function HomeHeroActions() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
      <StartTrialButton className="btn-marketing-primary" />
      <Link href="/signup" className="link-quiet">
        Sign up
      </Link>
      <Link href="/pricing" className="link-quiet">
        Pricing
      </Link>
      <TryDemoLink className="link-quiet" />
      <GoToAppLink className="link-quiet" />
    </div>
  );
}
