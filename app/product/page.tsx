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
import { GuestOnly, TryDemoLink } from "@/components/marketing/TryDemoCta";

const FEATURES = [
  { icon: FileText, title: "Sales and quotes", body: "Make quotes and invoices. Send a pay link." },
  { icon: Wallet, title: "Purchases", body: "Enter bills and expenses. Keep supplier contacts." },
  { icon: Landmark, title: "Banking", body: "See accounts. Import a bank CSV. Not a live bank feed." },
  { icon: Boxes, title: "Products", body: "Keep items and stock in one list." },
  { icon: Briefcase, title: "Projects", body: "See job profit and time on the work you track." },
  { icon: Users, title: "Payroll", body: "See pay runs and staff. Not connected to Single Touch Payroll." },
  { icon: Calculator, title: "GST and BAS", body: "See GST and the next BAS due date. Review a draft." },
  { icon: Sparkles, title: "Plain English", body: "Ask what to do next. Get a short answer." },
];

export default function ProductPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="marketing-kicker">Australian bookkeeping · what you get</p>
        <h1 className="marketing-title max-w-3xl">
          Quotes, invoices, GST, and reports in one place.
        </h1>
        <p className="marketing-lead">
          HyperionInvoices keeps sales, bills, stock, banking, jobs, pay, and GST together.
          Ask a question and get a plain answer.
          <GuestOnly>
            {" "}
            Or try a demo first — that path uses sample data, not your real account.
          </GuestOnly>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <StartTrialButton className="btn-marketing-primary" />
          <Link href="/signup" className="link-quiet">
            Sign up
          </Link>
          <Link href="/pricing" className="link-quiet">
            Pricing
          </Link>
          <TryDemoLink className="link-quiet" />
        </div>

        <section className="mt-16">
          <h2 className="marketing-section-title">What you can do in HyperionInvoices</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-50">
            One plan. Open a page, see the numbers, and know what to do next.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-6">
                <Icon className="text-brand-200" size={24} aria-hidden="true" />
                <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 marketing-copy">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-14 max-w-2xl text-base leading-7 text-slate-50">
          HyperionInvoices does not send forms to the tax office. Mac is coming soon.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
