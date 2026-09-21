"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/demo/ConfirmDialog";
import { useState } from "react";

export type DocDeleteKind = "invoice" | "quote" | "bill";

const COPY = {
  invoice: {
    confirmLabel: "Delete invoice",
    body: (id: string) =>
      `Removes this invoice from this browser. Other invoices, quotes, and bills stay. The customer pay link for ${id} will not work after this. Mark paid and Undo paid only change status — they do not delete.`,
  },
  quote: {
    confirmLabel: "Delete quote",
    body: (id: string) =>
      `Removes this quote from this browser. Other quotes, invoices, and bills stay. The customer link for ${id} will not work after this.`,
  },
  bill: {
    confirmLabel: "Delete bill",
    body: (id: string) =>
      `Removes this bill from this browser. Other bills, invoices, and quotes stay. Approve, Mark paid, and Undo paid only change status — they do not delete.`,
  },
} as const;

export function docDeleteCopy(kind: DocDeleteKind, id: string) {
  const copy = COPY[kind];
  return {
    title: `Delete ${id}?`,
    body: copy.body(id),
    confirmLabel: copy.confirmLabel,
  };
}

/**
 * Rose quiet Delete. Confirm is owned here so list pages can pass a real delete.
 * The dialog must survive More closing — MoreMenu keeps overflow items mounted.
 * pendingId is snapshotted on click so Mark paid / status change cannot rename the confirm.
 */
export function DocDeleteButton({
  id,
  kind,
  onDelete,
}: {
  id: string;
  kind: DocDeleteKind;
  onDelete: (id: string) => void;
}) {
  const [pending, setPending] = useState<{ id: string; title: string; body: string; confirmLabel: string } | null>(
    null,
  );
  return (
    <>
      <button
        type="button"
        className="btn-quiet-danger !px-2 !py-1 text-xs"
        onClick={() => setPending({ id, ...docDeleteCopy(kind, id) })}
        title={`Remove ${id} from this browser — other documents stay`}
      >
        <Trash2 size={12} />
        Delete
      </button>
      <ConfirmDialog
        open={pending != null}
        title={pending?.title ?? docDeleteCopy(kind, id).title}
        body={pending?.body ?? docDeleteCopy(kind, id).body}
        confirmLabel={pending?.confirmLabel ?? COPY[kind].confirmLabel}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const del = pending?.id;
          setPending(null);
          if (del) onDelete(del);
        }}
      />
    </>
  );
}
