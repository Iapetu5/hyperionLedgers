/** Australian Business Number checksum and simulated ABR search (demo only). */

export type AbrEntityType =
  | "Australian Private Company"
  | "Australian Public Company"
  | "Individual/Sole Trader"
  | "Discretionary Trading Trust"
  | "Partnership"
  | "Other Incorporated Entity";

export const ABR_ENTITY_TYPES: AbrEntityType[] = [
  "Australian Private Company",
  "Australian Public Company",
  "Individual/Sole Trader",
  "Discretionary Trading Trust",
  "Partnership",
  "Other Incorporated Entity",
];

export type AbrCompany = {
  abn: string;
  legalName: string;
  entityType: AbrEntityType;
  entityStatus: "Active" | "Cancelled";
  gstRegistered: boolean;
  address?: string;
  simulated: boolean;
};

/** @deprecated Use AbrCompany — kept so existing ABN field code type-checks. */
export type AbrLookupResult = AbrCompany;

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

const ADDRESS_POOL = [
  "14 Harbour Street, Surry Hills NSW 2010",
  "22 King Street, Newtown NSW 2042",
  "Level 3, 200 Queen Street, Melbourne VIC 3000",
  "88 George Street, Sydney NSW 2000",
  "41 Flinders Street, Adelaide SA 5000",
  "9 Murray Street, Perth WA 6000",
  "16 Elizabeth Street, Hobart TAS 7000",
  "7 Petrie Plaza, Canberra ACT 2601",
  "120 Brunswick Street, Fortitude Valley QLD 4006",
  "5 Smith Street, Darwin NT 0800",
] as const;

export function digitsOnlyAbn(value: string): string {
  return value.replace(/\s/g, "");
}

export function formatAbn(abn: string): string {
  const digits = digitsOnlyAbn(abn);
  if (digits.length !== 11) return abn.trim();
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

export function isValidAbnChecksum(abn: string): boolean {
  const digits = digitsOnlyAbn(abn);
  if (!/^\d{11}$/.test(digits)) return false;
  const nums = digits.split("").map((d) => parseInt(d, 10));
  nums[0] -= 1;
  const sum = nums.reduce((acc, n, i) => acc + n * WEIGHTS[i], 0);
  return sum % 89 === 0;
}

export function validateAbnField(abn: string, required = false): string | null {
  const trimmed = abn.trim();
  if (!trimmed) return required ? "Enter an ABN." : null;
  const digits = digitsOnlyAbn(trimmed);
  if (!/^\d{11}$/.test(digits)) return "Enter 11 digits. Spaces are fine.";
  if (!isValidAbnChecksum(digits)) return "That ABN does not look right. Check the 11 digits and try again.";
  return null;
}

/** Deterministic valid ABN from a seed string — used for synthesised ABR hits. */
export function abnFromSeed(seed: string): string {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  const start = 10_000_000_000 + (n % 80_000_000_000);
  for (let i = 0; i < 200_000; i += 1) {
    const digits = String(start + i).slice(-11);
    if (digits[0] === "0") continue;
    if (isValidAbnChecksum(digits)) return formatAbn(digits);
  }
  return formatAbn("51 824 753 556");
}

function hashPick<T>(seed: string, items: readonly T[]): T {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i) * (i + 1)) % 997;
  return items[n % items.length];
}

function inferEntityType(name: string): AbrEntityType {
  const n = name.toLowerCase();
  if (/\btrust\b/.test(n)) return "Discretionary Trading Trust";
  if (/\bpartnership\b|\b& sons\b|\band co\b/.test(n)) return "Partnership";
  if (/\blimited\b|\bltd\b/.test(n) && !/\bpty\b/.test(n)) return "Australian Public Company";
  if (/\bsole trader\b|\bt\/as\b/.test(n)) return "Individual/Sole Trader";
  if (/\bpty\b|\bproprietary\b|\bcompany\b/.test(n)) return "Australian Private Company";
  if (name.trim().split(/\s+/).length <= 2) return "Individual/Sole Trader";
  return "Australian Private Company";
}

function displayLegalName(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (/\b(pty\.?\s*ltd|limited|trust|partnership)\b/i.test(trimmed)) return trimmed;
  if (inferEntityType(trimmed) === "Individual/Sole Trader") return trimmed;
  return `${trimmed} Pty Ltd`;
}

function toCompany(
  row: Omit<AbrCompany, "abn" | "simulated"> & { abn: string }
): AbrCompany {
  return {
    ...row,
    abn: formatAbn(row.abn),
    simulated: true,
  };
}

