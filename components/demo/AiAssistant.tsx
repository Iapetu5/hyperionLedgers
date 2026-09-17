"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import {
  AI_DISCLAIMER,
  BLANK_SUGGESTED_CHIPS,
  SUGGESTED_CHIPS,
  blankAiGreeting,
  defaultAiGreeting,
  getCopilotReply,
  type AiAction,
  type AiReply,
} from "@/lib/ai-copilot";
import { applyCategoryToTransaction } from "@/lib/bank-transactions";
import { formatAUD } from "@/lib/format";

type Msg =
  | { role: "assistant"; kind: "greeting"; text: string }
  | { role: "user"; text: string }
  | { role: "assistant"; kind: "reply"; reply: AiReply; applied?: string[] }
  | { role: "assistant"; kind: "error"; text: string };

export function AiAssistant({
  open,
  onClose,
  seedPrompt,
  seedKey = 0,
  blankLedger = false,
  orgName,
}: {
  open: boolean;
  onClose: () => void;
  seedPrompt?: string;
  seedKey?: number;
  /** Blank org — greeting / what-next without Harbour KPIs */
  blankLedger?: boolean;
  orgName?: string;
}) {
  const greeting = blankLedger ? blankAiGreeting : defaultAiGreeting;
  const chips = blankLedger ? BLANK_SUGGESTED_CHIPS : SUGGESTED_CHIPS;
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", kind: "greeting", text: greeting },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSeedKey, setLastSeedKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep greeting in sync when switching blank vs sample session
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant" && prev[0].kind === "greeting") {
        return [{ role: "assistant", kind: "greeting", text: greeting }];
      }
      return prev;
    });
  }, [greeting]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, messages]);

  useEffect(() => {
    if (!open || !seedPrompt || seedKey === lastSeedKey) return;
    setLastSeedKey(seedKey);
    runQuery(seedPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedPrompt, seedKey]);

  function runQuery(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);

    // Tiny delay so the panel feels responsive without faking an API
    window.setTimeout(() => {
      try {
        const reply = getCopilotReply(q, { blankLedger, orgName });
        setMessages((prev) => [...prev, { role: "assistant", kind: "reply", reply, applied: [] }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            kind: "error",
            text: "Something went wrong reading the demo ledger. Try again, or ask “what next?”.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    }, 180);
  }

  function applyAction(msgIndex: number, action: AiAction) {
    if (action.kind === "prompt" && action.prompt) {
      runQuery(action.prompt);
      return;
    }
    if (action.kind !== "apply-category" || !action.txnId || !action.category) return;

    const updated = applyCategoryToTransaction(action.txnId, action.category);
    if (!updated) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          kind: "error",
          text: "Could not apply that category — the bank line may already be gone. Refresh Banking and try again.",
        },
      ]);
      return;
    }

    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || m.role !== "assistant" || m.kind !== "reply") return m;
        return {
          ...m,
          applied: [...(m.applied ?? []), action.txnId!],
        };
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        kind: "reply",
        applied: [],
        reply: {
          intent: "categorise",
          prose: `Applied ${action.category!.accountCode} — ${action.category!.accountName} (${action.category!.taxRate}) to “${updated.description}” (${formatAUD(updated.amount)}). It’s marked matched in this browser demo. Open Banking to confirm.`,
          citations: [
            {
              label: "Applied",
              value: `${action.category!.accountCode} · ${updated.description}`,
              source: updated.id,
            },
          ],
          actions: [
            { id: "bank", label: "View in Banking", kind: "link", href: "/demo/banking" },
            {
              id: "more",
              label: "Categorise another",
              kind: "prompt",
              prompt: "Categorise unmatched bank lines",
            },
          ],
          chips: ["Categorise unmatched bank lines", "What should I do next?"],
          disclaimer: AI_DISCLAIMER,
        },
      },
    ]);
  }

  if (!open) return null;

  return (
    <div
      data-ai-assistant
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ask AI bookkeeping copilot"
    >
      <div className="flex h-[min(640px,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-fuchsia-500/15 backdrop-blur-xl">
        <header
          className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 text-white"
          style={{
            background:
              "radial-gradient(circle at 90% 10%, rgba(34,211,238,0.18), transparent 40%), linear-gradient(115deg, #020617 0%, #0f172a 50%, #1e103b 100%)",
          }}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles size={16} className="text-brand-400" />
              {blankLedger ? <>Ask AI · Blank ledger</> : <>Ask AI · Harbour &amp; Co</>}
            </p>
            <p className="mt-0.5 text-xs text-white/65">
              {blankLedger
                ? "Blank-ledger tips — create docs here, or explore Harbour sample for full facts"
                : "Grounded demo copilot — sample ledger facts, not a live tax agent"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-black/40 p-4">
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div
                  key={i}
                  className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-brand-500 px-3 py-2 text-sm font-medium text-slate-950"
                >
                  {m.text}
                </div>
              );
            }
            if (m.kind === "greeting" || m.kind === "error") {
              return (
                <div
                  key={i}
                  className={`max-w-[95%] rounded-2xl rounded-bl-md border px-3 py-2.5 text-sm ${
                    m.kind === "error"
                      ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                      : "border-white/10 bg-white/[0.06] text-slate-100"
                  }`}
                >
                  {m.kind === "error" && (
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-200">
                      <AlertCircle size={12} /> Error
                    </p>
                  )}
                  {m.text}
                  {m.kind === "greeting" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          className="rounded-full border border-brand-400/40 bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-100 transition hover:bg-brand-500/25"
                          onClick={() => {
                            // Soft first-session: this chip opens the invoices mixed starter
                            if (/mixed\s*tax/i.test(chip)) {
                              window.location.assign("/demo/invoices?mixed=1");
                              return;
                            }
                            runQuery(chip);
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const { reply, applied = [] } = m;
            return (
              <div
                key={i}
                className="max-w-[95%] space-y-2.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] p-3 text-sm text-slate-100 shadow-sm"
              >
                <p className="leading-relaxed text-slate-100">{reply.prose}</p>

                {reply.citations.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2">
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <BookOpen size={11} />
                      Numbers used
                    </p>
                    <ul className="space-y-1">
                      {reply.citations.map((c, ci) => (
                        <li key={ci} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
                          <span className="font-medium text-slate-300">{c.label}</span>
                          <span className="font-semibold text-white">{c.value}</span>
                          <span className="w-full text-[10px] text-slate-500">{c.source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reply.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {reply.actions.map((a) => {
                      if (a.kind === "link" && a.href) {
                        return (
                          <Link
                            key={a.id}
                            href={a.href}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-brand-200 shadow-sm hover:bg-white/15"
                          >
                            {a.label}
                            <ExternalLink size={12} />
                          </Link>
                        );
                      }
                      if (a.kind === "apply-category") {
                        const done = a.txnId ? applied.includes(a.txnId) : false;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            disabled={done}
                            onClick={() => applyAction(i, a)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
                              done
                                ? "cursor-default border border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                                : "border border-brand-300/50 bg-brand-500 text-slate-950 hover:bg-brand-400"
                            }`}
                          >
                            {done ? <CheckCircle2 size={12} /> : <Sparkles size={12} />}
                            {done ? "Applied" : a.label}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => applyAction(i, a)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-100 shadow-sm hover:bg-white/15"
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {reply.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                    {reply.chips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="rounded-full border border-white/15 bg-black/25 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:border-brand-400/40 hover:bg-brand-500/15 hover:text-brand-100"
                        onClick={() => {
                          if (/mixed\s*tax/i.test(chip)) {
                            window.location.assign("/demo/invoices?mixed=1");
                            return;
                          }
                          runQuery(chip);
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] leading-snug text-slate-500">{reply.disclaimer}</p>
              </div>
            );
          })}

          {busy && (
            <div className="max-w-[70%] rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-400">
              {blankLedger ? "Thinking about your blank ledger…" : "Reading Harbour & Co ledger…"}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-white/10 bg-black/50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            runQuery(input);
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="input"
              placeholder="Ask about cash, BAS, overdue, categorise…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              aria-label="Ask the bookkeeping copilot"
            />
            <button type="submit" className="btn-primary !px-3" aria-label="Send" disabled={busy || !input.trim()}>
              <Send size={16} />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">{AI_DISCLAIMER}</p>
        </form>
      </div>
    </div>
  );
}

export function openAssistant(prompt?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hl-open-assistant", { detail: { prompt } }));
}
