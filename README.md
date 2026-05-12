# Tactics Cup — Grade 8 PE

A live scoring tournament for a 9-lesson Grade 8 Physical Education unit at FIS. Six classes compete across three blocks of three lessons each (May 18 – Jun 19, 2026). Teachers log scores from any device; students see a live leaderboard on the gym screen.

This README is also a briefing for **Claude Code** to pick up the project. Read this whole file first, then look at `SETUP.md` for the manual setup steps that need automating.

---

## The unit at a glance

**Theme:** "Tactics Lab" — students investigate, invent, and apply tactics across three movement domains.

**Structure:**
- **Block 1** (L1–L3): Attack & Defend Territory — invasion games
- **Block 2** (L4–L6): Eliminate & Protect — target games
- **Block 3** (L7–L9): Outwit Your Opponent — net/wall, 1v1, small-side

**Lesson rhythm per block:** L1 Secret Tactic Cards → L2 Tactic Inventor → L3 Coached Games

**Team structure:** 4 fixed colored teams per class (Yellow, Red, Blue, Green). Members reshuffle at the start of each block but colors persist across all 9 lessons.

**Tournament structure:** Each PE class competes as a single team in the grade-wide "Tactics Cup." Max 30 points per class per lesson:
- **Game points** (max 10): (total team wins ÷ total team games) × 10
- **Spirit Award** (+5): 1 per class per lesson, awarded by teacher
- **Tactical Award** (+5): 1 per class per lesson
- **Active Participation Awards** (+5 each, max 2): 2 per class per lesson

All awards are **optional** — given only if observed.

---

## The 6 classes and 4 teachers

| Class    | Teacher      |
|----------|--------------|
| 8(5A)    | Teacher 1    |
| 8(5B)    | Teacher 1    |
| 8(6A)    | Teacher 2    |
| 8(6B)    | Teacher 2    |
| 8(56A)   | Teacher 3    |
| 8(56C)   | Teacher 4    |

**Pair partnerships** (built into the schedule, drive the rivalry narrative):
- 8(5A) ↔ 8(5B)
- 8(6A) ↔ 8(6B)
- 8(56A) ↔ 8(56C)

---

## The schedule (baked into the HTML)

School runs an 8-day rotating cycle (letter days A–H). Each class has 3 practical PE slots per cycle + 1 Health slot (Health is excluded from the Tactics Cup).

Unit dates: **Mon May 18 – Fri Jun 19, 2026**. Skipped: Mon May 25, Thu Jun 4.

Per class, 3 slots in the cycle:

```
8(5A):  C·P1   G·P2   E·P6
8(5B):  C·P1   A·P5   E·P6
8(6A):  G·P1   C·P2   D·P4a
8(6B):  C·P2   H·P3   D·P4a
8(56A): D·P3   E·P5   A·P6
8(56C): D·P3   H·P4a  E·P5
```

Of 18 practical slots in the cycle, **12 are parallel** (paired classes in the same gym) and **6 are solo** (one class in gym, partner is in Health).

The full calendar of 54 lesson dates (6 classes × 9 lessons) is computed from these slots and baked into both HTML files. If the unit dates ever change, regenerate by following the logic in `apps_script.gs` and the `SCHEDULE` constant in the HTML files.

---

## What's in this repo

| File | What it is |
|------|------------|
| `apps_script.gs` | Backend code. Lives inside a Google Sheet as Apps Script. Exposes a GET/POST web API for reading and writing lesson scores. |
| `teacher_dashboard_v4.html` | The teacher-facing UI. Single-screen grid with all 6 classes × 9 lessons. Click any cell to score. Writes through to the Apps Script with debounced batched saves. |
| `student_leaderboard_v2.html` | Big-screen gym display. Dark sports-broadcast aesthetic. Shows overall standings, three pair rivalries, and a recent-awards ticker. Auto-refreshes every 30s. |
| `SETUP.md` | The step-by-step manual setup guide (Sheet + Apps Script + GitHub Pages). Claude Code's job is to automate as much of this as possible. |
| `tactics_lab_unit_plan.docx` | The formal unit plan document, in the FIS template style. **Note:** written as Grade 9 originally — needs manual find-and-replace to Grade 8. |
| `tactics_cup_scoring.xlsx` | Backup spreadsheet scoring system. Has a 6-tab structure with leaderboard, score log, class detail. The Apps Script is the live source of truth now, but this is useful as a reference/recovery tool. **Note:** uses an old additive game-points formula, superseded by the win-% × 10 formula now used in the HTML and Apps Script. |

---

## Architecture

```
┌──────────────────────┐         ┌────────────────────────┐
│ teacher_dashboard.html│ POST   │                        │
│ (one per teacher)     │ ─────▶ │  Apps Script           │
│                       │         │  (lives in Google     │
│                       │ ◀───── │   Sheet, deployed as   │
│ student_leaderboard   │ GET    │   Web App)             │
│ (gym screen)          │         │                        │
└──────────────────────┘         └──────────┬─────────────┘
                                            │
                                            ▼
                                  ┌──────────────────┐
                                  │ Google Sheet     │
                                  │ "Scores" tab     │
                                  │ 54 rows          │
                                  └──────────────────┘
```

