import Link from "next/link";

export function BrandLogo({
  href = "/",
  size = 36,
  showWordmark = true,
  hideWordmarkOnMobile = false,
  className = "",
}: {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  hideWordmarkOnMobile?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/black-hole-logo.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full"
      />
      {showWordmark && (
        <span
          className={`text-lg font-bold tracking-tight text-white ${
            hideWordmarkOnMobile ? "hidden sm:inline" : ""
          }`}
        >
          Hyperion<span className="text-brand-400">Ledgers</span>
        </span>
      )}
    </Link>
  );
}
