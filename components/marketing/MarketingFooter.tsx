import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";

export function MarketingFooter() {
  return (
    <footer className="no-print mt-8 border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <BrandLogo />
          <p className="mt-3 text-sm text-white/55">
            Bookkeeping for Australian small business. $69 a month after a 14-day
            free trial. HyperionLedgers does not lodge with the ATO.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/signup" className="hover:text-white">Sign up</Link>
          <Link href="/try" className="hover:text-white">Start free trial</Link>
          <Link href="/product" className="hover:text-white">Product</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/demo" className="hover:text-white">Sample data</Link>
        </div>
      </div>
    </footer>
  );
}
