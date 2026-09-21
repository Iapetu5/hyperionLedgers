import Link from "next/link";
import { existsSync } from "fs";
import path from "path";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ClaimEntitlement } from "@/components/downloads/ClaimEntitlement";
import { getSessionAccount } from "@/lib/server-auth";
import { hasDownloadAccess, persistDownloadGrant, readEntitlementCookie } from "@/lib/entitlements";
import { isCheckoutSessionId, retrieveCheckoutSession, sessionGrantsDownload } from "@/lib/stripe";
import { isStripeConfigured, PLAN } from "@/lib/billing";
import { MARKETING_LIMITS, PRODUCT_NAME, WINDOWS_INSTALLER_FILE, WINDOWS_INSTALLER_NOTE } from "@/lib/brand";
import { issueDownloadToken } from "@/lib/download-token";
import { rateLimit } from "@/lib/request-guard";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { GoToAppLink, TryDemoLink } from "@/components/marketing/TryDemoCta";
import { SIGNUP_FOR_TRIAL } from "@/lib/trial-next";

export const dynamic = "force-dynamic";

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: { session_id?: string; success?: string };
}) {
  const account = await getSessionAccount();
  const sessionId = searchParams.session_id ?? "";
  let sessionEntitled = false;
  let sessionLookupFailed = false;
  // Never trust ?success=1 — only a retrieved Stripe session or stored entitlement.
  // Do not set cookies here: cookies().set() in a Server Component 500s the page.
  try {
    if (isCheckoutSessionId(sessionId)) {
      const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "page";
      if (rateLimit(`cs-retrieve:${ip}`, 20, 15 * 60 * 1000)) {
        const session = await retrieveCheckoutSession(sessionId);
        if (session && sessionGrantsDownload(session)) {
          sessionEntitled = true;
          try {
            await persistDownloadGrant(session);
          } catch {
            /* webhook may already have granted */
          }
        } else if (sessionId) {
          sessionLookupFailed = !session;
        }
      } else {
        sessionLookupFailed = true;
      }
    }
  } catch {
    sessionLookupFailed = Boolean(sessionId);
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
      {sessionEntitled && sessionId ? <ClaimEntitlement sessionId={sessionId} /> : null}
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="marketing-kicker">Australian bookkeeping · Windows installer</p>
        <h1 className="marketing-title max-w-3xl">Windows installer for {PRODUCT_NAME}</h1>
        <p className="marketing-lead">
          {allowed
            ? `Your ${PLAN.trialDays}-day trial or $69 AUD a month plan is active. This page is the Windows installer download — not a finished desktop app.`
            : `Start the HyperionInvoices free trial. ${PLAN.trialDays} days free, then $69 AUD a month. After checkout, this page unlocks the Windows installer when it is published. Not a finished desktop app.`}
        </p>
        {!allowed && !sessionId ? (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <StartTrialButton className="btn-marketing-primary" email={account?.email} />
            <Link href="/signup" className="link-quiet">
              Sign up
            </Link>
            <Link href="/pricing" className="link-quiet">
              Pricing
            </Link>
            <TryDemoLink className="link-quiet" />
            <GoToAppLink className="link-quiet" />
          </div>
        ) : null}

        {allowed ? (
          <div className="card mt-12 max-w-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              Windows installer
            </p>
            {installerReady ? (
              <a href={downloadHref} className="btn-marketing-primary mt-6 w-full">
                Download Windows installer
              </a>
            ) : (
              <p className="mt-4 text-base leading-7 text-slate-50">
                Your plan is active. The Windows installer is not published on this server yet. You
                can keep using HyperionInvoices in the browser.
              </p>
            )}
            <GoToAppLink className="link-quiet mt-4 block">Open your ledger in the browser</GoToAppLink>
            {!account ? (
              <p className="mt-4 text-sm text-slate-300">
                Sign in to keep this download on your account.{" "}
                <Link href="/login" className="link-quiet">
                  Sign in
                </Link>
              </p>
            ) : null}
            <p className="mt-4 text-sm leading-7 text-slate-200">
              {installerReady
                ? "This download is only for your account. The link expires in 10 minutes and is not a public file. Not a finished desktop app."
                : WINDOWS_INSTALLER_NOTE}
            </p>
          </div>
        ) : (
          <div className="card mt-12 max-w-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              Windows installer
            </p>
            {sessionId ? (
              <>
                <p className="mt-4 text-base leading-7 text-slate-50">
                  {sessionLookupFailed
                    ? "We could not confirm this checkout yet. Sign in — if your trial is already active, the Windows installer unlocks on your account."
                    : "This checkout is not complete yet. Sign in if you already started a trial, or start a new one after you create an account."}
                </p>
                <div className="mt-6 flex flex-col gap-4">
                  <Link href="/login" className="btn-marketing-primary w-full text-center">
                    Sign in to unlock the installer
                  </Link>
                  <Link href={SIGNUP_FOR_TRIAL} className="link-quiet text-center">
                    Create an account
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-base leading-7 text-slate-50">
                  Start the free trial ($69 AUD a month after {PLAN.trialDays} days). When Checkout
                  finishes, this page unlocks the Windows installer. The books also run in the
                  browser.
                </p>
                {!isStripeConfigured() ? (
                  <p className="mt-4 text-base leading-7 text-slate-50">
                    Card checkout is not open yet. You can still{" "}
                    <Link href="/signup" className="link-quiet">
                      sign up
                    </Link>
                    , then return here when the plan is ready.
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col gap-4">
                  <StartTrialButton className="btn-marketing-primary w-full" email={account?.email} />
                  <Link href="/pricing" className="link-quiet text-center">
                    Back to pricing
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
        <p className="mt-14 max-w-2xl text-base leading-7 text-slate-50">{MARKETING_LIMITS}</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
