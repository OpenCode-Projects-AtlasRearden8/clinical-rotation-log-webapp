/* Clinical Rotation Log — pure logic, no DOM. Testable with Node or browser. */
"use strict";

const CLINICAL = {};

CLINICAL.SKILLS_CHECKLIST = [
  "Vital signs",
  "Head-to-toe assessment",
  "Hand hygiene / infection control",
  "Medication administration (oral)",
  "Medication administration (injection)",
  "IV insertion / maintenance",
  "IV push / piggyback meds",
  "Wound care / dressing changes",
  "Foley catheter insertion / care",
  "NG tube care",
  "Trach / suctioning",
  "Oxygen therapy",
  "Blood glucose monitoring",
  "Specimen collection",
  "Patient education (de-identified)",
  "Care plan / charting practice",
  "Handoff report (SBAR)",
  "BLS / CPR practice",
  "Code / rapid response observation",
  "Fall prevention / safety",
  "Mobility / ambulation assistance",
  "Feeding / nutrition support",
  "Pain management support",
  "Admission / discharge process"
];

CLINICAL.HOURS_NEEDED = 500;

CLINICAL.SCHOOL_UNITS = [
  "Med-Surg",
  "Telemetry",
  "ICU",
  "ED",
  "OB / L&D",
  "Pediatrics",
  "Psych / Behavioral",
  "OR",
  "Long-Term Care / Rehab",
  "Community / Public Health",
  "Leadership / Capstone",
  "Other"
];

/* ---------- Validation ---------- */

// Returns { ok: true, value } or { ok: false, error: "message" }
CLINICAL.validateEntry = function (entry) {
  if (!entry || typeof entry !== "object") {
    return { ok: false, error: "Entry is required." };
  }
  const date = String(entry.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Please pick a valid date." };
  }
  const unit = String(entry.unit || "").trim();
  if (!unit) return { ok: false, error: "Unit is required." };
  let hours = Number(entry.hours);
  if (!isFinite(hours)) return { ok: false, error: "Hours must be a number." };
  hours = Math.round(hours * 100) / 100;
  if (hours <= 0) return { ok: false, error: "Hours must be greater than 0." };
  if (hours > 24) return { ok: false, error: "A shift over 24 hours? Check that number." };
  const preceptor = String(entry.preceptor || "").trim();
  // De-identification guard: initials only, max 6 chars (e.g. "JD", "JD+SM")
  if (preceptor && preceptor.length > 6) {
    return { ok: false, error: "Preceptor initials only — no full names (de-identification)." };
  }
  if (preceptor && /[\s]{2,}|,|;/.test(preceptor) && preceptor.length > 3) {
    return { ok: false, error: "Preceptor initials only — no full names (de-identification)." };
  }
  const skills = Array.isArray(entry.skills) ? entry.skills.filter(s => CLINICAL.SKILLS_CHECKLIST.includes(s)) : [];
  const reflection = String(entry.reflection || "").trim();
  if (reflection.length > 240) {
    return { ok: false, error: "Reflection is one line — 240 characters max." };
  }
  return {
    ok: true,
    value: {
      id: entry.id || CLINICAL.makeId(),
      date,
      unit,
      preceptor,
      hours,
      skills,
      reflection,
      createdAt: entry.createdAt || new Date().toISOString()
    }
  };
};

CLINICAL.makeId = function () {
  return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
};

/* ---------- Totals ---------- */

CLINICAL.totalHours = function (entries) {
  if (!Array.isArray(entries)) return 0;
  const sum = entries.reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
  // Round to 2 decimals to avoid floating-point drift (0.1 + 0.2 problem)
  return Math.round(sum * 100) / 100;
};

CLINICAL.hoursByUnit = function (entries) {
  const byUnit = {};
  (entries || []).forEach(e => {
    const u = String(e.unit || "Other");
    byUnit[u] = Math.round(((byUnit[u] || 0) + (Number(e.hours) || 0)) * 100) / 100;
  });
  return byUnit;
};

CLINICAL.progressPercent = function (entries, hoursNeeded) {
  const needed = Number(hoursNeeded) || CLINICAL.HOURS_NEEDED;
  const pct = (CLINICAL.totalHours(entries) / needed) * 100;
  if (!isFinite(pct) || pct < 0) return 0;
  return Math.min(100, Math.round(pct * 10) / 10);
};

CLINICAL.hoursRemaining = function (entries, hoursNeeded) {
  const needed = Number(hoursNeeded) || CLINICAL.HOURS_NEEDED;
  const remaining = needed - CLINICAL.totalHours(entries);
  return Math.max(0, Math.round(remaining * 100) / 100);
};

/* ---------- Skills summary ---------- */

CLINICAL.skillCounts = function (entries) {
  const counts = {};
  CLINICAL.SKILLS_CHECKLIST.forEach(s => { counts[s] = 0; });
  (entries || []).forEach(e => {
    (e.skills || []).forEach(s => {
      if (counts[s] === undefined) counts[s] = 0;
      counts[s] += 1;
    });
  });
  return counts;
};

/* ---------- De-identified printable summary ---------- */

CLINICAL.summaryData = function (entries, opts) {
  const opts2 = opts || {};
  return {
    studentName: "[Student Name]",
    programName: "[Nursing Program]",
    dateRange: CLINICAL.dateRange(entries),
    totalHours: CLINICAL.totalHours(entries),
    hoursByUnit: CLINICAL.hoursByUnit(entries),
    skillCounts: CLINICAL.skillCounts(entries),
    rotationsCount: Array.isArray(entries) ? entries.length : 0,
    instructorLine: "[Instructor Name] — [School / Contact]",
    note: "This summary contains NO patient information. All names are placeholders to be filled in by hand. Education record only — not medical advice."
  };
};

CLINICAL.dateRange = function (entries) {
  if (!Array.isArray(entries) || entries.length === 0) return "No rotations logged";
  const dates = entries.map(e => String(e.date)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length === 0) return "No rotations logged";
  return dates[0] + " through " + dates[dates.length - 1];
};

CLINICAL.formatHours = function (n) {
  const num = Number(n) || 0;
  return (Math.round(num * 100) / 100) % 1 === 0 ? String(num) : num.toFixed(2).replace(/0$/, "");
};

/* Export for Node tests / browser */
if (typeof module !== "undefined" && module.exports) {
  module.exports = CLINICAL;
} else {
  window.CLINICAL = CLINICAL;
}
