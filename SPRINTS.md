# Sprint Backlog

Pending work grouped by code-area impact. Work from top down unless user specifies otherwise.
Check `CHANGELOG.md [Unreleased]` table for full item descriptions.

---

## Sprint D — State Architecture
**Items:** #36, #38, #37, #16
**Files touched:** `state.js`, all consumers

| # | What |
|---|------|
| 36 | Split flat `appState` into `appState.data` / `.ui` / `.form` sub-objects |
| 38 | Extend setter pattern to remaining high-frequency fields (`filter`, `pendingPhotos`, `isEditing`, `dirty`) |
| 37 | Normalise data at `dbGet` boundary — `thumbnail` should never be `null` when callers receive an item |
| 16 | Replace 3 photo-mode flags (`replacingItem`, `addingMorePhotos`, `isEditing`) with a single `photoContext` enum |

**Note:** #36 and #38 are coupled — do together. #37 is independent but benefits from #36 being done first. #16 is the biggest refactor; do last.

---

## Sprint E — HTML Template Migration
**Items:** #17
**Files touched:** `index.html`, `ui.js`

| # | What |
|---|------|
| 17 | Move detail screen form fields from JS template strings (`renderDetail` in `ui.js`) to static HTML in `index.html`; `renderDetail` then just populates values |

**Note:** Medium effort but low risk — purely structural, no logic change.

---

## Sprint F — API Security
**Items:** #32
**Files touched:** new `/api/analyse.js` (Vercel serverless), `analysis.js`

| # | What |
|---|------|
| 32 | Move Anthropic API call to a Vercel serverless function (`/api/analyse`) — API key stored as Vercel env var, never exposed to the browser |

**Note:** Requires Vercel env var setup. `analysis.js` `requestAIAnalysis()` becomes a `fetch('/api/analyse', ...)` call. The Settings screen API key input would be removed or repurposed for a user-facing token if needed.

---

## Phase 2 — Global Architecture Refactor
**Items:** #34, #35
**Files touched:** `index.html`, `main.js`, all JS files

| # | What |
|---|------|
| 34 | Remove `Object.assign(window, exposed)` — replace all inline `onclick=` attributes with `addEventListener` bindings in JS modules |
| 35 | Decouple cross-layer calls — `actions.js` / `photos.js` should not call `renderDetail` / `showScreen` / `goHome` directly; introduce event bus or strict unidirectional flow |

**Note:** High effort, high risk. Do after D, E, F. #34 and #35 must be done together — fixing one without the other leaves the architecture inconsistent.

---

## Completed Sprints (for reference)

| Sprint | Items | Released |
|--------|-------|---------|
| A — AI Smart-Crop stabilisation | #25, #26, #27, #28, #30, #31 | v1.5 |
| B — Settings screen + smart-crop toggle | #24, #29 | v1.5 |
| C — Batch analysis photo selection | #33 | v1.5 |
| v1.4 fixes | #21, #22, #23, #15, #18, #19, #20 | v1.4 |
