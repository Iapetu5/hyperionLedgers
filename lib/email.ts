import { createTransport } from "nodemailer";

export function isEmailConfigured(): boolean {
  if (process.env.EMAIL_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim()) return true;
  if (process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim()) return true;
  const host = process.env.EMAIL_SMTP_HOST?.trim();
  const user = process.env.EMAIL_SMTP_USER?.trim();
  const pass = process.env.EMAIL_SMTP_PASS?.trim();
  return Boolean(host && user && pass);
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    process.env.EMAIL_SMTP_USER?.trim() ||
    "quotes@hyperioninvoices.com.au"
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = process.env.EMAIL_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim();
  if (resend) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) return { ok: false, error: "The email provider rejected the message." };
    return { ok: true };
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const host = process.env.EMAIL_SMTP_HOST?.trim() || (gmailUser ? "smtp.gmail.com" : "");
  const user = process.env.EMAIL_SMTP_USER?.trim() || gmailUser;
  const pass = process.env.EMAIL_SMTP_PASS?.trim() || gmailPass;
  const port = Number(process.env.EMAIL_SMTP_PORT?.trim() || (host === "smtp.gmail.com" ? 465 : 587));
  if (!host || !user || !pass) {
    return { ok: false, error: "Email is not configured." };
  }

  try {
    const transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send the email. Check the mail settings on Vercel." };
  }
}
