"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, Clock } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Contact</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/75">
          Questions about the demo or the product concept? Send a note — the form is front-end only and does not submit to a server.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-xl border border-white/15 bg-black/35 p-6 text-white backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Reach us</p>
            <ul className="mt-5 space-y-4 text-sm text-white/80">
              <li className="flex gap-3">
                <Mail className="mt-0.5 shrink-0 text-brand-400" size={18} />
                <span>
                  <strong className="text-white">Email (demo)</strong>
                  <br />
                  hello@hyperionledgers.demo — placeholder only; use the form on this page.
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 shrink-0 text-fuchsia-400" size={18} />
                <span>
                  <strong className="text-white">Based in Australia</strong>
                  <br />
                  Conceptually Sydney / Australia — AUD, AEST/AEDT.
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 shrink-0 text-brand-400" size={18} />
                <span>
                  <strong className="text-white">Response time</strong>
                  <br />
                  In a real product: within one business day. This demo does not deliver messages.
                </span>
              </li>
            </ul>
          </aside>

          <form onSubmit={onSubmit} className="card space-y-4 p-6">
            {sent ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
                Thanks — this demo form only stores your note in this browser session. Nothing was emailed.
              </div>
            ) : null}
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" required className="input" placeholder="Alex Morgan" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className="input" placeholder="alex@example.com.au" />
            </div>
            <div>
              <label className="label" htmlFor="business">Business (optional)</label>
              <input id="business" name="business" className="input" placeholder="Example Pty Ltd" />
            </div>
            <div>
              <label className="label" htmlFor="topic">Topic</label>
              <select id="topic" name="topic" className="input" defaultValue="Trying the demo">
                <option>Trying the demo</option>
                <option>Product questions</option>
                <option>Something else</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="message">Message</label>
              <textarea id="message" name="message" required rows={4} className="input" placeholder="How can we help?" />
            </div>
            <button type="submit" className="btn-primary">Send message (demo)</button>
          </form>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
