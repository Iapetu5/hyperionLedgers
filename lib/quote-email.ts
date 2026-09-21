import { formatAUD } from "@/lib/format";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildQuoteEmailHtml(input: {
  quoteId: string;
  contact: string;
  businessName: string;
  amount: number;
  acceptUrl: string;
  message?: string;
}): string {
  const note = input.message?.trim()
    ? `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5">${escapeHtml(input.message.trim())}</p>`
    : "";
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#0f172a;font-family:Arial,sans-serif;padding:24px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px">
    <tr>
      <td style="padding:20px 24px;background:#0f172a;color:#67e8f9;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">HyperionInvoices</td>
    </tr>
    <tr>
      <td style="padding:24px">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px">Quote ${escapeHtml(input.quoteId)}</p>
        <h1 style="margin:0 0 12px;color:#0f172a;font-size:22px">Quote from ${escapeHtml(input.businessName)}</h1>
        ${note}
        <p style="margin:0 0 8px;color:#334155;font-size:14px">For ${escapeHtml(input.contact)}</p>
        <p style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:bold">${escapeHtml(formatAUD(input.amount))}</p>
        <a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:#06b6d4;color:#082f49;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:8px">View and accept quote</a>
        <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">This is a customer quote link. HyperionInvoices does not lodge with the ATO.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildQuoteEmailText(input: {
  quoteId: string;
  contact: string;
  businessName: string;
  amount: number;
  acceptUrl: string;
  message?: string;
}): string {
  const note = input.message?.trim() ? `${input.message.trim()}\n\n` : "";
  return `${note}Quote ${input.quoteId} from ${input.businessName} for ${input.contact}.
Amount: ${formatAUD(input.amount)}
View and accept: ${input.acceptUrl}

HyperionInvoices does not lodge with the ATO.`;
}

export function defaultQuoteSubject(quoteId: string, businessName: string): string {
  return `Quote ${quoteId} from ${businessName}`;
}
