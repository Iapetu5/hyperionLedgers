"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

/** Overflow / power-action menu. Same control size as neighbouring compact buttons. */
export function MoreMenu({
  children,
  label = "More",
  title = "More actions",
  align = "right",
  buttonClassName = "btn-secondary !px-2 !py-1 text-xs",
}: {
  children: ReactNode;
  label?: string;
  title?: string;
  align?: "left" | "right";
  buttonClassName?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        title={title}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={12} />
        {label}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-30 mt-1 min-w-[11rem] rounded-lg border border-white/15 bg-slate-950/95 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="flex flex-col gap-1">
            {items.map((node, i) => (
              <div
                key={isValidElement(node) && node.key != null ? String(node.key) : i}
                role="menuitem"
                className="doc-row-actions-menu-item"
                onClick={() => setOpen(false)}
              >
                {node}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
