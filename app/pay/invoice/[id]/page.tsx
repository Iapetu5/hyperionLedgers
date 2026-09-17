import { CustomerDocPage } from "@/components/pay/CustomerDocPage";

export default function PayInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  return <CustomerDocPage kind="invoice" id={decodeURIComponent(params.id)} />;
}
