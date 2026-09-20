/** Visible step counter for signup and onboarding wizards. */

export function EasyStepBar({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  return (
    <div>
      <p className="text-base font-semibold text-brand-200" aria-live="polite">
        Step {current} of {total}
        {label ? ` · ${label}` : ""}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < current ? "bg-brand-400" : "bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
