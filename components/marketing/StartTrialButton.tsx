"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { beginHostedCheckout } from "@/lib/begin-checkout";
import { SIGNUP_FOR_TRIAL } from "@/lib/trial-next";

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
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  async function startTrial() {
    if (loading || busy) return;
    if (!user) {
      router.push(SIGNUP_FOR_TRIAL);
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
