# STATUS.md — Clinical Rotation Log

## What was built

`clinical-rotation-log-webapp` — an education-only web app for nursing students logging their own clinical rotations. Plain HTML/JS/CSS, zero dependencies, no accounts, no network calls; all data lives in the browser's localStorage.

Features:
- Rotation entries: date, unit (12 school-typical units), preceptor initials only (de-identified by validation — full names rejected), hours (0–24, fractional to 0.25)
- 24-item skills-practiced checklist per entry
- One-line reflection field (240-char cap)
- State-board hours-needed progress bar (default 500, user-editable, persisted)
- Searchable/filterable log with edit and delete
- Export/Import JSON for local backups
- Printable end-of-rotation summary: de-identified placeholders only ([Student Name], [Instructor Name], etc.), no patient data anywhere
- Disclaimers in the header banner, a dedicated notes section, and inside the printed summary
- Accessible markup: skip link, labels, aria-live status, keyboard focus styles

Design guardrails enforced in code (logic.js):
- Preceptor field limited to 6 characters, initials-only messaging; long "names" are rejected
- Skills outside the checklist are silently dropped
- Floating-point drift handled: 0.1 + 0.2 logs cleanly as 0.3

Sister projects: complements `nclex-style-quiz-trainer` and `new-nurse-first-year-guide`. From Asdale Dynamics, LLC — education only, never medical advice.

## How to run

- App: open `index.html` in any modern browser (double-click, or `file://` path). No install, no build.
- Tests (Node.js required): `node tests/run-tests.js`

## Verification results

- `node tests/run-tests.js` → **30 passed, 0 failed** (hours totals, progress/remaining, per-unit totals, validation including de-identification rejections, skills counts, summary placeholders)
- Headless Chrome load test (`google-chrome --headless --dump-dom` on `index.html`) → page loads with exit 0, renders 12 unit options, 24 skill checkboxes, progress bar initialized ("0 of 500 hours logged (0%)"), and zero JavaScript errors/uncaught exceptions in the DOM
- `node --check` passes on app.js, logic.js, and tests/run-tests.js
- One real bug was caught by tests and fixed: `hoursByUnit` started accumulating from `undefined` (NaN). Fixed with a `|| 0` seed; regression covered by test.

## Known gaps

- No CSP meta tag yet (static file hosting can add headers); no service-worker/offline caching
- Printable summary opens a new window — popup blockers require user permission
- localStorage quota errors are surfaced but there's no IndexedDB fallback
- Unit list is fixed; no custom unit input
- Tests cover the logic layer, not full browser click-through automation
- No tail-anchored "shift over midnight" handling — one entry = one workday
- Accessibility not formally audited (interpreted as: solid basics, no expert review yet)
