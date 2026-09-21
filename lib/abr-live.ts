import {
  type AbrCompany,
  type AbrEntityType,
  digitsOnlyAbn,
  formatAbn,
  isValidAbnChecksum,
  searchAbr,
} from "@/lib/abn";

function abrGuid(): string {
  return (process.env.ABR_GUID || process.env.ABR_GUID_KEY || "").trim();
}

export function isLiveAbrConfigured(): boolean {
  return abrGuid().length >= 8;
}

function parseJsonp(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapEntityType(raw: string | undefined): AbrEntityType {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("public")) return "Australian Public Company";
  if (t.includes("sole") || t.includes("individual")) return "Individual/Sole Trader";
  if (t.includes("trust")) return "Discretionary Trading Trust";
  if (t.includes("partner")) return "Partnership";
  if (t.includes("private") || t.includes("pty")) return "Australian Private Company";
  if (t.includes("incorporat")) return "Other Incorporated Entity";
  return "Australian Private Company";
}

function fromAbnDetails(data: Record<string, unknown>): AbrCompany | null {
  const abn = String(data.Abn ?? data.ABN ?? "");
  if (!isValidAbnChecksum(abn)) return null;
  const legalName = String(data.EntityName ?? data.Name ?? "").trim();
  if (!legalName) return null;
  const status = String(data.AbnStatus ?? data.EntityStatus ?? "Active");
  const gst = String(data.Gst ?? "");
  const postcode = String(data.AddressPostcode ?? "");
  const state = String(data.AddressState ?? "");
  return {
    abn: formatAbn(abn),
    legalName,
    entityType: mapEntityType(String(data.EntityTypeName ?? data.EntityTypeCode ?? "")),
    entityStatus: /cancel/i.test(status) ? "Cancelled" : "Active",
    gstRegistered: Boolean(gst) && gst !== "0001-01-01",
    address: [postcode, state].filter(Boolean).join(" ") || undefined,
    simulated: false,
  };
}

async function fetchAbr(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const text = await res.text();
  return parseJsonp(text);
}

/** Live ABR JSON lookup when ABR_GUID is set. Returns null if unconfigured or the call fails. */
export async function searchAbrLive(query: string, limit = 8): Promise<AbrCompany[] | null> {
  const guid = abrGuid();
  if (!guid) return null;
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const digits = digitsOnlyAbn(q);
    if (/^\d{11}$/.test(digits)) {
      const data = await fetchAbr(
        `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${encodeURIComponent(digits)}&guid=${encodeURIComponent(guid)}`
      );
      if (!data) return null;
      const row = fromAbnDetails(data);
      return row ? [row] : [];
    }

    const data = await fetchAbr(
      `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(q)}&maxResults=${limit}&guid=${encodeURIComponent(guid)}`
    );
    if (!data) return null;
    const names = (data.Names ?? data.names ?? []) as Array<Record<string, unknown>>;
    if (!Array.isArray(names)) return [];

    const out: AbrCompany[] = [];
    const seen = new Set<string>();
    for (const row of names) {
      const abn = String(row.Abn ?? row.ABN ?? "");
      const key = digitsOnlyAbn(abn);
      if (!key || seen.has(key) || !isValidAbnChecksum(abn)) continue;
      seen.add(key);
      out.push({
        abn: formatAbn(abn),
        legalName: String(row.Name ?? row.EntityName ?? "").trim() || `ABN ${formatAbn(abn)}`,
        entityType: mapEntityType(String(row.NameType ?? row.EntityTypeName ?? "")),
        entityStatus: "Active",
        gstRegistered: false,
        simulated: false,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return null;
  }
}

export const searchAbrByName = searchAbrLive;

export type AbrSearchPayload = {
  query: string;
  results: AbrCompany[];
  simulated: boolean;
  source: "abr" | "demo";
};

/** Live ABR when ABR_GUID is set and the call succeeds; otherwise simulated directory. */
export async function resolveAbrSearch(query: string, limit = 8): Promise<AbrSearchPayload> {
  const q = query.trim().slice(0, 120);
  if (isLiveAbrConfigured()) {
    const live = await searchAbrLive(q, limit);
    if (live) {
      return { query: q, results: live, simulated: false, source: "abr" };
    }
  }
  return { query: q, results: searchAbr(q, limit), simulated: true, source: "demo" };
}
