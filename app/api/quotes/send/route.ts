import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { buildQuoteEmailHtml, buildQuoteEmailText } from "@/lib/quote-email";
import { checkoutOriginAllowed, clientIp, rateLimit } from "@/lib/request-guard";
import { publicQuoteUrl } from "@/lib/public-docs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendBody = {
  quoteId?: string;
  to?: string;
  subject?: string;
  message?: string;
  contact?: string;
  businessName?: string;
  amount?: number;
};

export async function GET() {
  return NextResponse.json({ configured: isEmailConfigured() });
}

export async function POST(req: Request) {
  if (!checkoutOriginAllowed(req)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  if (!rateLimit(`quote-send:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many send attempts." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as SendBody;
  const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim().slice(0, 40) : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 120) : "Customer";
  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim().slice(0, 120) : "HyperionInvoices";
  const amount = typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : 0;

  if (!quoteId) return NextResponse.json({ error: "Missing quote." }, { status: 400 });
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: "Enter a valid To email." }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Enter a subject." }, { status: 400 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Email is not configured. Add GMAIL_USER + GMAIL_APP_PASSWORD, EMAIL_SMTP_* , or EMAIL_API_KEY on Vercel, then redeploy. The quote is still Sent — copy the customer link or print/PDF instead.",
      },
      { status: 503 }
    );
  }

  const acceptUrl = `${getAppUrl()}${publicQuoteUrl(quoteId)}`;
  const payload = { quoteId, contact, businessName, amount, acceptUrl, message };
  const result = await sendEmail({
    to,
    subject,
    html: buildQuoteEmailHtml(payload),
    text: buildQuoteEmailText(payload),
  });
  if (!result.ok) {
    return NextResponse.json({ configured: true, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ configured: true, sent: true });
}
