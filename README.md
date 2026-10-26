# Clinical Rotation Log

A friendly, education-only web app for nursing students to log their own clinical rotations. Plain HTML/JS/CSS, zero dependencies, all data stays in your browser's localStorage.

Part of the beginner-friendly education family from [Asdale Dynamics, LLC](https://dylanasdale.github.io), alongside *nclex-style-quiz-trainer* and *new-nurse-first-year-guide*.

## Important: education only, never medical advice

This is a personal study notebook. It is **not** medical advice, not a clinical or compliance tool, and not an official hours record — your school and state board of nursing keep the official records.

**No patient details, ever.** The form is designed for de-identification: the preceptor field holds initials only (enforced by validation), and the printable summary uses placeholders like `[Student Name]` to be filled in by hand after printing. Never enter patient names, DOBs, room numbers, diagnoses, or any other patient information — you're responsible for HIPAA compliance and your school's policies.

## What it does

- **Rotation day entries** — date, unit (Med-Surg, ICU, ED, OB, Peds, Psych, and more), preceptor initials, hours
- **Skills checklist** — 24 common student skills (vitals, assessments, med passes, IVs, wound care, SBAR handoff…) checked per day
- **One-line reflection** — a nudging prompt, capped at 240 characters
- **Progress bar** — compare your logged hours against the hours your state board's requirement needs (default 500, editable)
- **Filterable log** — search by unit, date, or reflection; edit or delete any entry
- **Export/Import JSON** — local file backup (localStorage can be wiped by clearing browser data)
- **Printable end-of-rotation summary** — de-identified placeholders only, ready to print or save as PDF and complete by hand
- **Disclaimers everywhere** — banner up top, a notes section, and a warning baked into the printable summary

## How to run

No install, no build step, no account:

1. Download or clone this folder
2. Open `index.html` in any modern browser (double-click it)

To run the logic tests (Node.js required):

```
node tests/run-tests.js
```

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Single-page app |
| `styles.css` | Styling (accessible, responsive) |
| `logic.js` | All data logic — pure functions, no DOM, unit-testable |
| `app.js` | UI layer — rendering, forms, localStorage, print summary |
| `tests/run-tests.js` | 30 tests for hours totals, progress, validation, summary |

## Privacy

- Everything is stored in your browser's localStorage on your device
- No network calls, no analytics, no accounts, no tracking
- Clearing browser data erases your log — export JSON for backups

## Credits

Built by **Asdale Dynamics, LLC** — healthcare-worker AI aids and education tools, education only, never medical advice. See Dylan Asdale's hub at [dylanasdale.github.io](https://dylanasdale.github.io).

Licensed under the [MIT License](LICENSE).