- **Data lives in the Google Sheet.** 54 rows (6 classes × 9 lessons), one row per lesson.
- **The Apps Script is the API.** It handles GET (read all scores) and POST (update one or many).
- **Both HTML pages point at the same Apps Script Web App URL.** That URL is pasted into a `const API_URL` at the top of the `<script>` block in each HTML file.
- **Hosted on GitHub Pages** (or anywhere static). Teachers and the gym screen open via URL.

### Performance characteristics

- Teacher dashboard uses **debounced batched saves**: rapid clicks coalesce into a single backend call ~500ms after the last click. Multiple lessons updated in succession go in one `updateMany` request.
- Apps Script uses **deterministic row lookup** (row index computed from key, no linear scan).
- Status indicator shows "Saving…" → "Saved" within ~1 second of last click.
- On network failure: exponential-backoff retry (1s → 2s → 4s, max 3 tries) before surfacing as "Unsaved — N change(s) pending".
- Closing the tab while changes are still pending triggers a browser "Leave site?" warning.
- localStorage is used as a fallback safety net even when backend is configured.

---

## Setup tasks for Claude Code

The manual `SETUP.md` walks a human through ~25 minutes of clicking. Your job: automate as much as possible. Suggested flow:

1. **Install dependencies:**
   - `clasp` (Google's Apps Script CLI): `npm install -g @google/clasp`
   - `gh` (GitHub CLI): check if already installed; if not, install per OS

2. **Authenticate:**
   - `clasp login` — opens a browser, user clicks "Allow"
   - `gh auth login` — interactive flow

3. **Create the Google Sheet:**
   - Use `clasp create --type sheets --title "Tactics Cup Backend"`
   - This creates both a new Sheet AND an Apps Script project bound to it
   - The Sheet ID and Script ID will be in the resulting `.clasp.json`

4. **Push the Apps Script:**
   - Copy `apps_script.gs` to `Code.gs` in the clasp project directory
   - `clasp push`

5. **Initialize the Sheet structure:**
   - Run the `setup()` function in the script to create the Scores tab with 54 rows
   - Either use `clasp run setup` (requires extra setup with a Cloud Project) OR walk the user through doing it manually once in the Apps Script editor

6. **Deploy as Web App:**
   - `clasp deploy --description "Tactics Cup API"`
   - **Important:** the deployment will be created but with default access settings. The user needs to manually adjust "Who has access" to "Anyone" via the Apps Script web UI the first time — this isn't possible through `clasp` for unverified apps.
   - Capture the Web App URL from the deployment output

7. **Inject the URL into both HTML files:**
   - Find-replace `const API_URL = '';` with `const API_URL = '<the URL>';` in both `teacher_dashboard_v4.html` and `student_leaderboard_v2.html`

8. **Push to GitHub Pages:**
   - `gh repo create tactics-cup --public --source=. --push`
   - Enable GitHub Pages: `gh api repos/:owner/tactics-cup/pages -f source[branch]=main -f source[path]=/`
   - Give the user the two URLs (one per HTML file)

9. **Sanity-check:**
   - Open the teacher dashboard URL, verify status indicator shows "Saved" (green)
   - Click a cell, verify the Sheet row updates
   - Open the leaderboard URL, verify it pulls the same data

### Known limitations & gotchas

- **Apps Script "unverified app" warnings:** the first time anyone authorizes the deployed Web App, they get a "Google hasn't verified this app" screen. They have to click "Advanced → Go to (unsafe)" to continue. This is normal for unpublished personal scripts. Cannot be bypassed.
- **`clasp` cannot set deployment access to "Anyone":** that has to be done once in the Apps Script web UI. If you can find a workaround via `gas` API directly, great, but plan for the manual step.
- **Apps Script execution quota:** 90 minutes/day of total execution time on the free tier. Won't hit it at this usage volume.
- **CORS:** the Apps Script Web App handles CORS automatically when deployed with "Anyone" access. The HTML uses `Content-Type: text/plain;charset=utf-8` on POST to avoid preflight.

---

## What's still pending (post-launch)

These were planned but not built yet — Grade 8 unit deliverables that go alongside the dashboards:

- **Voting Form** — Google Form for students to pick games per block
- **Wall Planner template** — A3 flipchart layout per class per block (Tactics Received → Tactics Invented → Tactics That Worked + AP self-assessment grid)
- **Daily Exit Ticket** — quick AP self-assessment + tactic note at end of each lesson
- **Tactic Cards** — printable card sets used in L1 of each block (the "Secret Tactic Cards" mechanism)
- **Assessment Rubric** — K/S/C criteria, 1-7 scale, aligned to FIS standards S3/S4/C1/C2 primary + S1/K5 secondary
- **Synthesis Task** — C2 culminating piece for L9

If you finish the technical setup with time to spare, ask the user which of these to tackle.

---

## A note on the unit plan docx

The `tactics_lab_unit_plan.docx` was generated when the unit was still being designed as Grade 9. The user wants it changed to Grade 8 but has been doing it manually. If you're touching it programmatically, do find-replace:
- "Grade 9" → "Grade 8"
- Any "G9" references → "G8"

Use `python-docx` or similar; do not regenerate from scratch as the FIS template formatting is hand-tuned.

---

## Contact / context

The user is **Scott Bain**, Grade 8 PE teacher at Frankfurt International School. He's already comfortable with Claude Code from a prior project (grading student fitness assignments with photo-based input). He prefers direct, action-oriented Claude responses and doesn't like guided multiple-choice questions when he wants to give freeform input. When in doubt, just do the thing and ask if it didn't work.
