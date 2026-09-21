"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { digitsOnlyAbn, formatAbn, lookupAbn, validateAbnField, type AbrCompany } from "@/lib/abn";

export function AbnField({
  value,
  onChange,
  required = false,
  id = "abn",
  onLookup,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  id?: string;
  onLookup?: (company: AbrCompany | null) => void;
}) {
  const [touched, setTouched] = useState(false);
  const [remote, setRemote] = useState<AbrCompany | null>(null);
  const [simulated, setSimulated] = useState(true);
  const onLookupRef = useRef(onLookup);
  onLookupRef.current = onLookup;
  const error = useMemo(() => validateAbnField(value, required), [value, required]);

  useEffect(() => {
    if (error || !value.trim()) {
      setRemote(null);
      onLookupRef.current?.(null);
      return;
    }
    const digits = digitsOnlyAbn(value);
    if (digits.length !== 11) {
      const local = lookupAbn(value);
      setRemote(local);
      onLookupRef.current?.(local);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/abr/search?q=${encodeURIComponent(digits)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as { results?: AbrCompany[]; simulated?: boolean };
        const row = data.results?.[0] ?? lookupAbn(value);
        setRemote(row);
        setSimulated(data.simulated !== false);
        onLookupRef.current?.(row);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const local = lookupAbn(value);
        setRemote(local);
        onLookupRef.current?.(local);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
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
      {remote && !error && (
        <div className="mt-2 rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-2 text-xs text-slate-200">
          <p className="font-semibold text-white">{remote.legalName}</p>
          <p>
            {remote.entityType} · Status: {remote.entityStatus}
            {remote.gstRegistered ? " · GST registered" : " · Not GST registered"}
          </p>
          {remote.address && <p className="mt-0.5 text-slate-300">{remote.address}</p>}
          <p className="mt-1 text-[11px] text-slate-400">
            {simulated
              ? "Demo register result — you can edit the name and details yourself."
              : "From the Australian Business Register."}
          </p>
        </div>
      )}
    </div>
  );
}
