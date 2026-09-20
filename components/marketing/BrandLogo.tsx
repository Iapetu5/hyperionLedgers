import Link from "next/link";

export function BrandLogo({
  href = "/",
  size = 36,
  showWordmark = true,
  className = "",
}: {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/black-hole-logo.svg"
        alt=""
        width={size}
        height={size}
        className="rounded-full"
      />
      {showWordmark && (
        <span className="text-base font-bold tracking-tight text-white sm:text-lg">
          Hyperion<span className="text-brand-400">Ledgers</span>
        </span>
      )}
    </Link>
  );
}
