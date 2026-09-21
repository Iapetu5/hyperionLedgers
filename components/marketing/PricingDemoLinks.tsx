"use client";

import Link from "next/link";
import { TryDemoLink, useShowTryDemo } from "@/components/marketing/TryDemoCta";

export function PricingCardDemoLink() {
  return <TryDemoLink className="link-quiet text-center" />;
}

export function PricingFooterDemoLine() {
  const showDemo = useShowTryDemo();
  return (
    <p className="mt-10 text-center text-base text-slate-100">
      {showDemo ? (
        <>
          Want to look around first?{" "}
          <TryDemoLink className="font-semibold text-brand-200 hover:underline" />
          {" "}
          with no account, or{" "}
          <Link href="/try" className="font-semibold text-brand-200 hover:underline">
            see how the trial starts
          </Link>
          .
        </>
      ) : (
        <>
          <Link href="/try" className="font-semibold text-brand-200 hover:underline">
            See how the trial starts
          </Link>
          .
        </>
      )}
    </p>
  );
}
