/** Australian Business Number checksum and simulated ABR lookup (demo only). */

export type AbrLookupResult = {
  abn: string;
  legalName: string;
  entityStatus: "Active" | "Cancelled";
  gstRegistered: boolean;
  simulated: true;
};

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

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
  if (!/^\d{11}$/.test(digits)) return "ABN should be 11 digits (spaces optional).";
  if (!isValidAbnChecksum(digits)) return "ABN checksum is invalid. Check the number and try again.";
  return null;
}

const SIMULATED_ABR: Record<string, Omit<AbrLookupResult, "abn" | "simulated">> = {
  "51824753556": { legalName: "Demo Company Pty Ltd", entityStatus: "Active", gstRegistered: true },
  "53004085616": { legalName: "Sample Retail Holdings Pty Ltd", entityStatus: "Active", gstRegistered: true },
  "10000000032": { legalName: "Bluegum Dental Practice Pty Ltd", entityStatus: "Active", gstRegistered: true },
  "10000000064": { legalName: "Northside Café Group Pty Ltd", entityStatus: "Active", gstRegistered: true },
  "10000000113": { legalName: "Cancelled Demo Entity Pty Ltd", entityStatus: "Cancelled", gstRegistered: false },
};

export function lookupAbn(abn: string): AbrLookupResult | null {
  const digits = digitsOnlyAbn(abn);
  if (!isValidAbnChecksum(digits)) return null;
  const known = SIMULATED_ABR[digits];
  if (known) {
    return { abn: formatAbn(digits), ...known, simulated: true };
  }
  return {
    abn: formatAbn(digits),
    legalName: `Demo Entity ${digits.slice(-4)} Pty Ltd`,
    entityStatus: "Active",
    gstRegistered: true,
    simulated: true,
  };
}
