/* Clinical Rotation Log — UI layer. Data stays in localStorage on this device only. */
"use strict";

const STORE_KEY = "clinical-rotation-log.entries.v1";
const NEEDED_KEY = "clinical-rotation-log.hoursNeeded.v1";

const $ = id => document.getElementById(id);
const uid = () => "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

function esc(str) {
  const div = document.createElement("div");
  div.textContent = String(str == null ? "" : str);
  return div.innerHTML;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && typeof e === "object" && CLINICAL.validateEntry(e).ok);
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

function loadNeeded() {
  const raw = parseInt(localStorage.getItem(NEEDED_KEY), 10);
  return isFinite(raw) && raw > 0 ? raw : CLINICAL.HOURS_NEEDED;
}

function saveNeeded(n) {
  if (isFinite(n) && n > 0) localStorage.setItem(NEEDED_KEY, String(n));
}

/* ---------- Progress ---------- */

function updateProgress(entries) {
  const needed = loadNeeded();
  const total = CLINICAL.totalHours(entries);
  const pct = CLINICAL.progressPercent(entries, needed);
  const remaining = CLINICAL.hoursRemaining(entries, needed);

  $("hoursNeeded").value = needed;
  $("progressFill").style.width = pct + "%";
  $("progressBar").setAttribute("aria-valuenow", String(pct));
  $("progressLabel").textContent =
    `${CLINICAL.formatHours(total)} of ${CLINICAL.formatHours(needed)} hours logged (${pct}%)`;

  const enc = $("encouragement");
  if (total >= needed) {
    enc.textContent = "🎉 Required hours reached! Confirm your official total with your program — this log is for planning only.";
  } else if (total > 0) {
    enc.textContent = `${CLINICAL.formatHours(remaining)} hours to go. You've got this — one shift at a time.`;
  } else {
    enc.textContent = "Log your first shift to see progress.";
  }
}

/* ---------- Form ---------- */

function populateForm() {
  const unitSel = $("unit");
  unitSel.innerHTML = "";
  CLINICAL.SCHOOL_UNITS.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    unitSel.appendChild(opt);
  });

  const box = $("skillsChecklist");
  box.innerHTML = "";
  CLINICAL.SKILLS_CHECKLIST.forEach((skill, i) => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = skill;
    cb.id = "skill-" + i;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + skill));
    box.appendChild(label);
  });
  const dt = new Date();
  $("date").value = dt.toISOString().slice(0, 10);
}

let editingId = null;

function collectForm() {
  const skills = [];
  $("skillsChecklist").querySelectorAll("input:checked").forEach(cb => skills.push(cb.value));
  const entry = {
    id: editingId || uid(),
    date: $("date").value,
    unit: $("unit").value,
    hours: $("hours").value,
    preceptor: $("preceptor").value,
    skills,
    reflection: $("reflection").value
  };
  // Unit may have been typed as custom unit? (select-only keeps list clean)
  return CLINICAL.validateEntry(entry);
}

function showFormMsg(text, ok) {
  const el = $("formMsg");
  el.textContent = text;
  el.className = "form-msg " + (ok ? "ok" : "error");
}

function resetForm() {
  $("entryForm").reset();
  editingId = null;
  $("saveBtn").textContent = "Save Entry";
  $("date").value = new Date().toISOString().slice(0, 10);
  showFormMsg("", true);
}

/* ---------- Entries UI ---------- */

