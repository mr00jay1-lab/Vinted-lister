# Sprint Backlog

Pending work grouped by code-area impact. Work from top down unless user specifies otherwise.
Check `CHANGELOG.md [Unreleased]` table for full item descriptions.

---

## Sprint D — Bug Triage *(active)*
**Items:** #39, #40, #45
**Files touched:** `ui.js`, `settings.js`, `photos.js`

| # | What |
|---|------|
| 39 | Suggestions button missing from detail screen — button does not appear / is not rendered |
| 40 | AI Smart-Crop toggle in Settings is unresponsive — toggling the switch has no effect |
| 45 | Local storage not cleaned when an image is removed — deleting a photo leaves stale blob data |

**Note:** All user-facing broken features. Low risk, high value. Ship fast.

---

## Sprint E — State Architecture
**Items:** #36, #38, #37, #16, #46
**Files touched:** `state.js`, all consumers

| # | What |
|---|------|
| 36 | Split flat `appState` into `appState.data` / `.ui` / `.form` sub-objects |
| 38 | Extend setter pattern to remaining high-frequency fields (`filter`, `pendingPhotos`, `isEditing`, `dirty`) |
| 37 | Normalise data at `dbGet` boundary — `thumbnail` should never be `null` when callers receive an item |
| 16 | Replace 3 photo-mode flags (`replacingItem`, `addingMorePhotos`, `isEditing`) with a single `photoContext` enum |
| 46 | Remove `archived` item state — `deleted` is sufficient; remove all references from state, storage, and UI |

**Note:** #36 and #38 are coupled — do together. #37 and #16 benefit from #36 first. #46 is a small cleanup that fits here to avoid a one-item sprint. #16 is the biggest refactor; do last.

---

## Sprint F — HTML Structure
**Items:** #17
**Files touched:** `index.html`, `ui.js`

| # | What |
|---|------|
| 17 | Move detail screen form fields from JS template strings (`renderDetail` in `ui.js`) to static HTML in `index.html`; `renderDetail` then just populates values |

**Note:** Medium effort, low risk — purely structural, no logic change. Safer after state is stable (field set is known).

---

## Sprint G — Global Decoupling
**Items:** #34, #35
**Files touched:** `index.html`, `main.js`, all JS files

| # | What |
|---|------|
| 34 | Remove `Object.assign(window, exposed)` — replace all inline `onclick=` attributes with `addEventListener` bindings in JS modules |
| 35 | Decouple cross-layer calls — `actions.js` / `photos.js` should not call `renderDetail` / `showScreen` / `goHome` directly; introduce event bus or strict unidirectional flow |

**Note:** High effort, high risk. #34 and #35 must be done together. Do after E (state) and F (HTML) are settled to minimise churn on event bindings.

---

## Sprint H — API Security
**Items:** #32
**Files touched:** new `/api/analyse.js` (Vercel serverless), `analysis.js`

| # | What |
|---|------|
| 32 | Move Anthropic API call to a Vercel serverless function (`/api/analyse`) — API key stored as Vercel env var, never exposed to the browser |

**Note:** Independent of other sprints but gates the AI Prompt Editor (Sprint I). `analysis.js` `requestAIAnalysis()` becomes a `fetch('/api/analyse', ...)` call.

---

## Sprint I — AI Prompt Editor
**Items:** #41, #42
**Files touched:** `settings.js`, `index.html`, `analysis.js`

| # | What |
|---|------|
| 41 | Split the AI prompt into individual single-line inputs (one concept per line); backend merges into a single prompt before sending to the API |
| 42 | Group AI prompt inputs into labelled sections — Persona, Title, Description, Image Inspection — each with its own configurable constraints |

**Note:** #42 is a direct extension of #41 — do together. Requires Sprint H (serverless) to be live first.

---

## Sprint J — Photos UX
**Items:** #43, #44
**Files touched:** `photos.js`, `ui.js`, `state.js`

| # | What |
|---|------|
| 43 | Photo reorder — user can drag photos into a different order; image 1 becomes the item thumbnail; order auto-saves on drop |
| 44 | Sequential photo slot reveal — only one empty (+) slot shown at a time; slot N+1 reveals once slot N is filled |

**Note:** Both photo interaction features, naturally paired. Requires `photoContext` enum (#16 from Sprint E) to be in place.

---

## Completed Sprints (for reference)

| Sprint | Items | Released |
|--------|-------|---------|
| A — AI Smart-Crop stabilisation | #25, #26, #27, #28, #30, #31 | v1.5 |
| B — Settings screen + smart-crop toggle | #24, #29 | v1.5 |
| C — Batch analysis photo selection | #33 | v1.5 |
| v1.4 fixes | #21, #22, #23, #15, #18, #19, #20 | v1.4 |
