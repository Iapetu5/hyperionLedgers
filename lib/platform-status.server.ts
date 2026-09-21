import { existsSync } from "fs";
import path from "path";
import { isLiveAbrConfigured } from "@/lib/abr-live";
import { isStripeConfigured } from "@/lib/billing";
import { WINDOWS_INSTALLER_FILE } from "@/lib/brand";
import type { PlatformStatus } from "@/lib/platform-labels";

export type { PlatformStatus } from "@/lib/platform-labels";
export { abrRegisterLabel, windowsDownloadLabel } from "@/lib/platform-labels";

export function isWindowsInstallerReady(): boolean {
  return existsSync(path.join(process.cwd(), "private", "downloads", WINDOWS_INSTALLER_FILE));
}

/** Server-side feature flags for honest UI labels (no secrets). */
export function getPlatformStatus(): PlatformStatus {
  return {
    abrLive: isLiveAbrConfigured(),
    windowsInstallerReady: isWindowsInstallerReady(),
    stripeConfigured: isStripeConfigured(),
  };
}
