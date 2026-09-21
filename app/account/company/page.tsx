import { redirect } from "next/navigation";

export default function AccountCompanyAliasPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next =
    searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
      ? `?next=${encodeURIComponent(searchParams.next)}`
      : "?next=/demo/account";
  redirect(`/add-company${next}`);
}
