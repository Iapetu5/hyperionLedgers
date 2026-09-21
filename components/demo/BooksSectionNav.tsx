"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/demo/invoices", label: "Invoices" },
  { href: "/demo/quotes", label: "Quotes" },
  { href: "/demo/bills", label: "Bills" },
  { href: "/demo/banking", label: "Banking" },
] as const;

/** In-page hops between money screens — text links only, not larger buttons. */
export function BooksSectionNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Invoices, quotes, bills, and banking" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-semibold text-white underline decoration-brand-400 decoration-2 underline-offset-4"
                : "text-slate-300 hover:text-white hover:underline"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