function render(entries) {
  const filter = ($("searchBox").value || "").toLowerCase();
  const list = $("entriesList");
  list.innerHTML = "";

  const sorted = [...entries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const visible = sorted.filter(e =>
    !filter ||
    (e.unit || "").toLowerCase().includes(filter) ||
    (e.reflection || "").toLowerCase().includes(filter) ||
    (e.date || "").includes(filter)
  );

  if (visible.length === 0) {
    $("emptyMsg").textContent = filter && entries.length > 0
      ? "No entries match that filter."
      : "No entries yet. Save your first rotation day above — everything stays on this device.";
  } else {
    $("emptyMsg").textContent = "";
  }

  visible.forEach(e => {
    const div = document.createElement("div");
    div.className = "entry";
    const tags = (e.skills || []).map(s => `<span class="skill-tag">${esc(s)}</span>`).join("");
    div.innerHTML = `
      <div class="entry-top">
        <div>
          <h3>${esc(e.unit)}</h3>
          <div class="date">${esc(e.date)}${e.preceptor ? " · Preceptor: " + esc(e.preceptor) : ""}</div>
        </div>
        <div class="hours-badge">${esc(CLINICAL.formatHours(e.hours))} hr${e.hours === 1 ? "" : "s"}</div>
      </div>
      ${tags ? `<div class="skill-tags">${tags}</div>` : ""}
      ${e.reflection ? `<p class="entry-msg">💭 ${esc(e.reflection)}</p>` : ""}
      <div class="row-actions">
        <button type="button" class="secondary icon-btn" data-action="edit" data-id="${esc(e.id)}">Edit</button>
        <button type="button" class="danger icon-btn" data-action="delete" data-id="${esc(e.id)}">Delete</button>
      </div>`;
    list.appendChild(div);
  });

  updateProgress(entries);
  return visible.length;
}

/* ---------- Handlers ---------- */

function onSubmit(e) {
  e.preventDefault();
  const result = collectForm();
  if (!result.ok) {
    showFormMsg(result.error, false);
    return;
  }
  let entries = loadEntries();
  if (editingId) {
    entries = entries.filter(x => x.id !== editingId);
  }
  entries.push(result.value);
  if (!saveEntries(entries)) {
    showFormMsg("Could not save to browser storage. Free up space or copy data via Export.", false);
    return;
  }
  showFormMsg(editingId ? "Entry updated." : "Entry saved. (Stored only in this browser.)", true);
  editingId = null;
  $("saveBtn").textContent = "Save Entry";
  render(entries);
  resetJustMsg();
}

function resetJustMsg() {
  // Ward off stale "saved" message by clearing the form-side feedback after a beat
  setTimeout(() => {
    if ($("formMsg").textContent.startsWith("Entry updated") || $("formMsg").textContent.startsWith("Entry saved")) {
      showFormMsg("", true);
    }
  }, 4000);
}

function startEdit(id) {
  const e = loadEntries().find(x => x.id === id);
  if (!e) return;
  editingId = id;
  $("date").value = e.date;
  $("unit").value = e.unit;
  $("hours").value = e.hours;
  $("preceptor").value = e.preceptor || "";
  $("reflection").value = e.reflection || "";
  $("skillsChecklist").querySelectorAll("input").forEach(cb => {
    cb.checked = (e.skills || []).includes(cb.value);
  });
  $("saveBtn").textContent = "Update Entry";
  window.scrollTo({ top: $("form-heading").offsetTop - 60, behavior: "smooth" });
}

function deleteEntry(id) {
  if (!confirm("Delete this entry? This cannot be undone.")) return;
  const entries = loadEntries().filter(x => x.id !== id);
  saveEntries(entries);
  render(entries);
  showFormMsg("Entry deleted.", true);
}

function exportJson() {
  const entries = loadEntries();
  const data = JSON.stringify({ app: "clinical-rotation-log", version: 1, entries }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "clinical-rotation-log_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(incoming)) throw new Error("Unexpected file shape");
      const merged = loadEntries();
      let added = 0;
      incoming.forEach(raw => {
        const v = CLINICAL.validateEntry(raw);
        if (v.ok && !merged.some(e => e.id === v.value.id)) {
          merged.push(v.value);
          added += 1;
        }
      });
      saveEntries(merged);
      render(merged);
      showFormMsg(`Imported ${added} entr${added === 1 ? "y" : "ies"}.`, added >= 0);
    } catch (err) {
      showFormMsg("Could not import file. Use a JSON previously exported from this app.", false);
    }
  };
  reader.readAsText(file);
}

