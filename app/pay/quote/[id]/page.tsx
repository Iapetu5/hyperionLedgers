import { CustomerDocPage } from "@/components/pay/CustomerDocPage";

export default function PayQuotePage({
  params,
}: {
  params: { id: string };
}) {
  return <CustomerDocPage kind="quote" id={decodeURIComponent(params.id)} />;
}
