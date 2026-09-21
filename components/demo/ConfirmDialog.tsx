"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/** Compact confirm — same control size as neighbouring buttons. Cancel is the easy way out.
 *  First action wins: Cancel, backdrop, and Escape are the same (no write). Confirm fires
 *  once per open. Tab stays inside Cancel/Confirm. Cancel is focused on open.
 *  State is memory-only — refresh is Cancel (no write).
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
  const confirmRef = useRef<HTMLButtonElement>(null);
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
        if (lockedRef.current) return;
        lockedRef.current = true;
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const list = [cancelRef.current, confirmRef.current].filter(
        (el): el is HTMLButtonElement => el != null && !el.disabled,
      );
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !list.includes(active as HTMLButtonElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !list.includes(active as HTMLButtonElement)) {
        e.preventDefault();
        first.focus();
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

  function handleCancel() {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setArmed(false);
    onCancel();
  }

  function handleConfirm() {
    if (lockedRef.current || !armed) return;
    lockedRef.current = true;
    setArmed(false);
    onConfirm();
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        tabIndex={-1}
        aria-label={cancelLabel}
        className="absolute inset-0 bg-black/60"
        onClick={handleCancel}
      />
      <div className="pointer-events-none relative flex h-full items-end justify-center p-3 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className="pointer-events-auto card w-full max-w-md p-5"
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
            <button ref={cancelRef} type="button" className="btn-secondary" onClick={handleCancel}>
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn-secondary border-rose-400/45 text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleConfirm}
              disabled={!armed}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
