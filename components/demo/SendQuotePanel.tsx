"use client";

import { FormEvent, useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import { defaultQuoteSubject } from "@/lib/quote-email";

export type SendQuoteTarget = {
  id: string;
  contact: string;
  contactEmail?: string;
  businessName: string;
  amount: number;
};

export function SendQuotePanel({
  quote,
  onClose,
  onSent,
}: {
  quote: SendQuoteTarget;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [to, setTo] = useState(quote.contactEmail ?? "");
  const [subject, setSubject] = useState(defaultQuoteSubject(quote.id, quote.businessName));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    setTo(quote.contactEmail ?? "");
    setSubject(defaultQuoteSubject(quote.id, quote.businessName));
    setMessage("");
    setError(null);
    setOk(null);
  }, [quote]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quotes/send")
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/quotes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          to,
          subject,
          message,
          contact: quote.contact,
          businessName: quote.businessName,
          amount: quote.amount,
        }),
      });
      const data = (await res.json()) as { error?: string; sent?: boolean; configured?: boolean };
      if (data.configured === false) setConfigured(false);
      if (!res.ok) {
        setError(data.error || "Could not send the quote.");
        return;
      }
      setOk(`Sent ${quote.id} to ${to}.`);
      onSent?.();
    } catch {
      setError("Could not send the quote. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="send-quote-title"
        className="card w-full max-w-md p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Send quote</p>
            <h2 id="send-quote-title" className="mt-1 text-lg font-bold text-white">
              Email {quote.id}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              To, subject, and an optional note. The email includes the accept link.
            </p>
          </div>
          <button type="button" className="btn-secondary !px-2 !py-1" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {configured === false ? (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-50">
            Email is not configured. Add EMAIL_* or Gmail settings on Vercel. This quote is already Sent — not a draft.
          </p>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="send-quote-to">
              To
            </label>
            <input
              id="send-quote-to"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@business.com.au"
            />
          </div>
          <div>
            <label className="label" htmlFor="send-quote-subject">
              Subject
            </label>
            <input
              id="send-quote-subject"
              className="input"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="send-quote-message">
              Message (optional)
            </label>
            <textarea
              id="send-quote-message"
              className="input min-h-[5rem]"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A short note for the customer"
            />
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {ok ? <p className="text-sm text-emerald-300">{ok}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>
              <Mail size={16} />
              {busy ? "Sending…" : "Send"}
            </button>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
