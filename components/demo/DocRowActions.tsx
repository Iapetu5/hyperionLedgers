"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * Doc list row actions: wrap on comfortable widths; below ~900px keep the first
 * few visible and tuck the rest into a "More" menu so mid-width table cells stay usable
 * (avoids a cramped wrap band between phone and desktop).
 */
export function DocRowActions({
  children,
  keep = 2,
}: {
  children: ReactNode;
  /** How many actions stay visible before the overflow menu on compact widths. */
  keep?: number;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    // Include tablet / mid desktop where max-w wrap previously felt cramped.
    const mq = window.matchMedia("(max-width: 899px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  if (!compact || items.length <= keep) {
    return <div className="doc-row-actions">{items}</div>;
  }

  const visible = items.slice(0, keep);
  const overflow = items.slice(keep);

  return (
    <div className="doc-row-actions relative" ref={rootRef}>
      {visible}
      <div className="relative">
        <button
          type="button"
          className="btn-secondary !px-2 !py-1 text-xs"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          title="More actions"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal size={12} />
          More
        </button>
        {open && (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-30 mt-1 min-w-[10.5rem] rounded-lg border border-white/15 bg-slate-950/95 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-1">
              {overflow.map((node, i) => (
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
    </div>
  );
}
