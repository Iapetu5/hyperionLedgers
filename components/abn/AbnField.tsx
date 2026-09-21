"use client";

import { useMemo, useState } from "react";
import { formatAbn, lookupAbn, validateAbnField } from "@/lib/abn";

export function AbnField({
  value,
  onChange,
  required = false,
  id = "abn",
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  id?: string;
}) {
  const [touched, setTouched] = useState(false);
  const error = useMemo(() => validateAbnField(value, required), [value, required]);
  const result = useMemo(() => {
    if (error || !value.trim()) return null;
    return lookupAbn(value);
  }, [value, error]);

  return (
    <div>
      <label htmlFor={id} className="label">
        ABN {required ? "" : "(optional)"}
      </label>
      <input
        id={id}
        className="input"
        inputMode="numeric"
        placeholder="51 824 753 556"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setTouched(true);
          if (value.trim() && !validateAbnField(value, false)) {
            onChange(formatAbn(value));
          }
        }}
        autoComplete="off"
      />
      {touched && error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      {result && !error && (
        <div className="mt-2 rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-2 text-xs text-slate-200">
          <p className="font-semibold text-white">{result.legalName}</p>
          <p>
            {result.entityType} · Status: {result.entityStatus}
            {result.gstRegistered ? " · GST registered" : " · Not GST registered"}
          </p>
          {result.address && <p className="mt-0.5 text-slate-300">{result.address}</p>}
          <p className="mt-1 text-[11px] text-slate-400">
            Simulated ABR result for demo — not a live ABR lookup.
          </p>
        </div>
      )}
    </div>
  );
}
