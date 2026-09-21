"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { nextSetupPath } from "@/lib/auth";
import { DEMO_CTA } from "@/lib/brand";

/** Pre-buy visitors only: no session, no trial, no paid account. */
export function useShowTryDemo() {
  const { user, loading } = useAuth();
  return !loading && !user;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const show = useShowTryDemo();
  if (!show) return null;
  return <>{children}</>;
}

export function TryDemoLink({
  className,
  children = DEMO_CTA,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const show = useShowTryDemo();
  if (!show) return null;
  return (
    <Link href="/demo" className={className}>
      {children}
    </Link>
  );
}

/** Signed-in path into the user's own org/books — never the guest sample CTA. */
export function GoToAppLink({
  className,
  children = "Open your ledger",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return (
    <Link href={nextSetupPath(user)} className={className}>
      {children}
    </Link>
  );
}
