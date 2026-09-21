import { redirect } from "next/navigation";

export default function OnboardingCompanyAliasPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
    ? `?next=${encodeURIComponent(searchParams.next)}`
    : "";
  redirect(`/add-company${next}`);
}
