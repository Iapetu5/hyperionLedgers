"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/demo/ConfirmDialog";
import { useState } from "react";
import { booksDeleteBody } from "@/lib/books-copy";

export type DocDeleteKind = "invoice" | "quote" | "bill";

const CONFIRM_LABEL: Record<DocDeleteKind, string> = {
  invoice: "Delete invoice",
  quote: "Delete quote",
  bill: "Delete bill",
};

export function docDeleteCopy(kind: DocDeleteKind, id: string, server = false) {
  return {
    title: `Delete ${id}?`,
    body: booksDeleteBody(server, kind, id),
    confirmLabel: CONFIRM_LABEL[kind],
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
  server = false,
}: {
  id: string;
  kind: DocDeleteKind;
  onDelete: (id: string) => void;
  server?: boolean;
}) {
  const [pending, setPending] = useState<{ id: string; title: string; body: string; confirmLabel: string } | null>(
    null,
  );
  const copy = docDeleteCopy(kind, id, server);
  return (
    <>
      <button
        type="button"
        className="btn-quiet-danger !px-2 !py-1 text-xs"
        onClick={() => setPending({ id, ...docDeleteCopy(kind, id, server) })}
        title={`Remove ${id} from ${server ? "your organisation" : "this browser"} — other documents stay`}
      >
        <Trash2 size={12} />
        Delete
      </button>
      <ConfirmDialog
        open={pending != null}
        title={pending?.title ?? copy.title}
        body={pending?.body ?? copy.body}
        confirmLabel={pending?.confirmLabel ?? copy.confirmLabel}
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
