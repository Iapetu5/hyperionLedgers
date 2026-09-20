/**
 * Enter in a line-item or composer field must not implicitly submit the
 * invoice / quote / bill create form. Implicit submit runs onSubmit, which
 * saves and then resetForm() — that is the "everything was cleared" bug.
 *
 * Buttons keep their own Enter/Space activation, so the explicit
 * Save / Create button still works. Textareas keep newline.
 */
export function shouldBlockImplicitEnter(opts: {
  key: string;
  tagName?: string | null;
  composing?: boolean;
}): boolean {
  if (opts.composing) return false;
  if (opts.key !== "Enter") return false;
  const tag = (opts.tagName || "").toUpperCase();
  if (tag === "BUTTON" || tag === "TEXTAREA" || tag === "A") return false;
  if (tag === "INPUT" || tag === "SELECT") return true;
  return false;
}
