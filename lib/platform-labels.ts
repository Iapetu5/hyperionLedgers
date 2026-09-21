export type PlatformStatus = {
  abrLive: boolean;
  windowsInstallerReady: boolean;
  stripeConfigured: boolean;
};

export function abrRegisterLabel(live: boolean): string {
  return live ? "Australian Business Register (live)" : "practice register (demo ABR fallback)";
}

export function windowsDownloadLabel(ready: boolean): string {
  return ready
    ? "After you pay, you can download the Windows app from Downloads."
    : "After you pay, Downloads unlocks — the Windows installer is still being published to the server.";
}
