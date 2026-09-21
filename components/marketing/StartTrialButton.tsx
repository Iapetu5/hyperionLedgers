"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { beginHostedCheckout } from "@/lib/begin-checkout";
import { SIGNUP_FOR_TRIAL, trialCtaHref } from "@/lib/trial-next";
import { markTrialIntent } from "@/lib/start-trial";

type Props = {
  className?: string;
  children?: React.ReactNode;
  email?: string;
  showArrow?: boolean;
};

function TrialInner({
  children,
  showArrow,
  busy,
}: {
  children: React.ReactNode;
  showArrow: boolean;
  busy?: boolean;
}) {
  return (
    <>
      {busy ? "Starting trial…" : children}
      {showArrow && !busy ? <ArrowRight size={16} /> : null}
    </>
  );
}

/**
 * Signed-out (and unconfirmed) CTAs are a real link to /signup?next=checkout so the
 * destination is in the HTML before hydration. Stripe is only called for a server session.
 */
export function StartTrialButton({
  className = "btn-primary",
  children = "Start free trial",
  email,
  showArrow = true,
}: Props) {
  const router = useRouter();
  const { user, loading, needsOnboarding, persistence } = useAuth();
  const [busy, setBusy] = useState(false);
  const dest = trialCtaHref({
    user,
    persistence: loading ? "unknown" : persistence,
    needsOnboarding,
  });

  async function startHostedTrial() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await beginHostedCheckout(email || user?.email);
      if (result.kind === "stripe") return;
      if (result.path === SIGNUP_FOR_TRIAL) markTrialIntent();
      router.push(result.path);
    } catch {
      router.push("/checkout?reason=unconfigured");
    } finally {
      setBusy(false);
    }
  }

  if (dest !== "checkout") {
    return (
      <Link
        href={dest}
        className={className}
        onClick={() => {
          markTrialIntent();
        }}
      >
        <TrialInner showArrow={showArrow}>{children}</TrialInner>
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => void startHostedTrial()} disabled={busy}>
      <TrialInner showArrow={showArrow} busy={busy}>
        {children}
      </TrialInner>
    </button>
  );
}
