"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { needsCompany, nextSetupPath } from "@/lib/auth";
import { beginHostedCheckout } from "@/lib/begin-checkout";
import { SIGNUP_FOR_TRIAL } from "@/lib/trial-next";
import { markTrialIntent } from "@/lib/start-trial";

type Props = {
  className?: string;
  children?: React.ReactNode;
  email?: string;
  showArrow?: boolean;
};

export function StartTrialButton({
  className = "btn-primary",
  children = "Start free trial",
  email,
  showArrow = true,
}: Props) {
  const router = useRouter();
  const { user, loading, needsOnboarding } = useAuth();
  const [busy, setBusy] = useState(false);

  async function startTrial() {
    if (loading || busy) return;
    if (!user) {
      markTrialIntent();
      router.push(SIGNUP_FOR_TRIAL);
      return;
    }
    if (needsCompany(user) || needsOnboarding) {
      markTrialIntent();
      router.push(nextSetupPath(user));
      return;
    }
    setBusy(true);
    try {
      const result = await beginHostedCheckout(email || user.email);
      if (result.kind === "stripe") return;
      router.push(result.path);
    } catch {
      router.push("/checkout?reason=unconfigured");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} onClick={startTrial} disabled={busy || loading}>
      {busy ? "Starting trial…" : children}
      {showArrow && !busy ? <ArrowRight size={16} /> : null}
    </button>
  );
}
