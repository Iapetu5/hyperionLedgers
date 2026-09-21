"use client";

import { useEffect, useState } from "react";
import type { PlatformStatus } from "@/lib/platform-labels";

const DEFAULT: PlatformStatus = {
  abrLive: false,
  windowsInstallerReady: false,
  stripeConfigured: false,
};

export function usePlatformStatus(): PlatformStatus {
  const [status, setStatus] = useState<PlatformStatus>(DEFAULT);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/platform/status", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((data: PlatformStatus) => {
        setStatus({
          abrLive: Boolean(data.abrLive),
          windowsInstallerReady: Boolean(data.windowsInstallerReady),
          stripeConfigured: Boolean(data.stripeConfigured),
        });
      })
      .catch(() => {
        // Keep demo-safe defaults when status is unavailable.
      });
    return () => controller.abort();
  }, []);

  return status;
}
