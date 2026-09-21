"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { MoreHorizontal } from "lucide-react";

const MORE_OPEN_EVENT = "hl-more-open";

function menuFocusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true",
  );
}

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusLastRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const menuId = useId();

  useEffect(() => {
    function onOther(e: Event) {
      const otherId = (e as CustomEvent<string>).detail;
      if (otherId !== menuId) {
        restoreFocusRef.current = false;
        setOpen(false);
      }
    }
    window.addEventListener(MORE_OPEN_EVENT, onOther);
    return () => window.removeEventListener(MORE_OPEN_EVENT, onOther);
  }, [menuId]);

  function announceOpen() {
    window.dispatchEvent(new CustomEvent(MORE_OPEN_EVENT, { detail: menuId }));
  }

  function closeMenu(restoreFocus: boolean) {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
  }

  useEffect(() => {
    if (open) return;
    if (!restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    buttonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      const t = e.target as HTMLElement | null;
      const otherControl = Boolean(
        t?.closest("a, button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])"),
      );
      closeMenu(!otherControl);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
        return;
      }
      const menu = menuRef.current;
      if (!menu) return;
      const focusables = menuFocusables(menu);
      if (focusables.length === 0) return;
      const current = document.activeElement as HTMLElement | null;
      const idx = current ? focusables.indexOf(current) : -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = focusables[(idx + 1 + focusables.length) % focusables.length];
        next?.focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = focusables[(idx - 1 + focusables.length) % focusables.length];
        prev?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        focusables[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        focusables[focusables.length - 1]?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    const id = window.requestAnimationFrame(() => {
      const list = menuRef.current ? menuFocusables(menuRef.current) : [];
      const target = focusLastRef.current ? list[list.length - 1] : list[0];
      target?.focus();
      focusLastRef.current = false;
    });
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        title={title}
        onClick={() => {
          if (open) {
            closeMenu(false);
            return;
          }
          focusLastRef.current = false;
          announceOpen();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            focusLastRef.current = false;
            announceOpen();
            setOpen(true);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            focusLastRef.current = true;
            announceOpen();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal size={12} />
        {label}
      </button>
      <div
        id={menuId}
        ref={menuRef}
        role="menu"
        aria-label={title}
        hidden={!open}
        className={`absolute z-30 mt-1 min-w-[11rem] rounded-lg border border-white/15 bg-slate-950/95 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl ${
          align === "left" ? "left-0" : "right-0"
        }`}
      >
        <div className="flex flex-col gap-1">
          {items.map((node, i) => (
            <div
              key={isValidElement(node) && node.key != null ? String(node.key) : i}
              role="none"
              className="doc-row-actions-menu-item"
              onClick={() => closeMenu(false)}
            >
              {isValidElement(node)
                ? cloneElement(node as ReactElement, { role: "menuitem" })
                : node}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
