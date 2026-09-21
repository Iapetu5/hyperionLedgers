"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/demo/ConfirmDialog";

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

/** List Delete — rose quiet control, confirm names what is removed vs kept. */
export function DocDeleteButton({
  id,
  kind,
  onDelete,
}: {
  id: string;
  kind: "invoice" | "quote" | "bill";
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const copy = COPY[kind];
  return (
    <>
      <button
        type="button"
        className="btn-quiet-danger !px-2 !py-1 text-xs"
        onClick={() => setOpen(true)}
        title={`Remove ${id} from this browser — other documents stay`}
      >
        <Trash2 size={12} />
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete ${id}?`}
        body={copy.body(id)}
        confirmLabel={copy.confirmLabel}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onDelete(id);
        }}
      />
    </>
  );
}
