/** Standalone ABN checksum checks for CI — mirrors lib/abn.ts. */

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

function digitsOnlyAbn(value) {
  return value.replace(/\s/g, "");
}

function isValidAbnChecksum(abn) {
  const digits = digitsOnlyAbn(abn);
  if (!/^\d{11}$/.test(digits)) return false;
  const nums = digits.split("").map((d) => parseInt(d, 10));
  nums[0] -= 1;
  const sum = nums.reduce((acc, n, i) => acc + n * WEIGHTS[i], 0);
  return sum % 89 === 0;
}

function formatAbn(abn) {
  const digits = digitsOnlyAbn(abn);
  if (digits.length !== 11) return abn.trim();
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

const validAbns = ["51824753556", "53004085616", "33051775556"];
for (const abn of validAbns) {
  if (!isValidAbnChecksum(abn)) throw new Error(`${abn} should pass checksum`);
  if (digitsOnlyAbn(formatAbn(abn)) !== abn) throw new Error(`${abn} format round-trip failed`);
}

const invalidAbns = ["12345678901", "51824753557"];
for (const abn of invalidAbns) {
  if (isValidAbnChecksum(abn)) throw new Error(`${abn} should fail checksum`);
}

console.log("abn checks passed");
