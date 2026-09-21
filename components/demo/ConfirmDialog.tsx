"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/** Compact confirm — same control size as neighbouring buttons. Cancel is the easy way out.
 *  Confirm fires once per open. State is memory-only — refresh is Cancel (no write).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lockedRef = useRef(false);
  const [armed, setArmed] = useState(true);

  useEffect(() => {
    if (!open) return;
    lockedRef.current = false;
    setArmed(true);
    const id = window.requestAnimationFrame(() => cancelRef.current?.focus());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  function handleConfirm() {
    if (lockedRef.current || !armed) return;
    lockedRef.current = true;
    setArmed(false);
    onConfirm();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="card w-full max-w-md p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-200" aria-hidden />
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-white">
              {title}
            </h2>
            <p id={bodyId} className="mt-2 text-sm leading-relaxed text-slate-300">
              {body}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-secondary border-rose-400/45 text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleConfirm}
            disabled={!armed}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
