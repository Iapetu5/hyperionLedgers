"use client";

import { Children, type ReactNode } from "react";
import { MoreMenu } from "@/components/demo/MoreMenu";

/**
 * Doc list row actions: keep the first few verbs visible and tuck the rest
 * into More so the primary path is obvious at every width.
 */
export function DocRowActions({
  children,
  keep = 2,
}: {
  children: ReactNode;
  /** How many actions stay visible before the More menu. */
  keep?: number;
}) {
  const items = Children.toArray(children).filter(Boolean);

  if (items.length <= keep) {
    return <div className="doc-row-actions">{items}</div>;
  }

  const visible = items.slice(0, keep);
  const overflow = items.slice(keep);

  return (
    <div className="doc-row-actions relative">
      {visible}
      <MoreMenu>{overflow}</MoreMenu>
    </div>
  );
}
