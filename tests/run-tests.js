/* Tests for hours-totals and validation logic. Run: node tests/run-tests.js */
"use strict";
const assert = require("assert");
const CLINICAL = require("../logic.js");

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log("  ok - " + name); }
  catch (e) { failed++; console.error("  FAIL - " + name + ": " + e.message); }
}

function entry(hours, extra) {
  return Object.assign({
    id: "x", date: "2026-10-01", unit: "Med-Surg", hours,
    preceptor: "JD", skills: [], reflection: ""
  }, extra || {});
}

console.log("Hours totals");

t("empty array totals 0", () => {
  assert.strictEqual(CLINICAL.totalHours([]), 0);
});
t("single entry totals its hours", () => {
  assert.strictEqual(CLINICAL.totalHours([entry(8)]), 8);
});
t("multiple entries sum correctly", () => {
  assert.strictEqual(CLINICAL.totalHours([entry(8), entry(6), entry(4.5)]), 18.5);
});
t("floating point drift is fixed (0.1 + 0.2 = 0.3)", () => {
  assert.strictEqual(CLINICAL.totalHours([entry(0.1), entry(0.2)]), 0.3);
});
t("non-array input returns 0", () => {
  assert.strictEqual(CLINICAL.totalHours(null), 0);
});
t("bad hour values are ignored", () => {
  assert.strictEqual(CLINICAL.totalHours([entry(5), entry("abc"), entry(undefined)]), 5);
});

console.log("Progress & remaining");

t("progress 0% with empty log", () => {
  assert.strictEqual(CLINICAL.progressPercent([], 500), 0);
});
t("progress 50% at 250/500", () => {
  assert.strictEqual(CLINICAL.progressPercent([entry(250)], 500), 50);
});
t("progress caps at 100%", () => {
  assert.strictEqual(CLINICAL.progressPercent([entry(600)], 500), 100);
});
t("progress is one decimal (e.g. 12.5%)", () => {
  assert.strictEqual(CLINICAL.progressPercent([entry(62.5)], 500), 12.5);
});
t("progress uses default needed when omitted", () => {
  assert.strictEqual(CLINICAL.progressPercent([entry(500)]), 100);
});
t("hours remaining is clamped at 0", () => {
  assert.strictEqual(CLINICAL.hoursRemaining([entry(600)], 500), 0);
});
t("hours remaining rounds to 2 decimals", () => {
  assert.strictEqual(CLINICAL.hoursRemaining([entry(12.33)], 500), 487.67);
});

console.log("Hours by unit");

t("groups hours by unit", () => {
  const byUnit = CLINICAL.hoursByUnit([entry(8), entry(4, { unit: "ICU" }), entry(2, { unit: "Med-Surg" })]);
  assert.deepStrictEqual(byUnit, { "Med-Surg": 10, "ICU": 4 });
});

console.log("Validation");

t("valid entry passes", () => {
  const r = CLINICAL.validateEntry(entry(8));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.hours, 8);
});
t("missing date rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(8, { date: "" })).ok, false);
});
t("malformed date rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(8, { date: "10/01/26" })).ok, false);
});
t("missing unit rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(8, { unit: "" })).ok, false);
});
t("zero hours rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(0)).ok, false);
});
t("negative hours rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(-3)).ok, false);
});
t("hours over 24 rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(30)).ok, false);
});
t("fractional hours allowed and rounded to 2 dp", () => {
  const r = CLINICAL.validateEntry(entry(7.5));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.hours, 7.5);
});
t("preceptor initials ok", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(8, { preceptor: "JMK" })).ok, true);
});
t("long preceptor name rejected (de-identification)", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(8, { preceptor: "Jamie Connors" })).ok, false);
});
t("reflection over 240 chars rejected", () => {
  assert.strictEqual(CLINICAL.validateEntry(entry(8, { reflection: "x".repeat(241) })).ok, false);
});
t("skills outside checklist are dropped", () => {
  const r = CLINICAL.validateEntry(entry(8, { skills: ["Vital signs", "Made-up skill"] }));
  assert.deepStrictEqual(r.value.skills, ["Vital signs"]);
});

console.log("Skills & summary");

t("skill counts across entries", () => {
  const counts = CLINICAL.skillCounts([entry(8, { skills: ["Vital signs"] }), entry(6, { skills: ["Vital signs", "IV insertion / maintenance"] })]);
  assert.strictEqual(counts["Vital signs"], 2);
  assert.strictEqual(counts["IV insertion / maintenance"], 1);
  assert.strictEqual(counts["Trach / suctioning"], 0);
});
t("summary placeholders only (no real names)", () => {
  const sum = CLINICAL.summaryData([entry(8)]);
  assert.strictEqual(sum.studentName, "[Student Name]");
  assert.strictEqual(sum.programName, "[Nursing Program]");
});
t("dateRange spans first to last date", () => {
  const range = CLINICAL.dateRange([entry(8), entry(6, { date: "2026-03-02" })]);
  assert.strictEqual(range, "2026-03-02 through 2026-10-01");
});
t("dateRange with empty log", () => {
  assert.strictEqual(CLINICAL.dateRange([]), "No rotations logged");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
