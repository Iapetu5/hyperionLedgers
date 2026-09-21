import Link from "next/link";
import { BrandLogo } from "@/components/marketing/BrandLogo";

export function MarketingFooter() {
  return (
    <footer className="no-print mt-8 border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <BrandLogo />
          <p className="mt-3 text-base leading-relaxed text-slate-100">
            Bookkeeping for a small Australian business. $69 a month after 14 days free.
            We do not send forms to the tax office.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-100">
          <Link href="/pricing" className="hover:text-white hover:underline">Pricing</Link>
          <Link href="/downloads" className="hover:text-white hover:underline">Downloads</Link>
          <Link href="/signup" className="hover:text-white hover:underline">Sign up</Link>
          <Link href="/try" className="hover:text-white hover:underline">How it works</Link>
          <Link href="/product" className="hover:text-white hover:underline">Product</Link>
          <Link href="/about" className="hover:text-white hover:underline">About</Link>
          <Link href="/contact" className="hover:text-white hover:underline">Contact</Link>
          <Link href="/demo" className="hover:text-white hover:underline">Try a demo</Link>
        </div>
      </div>
    </footer>
  );
}
