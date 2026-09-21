/**
 * Lightweight checks for Add company / ABN (Iapetus).
 * Run: node --experimental-strip-types scripts/verify-abn.ts
 */
import assert from "node:assert/strict";
import {
  describeAbrLookup,
  isValidAbnChecksum,
  looksLikeAbnQuery,
  validateAbnField,
} from "../lib/abn.ts";

const ATO_EXAMPLE = "51 824 753 556";

assert.equal(isValidAbnChecksum(ATO_EXAMPLE), true, "ATO example ABN checksum");
assert.equal(isValidAbnChecksum("51824753556"), true);
assert.equal(isValidAbnChecksum("51 824 753 557"), false);

assert.equal(validateAbnField(""), null);
assert.equal(validateAbnField("   "), null);
assert.equal(validateAbnField("", true), "Enter an ABN.");
assert.equal(validateAbnField("123"), "That ABN needs 11 digits. Spaces are fine.");
assert.equal(
  validateAbnField("51 824 753 557"),
  "That ABN does not look right. Check the 11 digits and try again."
);
assert.equal(validateAbnField(ATO_EXAMPLE), null);

assert.equal(looksLikeAbnQuery("51824753556"), true);
assert.equal(looksLikeAbnQuery("Cedar & Pine Trust"), false);

const practice = describeAbrLookup(false, true);
assert.equal(practice.live, false);
assert.match(practice.searchHelp, /practice register/i);
assert.doesNotMatch(practice.selected, /Australian Business Register/);
assert.doesNotMatch(practice.matchFooter, /Australian Business Register/);
assert.doesNotMatch(practice.typeaheadHint, /Australian Business Register/);

const live = describeAbrLookup(true, false);
assert.equal(live.live, true);
assert.match(live.searchHelp, /Australian Business Register/);

const liveDown = describeAbrLookup(true, true);
assert.equal(liveDown.live, false);
assert.doesNotMatch(liveDown.matchFooter, /Australian Business Register/);
assert.doesNotMatch(liveDown.selected, /Australian Business Register/);

const unconfiguredLiveFlag = describeAbrLookup(false, false);
assert.equal(unconfiguredLiveFlag.live, false);
assert.doesNotMatch(unconfiguredLiveFlag.selected, /Australian Business Register/);

console.log("verify-abn: ok");