/* ---------- Printable summary ---------- */

function printSummary() {
  const entries = loadEntries();
  const sum = CLINICAL.summaryData(entries, { hoursNeeded: loadNeeded() });
  const w = window.open("", "_blank");
  if (!w) {
    alert("Allow popups for this page to open the printable summary.");
    return;
  }
  const units = Object.entries(sum.hoursByUnit)
    .map(([u, h]) => `<tr><td>${esc(u)}</td><td>${esc(CLINICAL.formatHours(h))}</td></tr>`)
    .join("");
  const skillsRows = Object.entries(sum.skillCounts)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `<tr><td>${esc(s)}</td><td>${n}</td></tr>`)
    .join("");
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>End-of-Rotation Summary (De-Identified)</title>
  <style>
    body { font-family: Georgia, serif; margin: 40px; color: #111; line-height: 1.5; }
    h1 { font-size: 1.4rem; border-bottom: 2px solid #111; padding-bottom: 6px; }
    h2 { font-size: 1.05rem; margin-top: 22px; }
    table { border-collapse: collapse; width: 100%; max-width: 640px; }
    td, th { border: 1px solid #999; padding: 6px 10px; text-align: left; font-size: .95rem; }
    th { background: #eee; }
    .placeholder { background: #fff3cd; }
    .note { border: 2px solid #b91c1c; padding: 10px; margin-top: 24px; font-size: .9rem; }
    @media print { .no-print { display: none; } }
  </style></head><body>
  <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
  <h1>Clinical Rotation Summary — End of Rotation</h1>
  <p><strong>Student:</strong> <span class="placeholder">[Student Name]</span> &nbsp;
     <strong>Program:</strong> <span class="placeholder">[Nursing Program]</span></p>
  <p><strong>Clinical instructor to verify:</strong> <span class="placeholder">[Instructor Name — School / Contact]</span></p>
  <p><strong>Date range:</strong> ${esc(sum.dateRange)} · <strong>Entries:</strong> ${sum.rotationsCount}</p>
  <h2>Hours</h2>
  <table><tr><th>Total hours logged</th><td>${esc(CLINICAL.formatHours(sum.totalHours))}</td></tr>
  <tr><th>Hours needed (program requirement)</th><td>${esc(CLINICAL.formatHours(loadNeeded()))}</td></tr></table>
  <h2>Hours by Unit</h2>
  ${units ? `<table><tr><th>Unit</th><th>Hours</th></tr>${units}</table>` : "<p>None logged yet.</p>"}
  <h2>Skills Practiced (times checked)</h2>
  ${skillsRows ? `<table><tr><th>Skill</th><th>Count</th></tr>${skillsRows}</table>` : "<p>No skills checked yet.</p>"}
  <div class="note"><strong>Note:</strong> This summary contains NO patient information.
  All names above are placeholders to be completed by hand after printing.
  This document is an education record only — not medical advice and not an official transcript.
  Your school and state board of nursing retain the official hours record.</div>
  </body></html>`);
  w.document.close();
}

/* ---------- Wire up ---------- */

function init() {
  populateForm();
  $("hoursNeeded").value = loadNeeded();

  render(loadEntries());

  $("entryForm").addEventListener("submit", onSubmit);
  $("clearBtn").addEventListener("click", () => {
    resetForm();
    showFormMsg("Form cleared.", true);
    setTimeout(() => showFormMsg("", true), 2000);
  });
  $("hoursNeeded").addEventListener("input", e => {
    saveNeeded(parseInt(e.target.value, 10));
    updateProgress(loadEntries());
  });
  $("searchBox").addEventListener("input", () => render(loadEntries()));

  $("entriesList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "edit") startEdit(btn.dataset.id);
    if (btn.dataset.action === "delete") deleteEntry(btn.dataset.id);
  });

  $("exportBtn").addEventListener("click", exportJson);
  $("importFile").addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = "";
  });
  $("printBtn").addEventListener("click", printSummary);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
