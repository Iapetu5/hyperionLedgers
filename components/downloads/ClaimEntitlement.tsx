"use client";

import { useEffect } from "react";

/** Sets the httpOnly entitlement cookie from a Route Handler (RSC cannot). */
export function ClaimEntitlement({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    if (!sessionId) return;
    void fetch("/api/downloads/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
  }, [sessionId]);
  return null;
}
