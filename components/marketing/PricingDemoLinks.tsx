"use client";

import Link from "next/link";
import { TryDemoLink, useShowTryDemo } from "@/components/marketing/TryDemoCta";

export function PricingCardDemoLink() {
  return <TryDemoLink className="link-quiet marketing-tap-link justify-center text-center" />;
}

export function PricingFooterDemoLine() {
  const showDemo = useShowTryDemo();
  return (
    <p className="mt-12 text-center text-base leading-7 text-slate-50">
      {showDemo ? (
        <>
          Want to look around first?{" "}
          <TryDemoLink className="font-semibold text-brand-100 underline decoration-brand-200/70 underline-offset-4 hover:decoration-brand-100" />
          {" "}
          with no account, or{" "}
          <Link
            href="/try"
            className="font-semibold text-brand-100 underline decoration-brand-200/70 underline-offset-4 hover:decoration-brand-100"
          >
            see how the trial starts
          </Link>
          .
        </>
      ) : (
        <>
          <Link
            href="/try"
            className="font-semibold text-brand-100 underline decoration-brand-200/70 underline-offset-4 hover:decoration-brand-100"
          >
            See how the trial starts
          </Link>
          .
        </>
      )}
    </p>
  );
}
