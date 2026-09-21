import { redirect } from "next/navigation";

export default function OnboardingCompanyAliasPage({
  searchParams,
}: {
  searchParams: { next?: string; returnTo?: string; return?: string };
}) {
  const raw = searchParams.returnTo || searchParams.return || searchParams.next || "/onboarding";
  const dest = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/onboarding";
  redirect(`/add-company?returnTo=${encodeURIComponent(dest)}`);
}