const ABR_DIRECTORY: AbrCompany[] = [
  toCompany({
    abn: "51824753556",
    legalName: "Demo Company Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "14 Harbour Street, Surry Hills NSW 2010",
  }),
  toCompany({
    abn: "53004085616",
    legalName: "Sample Retail Holdings Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "88 George Street, Sydney NSW 2000",
  }),
  toCompany({
    abn: "10000000032",
    legalName: "Bluegum Dental Practice Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "22 King Street, Newtown NSW 2042",
  }),
  toCompany({
    abn: "10000000064",
    legalName: "Northside Café Group Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "120 Brunswick Street, Fortitude Valley QLD 4006",
  }),
  toCompany({
    abn: "10000000113",
    legalName: "Cancelled Demo Entity Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Cancelled",
    gstRegistered: false,
    address: "Level 3, 200 Queen Street, Melbourne VIC 3000",
  }),
  toCompany({
    abn: "21000000027",
    legalName: "Harbour Lane Bookkeeping Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "9 Murray Street, Perth WA 6000",
  }),
  toCompany({
    abn: "33000000081",
    legalName: "Cedar & Pine Trust",
    entityType: "Discretionary Trading Trust",
    entityStatus: "Active",
    gstRegistered: true,
    address: "41 Flinders Street, Adelaide SA 5000",
  }),
  toCompany({
    abn: "45000000491",
    legalName: "Alex Nguyen",
    entityType: "Individual/Sole Trader",
    entityStatus: "Active",
    gstRegistered: false,
    address: "16 Elizabeth Street, Hobart TAS 7000",
  }),
  toCompany({
    abn: "51000000680",
    legalName: "Westgate Plumbing Partnership",
    entityType: "Partnership",
    entityStatus: "Active",
    gstRegistered: true,
    address: "7 Petrie Plaza, Canberra ACT 2601",
  }),
  toCompany({
    abn: "72000000029",
    legalName: "Indigo Goods Limited",
    entityType: "Australian Public Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "88 George Street, Sydney NSW 2000",
  }),
  toCompany({
    abn: "81000000480",
    legalName: "Figtree Studios Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "14 Harbour Street, Surry Hills NSW 2010",
  }),
  toCompany({
    abn: "18000000181",
    legalName: "Example Cafe Pty Ltd",
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: "22 King Street, Newtown NSW 2042",
  }),
];

function synthesiseCompany(query: string): AbrCompany {
  const legalName = displayLegalName(query);
  const entityType = inferEntityType(legalName);
  return {
    abn: abnFromSeed(legalName.toLowerCase()),
    legalName,
    entityType,
    entityStatus: "Active",
    gstRegistered: entityType !== "Individual/Sole Trader",
    address: hashPick(legalName, ADDRESS_POOL),
    simulated: true,
  };
}

function nameScore(legalName: string, needle: string): number {
  const name = legalName.toLowerCase();
  if (name === needle) return 100;
  if (name.startsWith(needle)) return 80;
  if (name.includes(needle)) return 50;
  const words = needle.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => name.includes(w))) return 40;
  if (words.some((w) => w.length >= 2 && name.split(/\s+/).some((part) => part.startsWith(w)))) return 25;
  return 0;
}

export function lookupAbn(abn: string): AbrCompany | null {
  const digits = digitsOnlyAbn(abn);
  if (!isValidAbnChecksum(digits)) return null;
  const known = ABR_DIRECTORY.find((row) => digitsOnlyAbn(row.abn) === digits);
  if (known) return known;
  return {
    abn: formatAbn(digits),
    legalName: `Demo Entity ${digits.slice(-4)} Pty Ltd`,
    entityType: "Australian Private Company",
    entityStatus: "Active",
    gstRegistered: true,
    address: hashPick(digits, ADDRESS_POOL),
    simulated: true,
  };
}

/** Search simulated ABR by legal name or ABN. Empty / 1-character queries return []. */
export function searchAbr(query: string, limit = 8): AbrCompany[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const results: AbrCompany[] = [];
  const seen = new Set<string>();
  const push = (company: AbrCompany | null) => {
    if (!company) return;
    const key = digitsOnlyAbn(company.abn);
    if (seen.has(key)) return;
    seen.add(key);
    results.push(company);
  };

  const digits = digitsOnlyAbn(q);
  const looksLikeAbn = /^\d{8,11}$/.test(digits);

  if (looksLikeAbn) {
    if (digits.length === 11) push(lookupAbn(digits));
    for (const row of ABR_DIRECTORY) {
      if (digitsOnlyAbn(row.abn).includes(digits)) push(row);
    }
  }

  const needle = q.toLowerCase();
  const scored = ABR_DIRECTORY.map((row) => ({ row, score: nameScore(row.legalName, needle) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  for (const item of scored) push(item.row);

  if (!looksLikeAbn) {
    const specific =
      /\s/.test(q) || /\b(pty|ltd|trust|limited|partnership)\b/i.test(q) || q.length >= 8;
    if (specific || results.length === 0) {
      const synth = synthesiseCompany(q);
      const alreadyNamed = results.some(
        (row) => row.legalName.toLowerCase() === synth.legalName.toLowerCase()
      );
      if (!alreadyNamed) push(synth);
    }
  }

  return results.slice(0, limit);
}

/** Alias used by add-company / signup typeahead. Same as searchAbr (simulated). */
export const searchAbrByName = searchAbr;

/** Iapetus Add company search name. Same as searchAbr (simulated). */
export const searchAbrCompanies = searchAbr;
