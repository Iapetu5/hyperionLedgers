import Link from "next/link";
import {
  FileText,
  Landmark,
  Calculator,
  Boxes,
  Users,
  Briefcase,
  Wallet,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";

const FEATURES = [
  { icon: FileText, title: "Sales and quotes", body: "Make quotes and invoices. Send a pay link." },
  { icon: Wallet, title: "Purchases", body: "Enter bills and expenses. Keep supplier contacts." },
  { icon: Landmark, title: "Banking", body: "See accounts. Import a bank CSV. Not a live bank feed." },
  { icon: Boxes, title: "Products", body: "A list of items and stock for the sample business." },
  { icon: Briefcase, title: "Projects", body: "See job profit and time on sample work." },
  { icon: Users, title: "Payroll", body: "See pay runs and staff. Not connected to Single Touch Payroll." },
  { icon: Calculator, title: "GST and BAS", body: "See GST and the next BAS due date. Review a draft." },
  { icon: Sparkles, title: "Plain English", body: "Ask what to do next. Get a short answer." },
];

export default function ProductPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="marketing-kicker">Next step: start the trial</p>
        <h1 className="marketing-title max-w-3xl">
          See your books. Click around.
        </h1>
        <p className="marketing-lead">
          Quotes, invoices, bills, stock, banking, jobs, pay, GST, and reports.
          Ask a question and get a plain answer.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <StartTrialButton className="btn-marketing-primary" />
          <Link href="/pricing" className="link-quiet">
            Pricing
          </Link>
          <TryDemoLink className="link-quiet" />
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="text-brand-200" size={22} />
              <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-2 marketing-copy">{body}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
