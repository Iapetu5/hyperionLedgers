import Link from "next/link";
import { existsSync } from "fs";
import path from "path";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { getSessionAccount } from "@/lib/server-auth";
import { grantDownloadFromSession, hasDownloadAccess, readEntitlementCookie } from "@/lib/entitlements";
import { isCheckoutSessionId, retrieveCheckoutSession, sessionGrantsDownload } from "@/lib/stripe";
import { isStripeConfigured, PLAN } from "@/lib/billing";
import { MARKETING_LIMITS, PRODUCT_NAME, WINDOWS_INSTALLER_FILE } from "@/lib/brand";
import { issueDownloadToken } from "@/lib/download-token";
import { rateLimit } from "@/lib/request-guard";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";

export const dynamic = "force-dynamic";

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: { session_id?: string; success?: string };
}) {
  const account = await getSessionAccount();
  const sessionId = searchParams.session_id ?? "";
  let sessionEntitled = false;
  // Never trust ?success=1 — only a retrieved Stripe session or stored entitlement.
  if (isCheckoutSessionId(sessionId)) {
    const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "page";
    if (rateLimit(`cs-retrieve:${ip}`, 20, 15 * 60 * 1000)) {
      const session = await retrieveCheckoutSession(sessionId);
      if (sessionGrantsDownload(session)) {
        sessionEntitled = true;
        await grantDownloadFromSession(session!);
      }
    }
  }
  const allowed = sessionEntitled || (await hasDownloadAccess());
  const installerReady = existsSync(
    path.join(process.cwd(), "private", "downloads", WINDOWS_INSTALLER_FILE)
  );
  const subject = account?.id || readEntitlementCookie() || sessionId || "entitled";
  const token = allowed && installerReady ? await issueDownloadToken(subject) : null;
  const downloadHref = token
    ? `/api/downloads/windows?token=${encodeURIComponent(token)}`
    : sessionEntitled && sessionId
      ? `/api/downloads/windows?session_id=${encodeURIComponent(sessionId)}`
      : "/api/downloads/windows";

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="marketing-kicker">Australian bookkeeping · Windows installer</p>
        <h1 className="marketing-title max-w-3xl">Download {PRODUCT_NAME} for Windows</h1>
        <p className="marketing-lead">
          {allowed
            ? `Your ${PLAN.trialDays}-day trial or $69 a month plan is active. This page is the Windows installer download — not a live bank feed. Mac is coming soon.`
            : `Start the HyperionInvoices free trial. ${PLAN.trialDays} days free, then $69 a month. After checkout, return here for the Windows installer when it is ready. Not a live bank feed. Mac is coming soon.`}
        </p>
        {!allowed ? (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <StartTrialButton className="btn-marketing-primary" email={account?.email} />
            <Link href="/signup" className="link-quiet">
              Sign up
            </Link>
            <Link href="/pricing" className="link-quiet">
              Pricing
            </Link>
            <TryDemoLink className="link-quiet" />
          </div>
        ) : null}

        {allowed ? (
          <div className="card mt-12 max-w-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              Buy → Pay → Download
            </p>
            {installerReady ? (
              <a href={downloadHref} className="btn-marketing-primary mt-6 w-full">
                Download for Windows
              </a>
            ) : (
              <p className="mt-4 text-base leading-7 text-amber-100">
                Checkout succeeded. The Windows file is not on this server yet. Nicholas: run the build in{" "}
                <code>desktop/README.md</code>.
              </p>
            )}
            <p className="mt-4 text-sm leading-7 text-slate-200">
              This download is only for your account. The link expires in 10 minutes and is not a public file.
            </p>
          </div>
        ) : (
          <div className="card mt-12 max-w-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              Buy → Pay → Download
            </p>
            {!isStripeConfigured() ? (
              <p className="mt-4 text-base leading-7 text-amber-100">
                Stripe test keys are not set on Vercel yet. You can still{" "}
                <Link href="/signup" className="link-quiet">
                  sign up
                </Link>
                , then return here after keys are added.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-4">
              <StartTrialButton className="btn-marketing-primary w-full" email={account?.email} />
              <Link href="/pricing" className="link-quiet text-center">
                Back to pricing
              </Link>
            </div>
          </div>
        )}
        <p className="mt-14 max-w-2xl text-base leading-7 text-slate-50">{MARKETING_LIMITS}</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
