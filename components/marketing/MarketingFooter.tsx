import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="no-print border-t border-white/10 mt-16">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-white/55 sm:px-6">
        <p>HyperionLedgers demo · sample data only · not a live accounting service</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/product" className="hover:text-white">Product</Link>
          <Link href="/try" className="hover:text-white">How to try</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/demo" className="hover:text-white">Demo</Link>
        </div>
      </div>
    </footer>
  );
}
