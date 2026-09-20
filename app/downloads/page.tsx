import Link from "next/link";
import { existsSync } from "fs";
import path from "path";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { getSessionAccount } from "@/lib/server-auth";
import { grantDownloadFromSession, hasDownloadAccess } from "@/lib/entitlements";
import { retrieveCheckoutSession, sessionGrantsDownload } from "@/lib/stripe";
import { isStripeConfigured, PLAN } from "@/lib/billing";
import { PRODUCT_NAME, WINDOWS_INSTALLER_FILE } from "@/lib/brand";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";

export const dynamic = "force-dynamic";

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const account = await getSessionAccount();
  const sessionId = searchParams.session_id ?? "";
  if (sessionId) {
    const session = await retrieveCheckoutSession(sessionId);
    if (sessionGrantsDownload(session)) {
      await grantDownloadFromSession(session!);
    }
  }
  const allowed = await hasDownloadAccess();
  const installerReady = existsSync(
    path.join(process.cwd(), "private", "downloads", WINDOWS_INSTALLER_FILE)
  );

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
          Buy → Pay → Download
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Download {PRODUCT_NAME} for Windows
        </h1>
        {allowed ? (
          <div className="card mt-6 p-6">
            <p className="text-sm text-slate-300">
              Your {PLAN.trialDays}-day trial or $69 a month plan is active. Download the Windows app.
              Mac is coming soon.
            </p>
            {installerReady ? (
              <a href="/api/downloads/windows" className="btn-primary mt-6 w-full">
                Download for Windows
              </a>
            ) : (
              <p className="mt-4 text-sm text-amber-100">
                Checkout succeeded. The Windows file is not on this server yet. Nicholas: run the build in{" "}
                <code>desktop/README.md</code>.
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              This download is only for your account. It is not a public link.
            </p>
          </div>
        ) : (
          <div className="card mt-6 p-6">
            <p className="text-sm text-slate-300">
              Start the free trial on Stripe ($69 a month after {PLAN.trialDays} days). When Checkout
              finishes, this page unlocks the Windows app. Mac is coming soon.
            </p>
            {!isStripeConfigured() ? (
              <p className="mt-3 text-sm text-amber-100">
                Stripe test keys are not set on Vercel yet. You can still{" "}
                <Link href="/signup" className="underline">
                  sign up
                </Link>
                , then return here after keys are added.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              <StartTrialButton className="btn-primary" email={account?.email} />
              <Link href="/pricing" className="text-center text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
                Back to pricing
              </Link>
            </div>
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}
