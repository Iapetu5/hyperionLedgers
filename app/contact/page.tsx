"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Clock } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { StartTrialButton } from "@/components/marketing/StartTrialButton";
import { TryDemoLink } from "@/components/marketing/TryDemoCta";
import { MARKETING_LIMITS } from "@/lib/brand";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="marketing-kicker">Australian bookkeeping · get in touch</p>
        <h1 className="marketing-title">Contact</h1>
        <p className="marketing-lead">
          Questions about HyperionInvoices? Leave a note here. This page does not send email yet.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <StartTrialButton className="btn-marketing-primary" />
          <Link href="/signup" className="link-quiet">
            Sign up
          </Link>
          <Link href="/pricing" className="link-quiet">
            Pricing
          </Link>
          <TryDemoLink className="link-quiet" />
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="card h-fit p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">Reach us</p>
            <ul className="mt-5 space-y-5 text-base leading-7 text-slate-50">
              <li className="flex gap-3">
                <Mail className="mt-1 shrink-0 text-brand-200" size={20} aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-white">Email</strong>
                  <br />
                  Use the form on this page. It does not send a message yet.
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-1 shrink-0 text-brand-200" size={20} aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-white">Based in Australia</strong>
                  <br />
                  Australian dollars and dates (DD/MM/YYYY).
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-1 shrink-0 text-brand-200" size={20} aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-white">This page</strong>
                  <br />
                  Notes stay in this browser until email is switched on.
                </span>
              </li>
            </ul>
          </aside>

          <form onSubmit={onSubmit} className="card space-y-4 p-6">
            {sent ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-base leading-7 text-emerald-50">
                Thanks — this page does not send email yet. Your note stayed in this browser.
              </div>
            ) : null}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" required className="input" placeholder="Alex Morgan" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" required className="input" placeholder="alex@example.com.au" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="business">
                Business (optional)
              </label>
              <input id="business" name="business" className="input" placeholder="Example Pty Ltd" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="topic">
                Topic
              </label>
              <select id="topic" name="topic" className="input" defaultValue="Product questions">
                <option>Product questions</option>
                <option>Pricing</option>
                <option>Something else</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-100" htmlFor="message">
                Message
              </label>
              <textarea id="message" name="message" required rows={4} className="input" placeholder="How can we help?" />
            </div>
            <button type="submit" className="btn-primary">
              Leave a note
            </button>
          </form>
        </div>
        <p className="mt-14 max-w-2xl text-base leading-7 text-slate-50">{MARKETING_LIMITS}</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
