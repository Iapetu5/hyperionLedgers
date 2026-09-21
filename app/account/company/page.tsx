import { redirect } from "next/navigation";

export default function AccountCompanyAliasPage({
  searchParams,
}: {
  searchParams: { next?: string; returnTo?: string; return?: string };
}) {
  const raw = searchParams.returnTo || searchParams.return || searchParams.next || "/demo/account";
  const dest = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/demo/account";
  redirect(`/add-company?returnTo=${encodeURIComponent(dest)}`);
}
