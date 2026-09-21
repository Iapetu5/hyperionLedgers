"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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
  const [busy, setBusy] = useState(false);

  async function startTrial() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = (await res.json()) as {
        url?: string;
        configured?: boolean;
        message?: string;
      };
      if (data.url?.startsWith("http")) {
        window.location.assign(data.url);
        return;
      }
      if (data.url?.startsWith("/")) {
        router.push(data.url);
        return;
      }
      router.push("/checkout?reason=unconfigured");
    } catch {
      router.push("/checkout?reason=unconfigured");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} onClick={startTrial} disabled={busy}>
      {busy ? "Starting trial…" : children}
      {showArrow && !busy ? <ArrowRight size={16} /> : null}
    </button>
  );
}
