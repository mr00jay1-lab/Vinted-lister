# Changelog

All notable changes to Vinted Lister are documented here.

---

## [Unreleased] — dev

| # | Description | Status |
|---|-------------|--------|
| 16 | **Arch:** Replace 3 photo-mode flags (`replacingItem`, `addingMorePhotos`, `isEditing`) with a single `photoContext` enum (`'new'\|'replace'\|'addMore'\|'edit'`) — currently set/cleared in 13 places across 2 files | In dev |
| 17 | **Arch:** Move detail screen form fields from JS template strings (`ui.js:256`) to static HTML in `index.html` — currently impossible to find by searching HTML; changing fields requires editing JS | Raised |
| 32 | **Arch:** API key called directly from the browser — key is visible in the network tab to anyone who opens devtools; move analysis calls to a Vercel serverless function (`/api/analyse`) to keep the key server-side | Raised |
| 34 | **Arch:** Global scope pollution via `Object.assign(window, exposed)` in `main.js` — all module functions dumped onto `window` to support inline `onclick` attributes; directly caused the `backFromAddPhotos` double-definition bug; fix is to remove inline `onclick` and bind events in JS via `addEventListener` | Raised |
| 35 | **Arch:** Cross-layer coupling — `actions.js` and `photos.js` call UI functions (`renderDetail`, `showScreen`, `goHome`) directly; a change to any UI function can cascade into data logic; decouple via a simple event bus or strict unidirectional flow (data layer updates state → UI layer reads and renders) | Raised |
| 36 | **Arch:** `appState` is a flat object mixing DB data (`items`, `currentItem`), navigation state (`filter`, `copyPage`, `isEditing`), and temporary form data (`pendingPhotos`, `replacingItem`); splitting into `appState.data` / `appState.ui` / `appState.form` sub-objects would make selective resets and debugging significantly easier | In dev |
| 37 | **Arch:** DB boundary has no data normalization — `thumbnail` is `null` when photos are loaded from IndexedDB, forcing `savePhotos()` to carry a manual fallback (`currentItem.thumbnail \|\| compressTo()`); normalization should happen at the `dbGet` boundary so callers receive clean objects | In dev |
| 38 | **Arch:** Setter pattern from #20 only covers `setItems` and `setCurrentItem` — high-frequency fields like `filter`, `pendingPhotos`, `isEditing`, `dirty` are still mutated directly from any file; extending setters (or a lightweight Proxy) to all key fields would complete the single-mutation-point goal | In dev |
| 39 | **Bug:** Suggestions button is missing from the detail screen — button does not appear / is not rendered | In dev |
| 40 | **Bug:** AI Smart-Crop toggle in Settings is unresponsive — toggling the switch has no effect; the setting cannot be turned on or off | In dev |
| 41 | **Feature:** Settings prompt editor — split the AI prompt into individual single-line prompts (one concept per line), displayed as separate text inputs; backend merges them into a single prompt before sending to the API; each input shows inline keyword hints to guide the user (e.g. `inspection`, `unknowns`, `constraint`) | New |
| 42 | **Feature:** Group AI prompt inputs in Settings into labelled sections — Persona, Title, Description, Image Inspection — each section contains its own prompt lines and displays its own set of configurable constraints | New |
| 43 | **Feature:** Photo reorder in photos screen — user can drag photos into a different order; image 1 becomes the item thumbnail shown on the home screen; order auto-saves on drop; thumbnail is regenerated after reorder | New |
| 44 | **Feature:** Sequential photo slot reveal — prevent adding a new image slot until the previous slot has an image; only one empty (+) slot is shown at the end of the current photos at any time; once image N is filled, slot N+1 becomes visible | New |
| 45 | **Bug:** Local storage not cleaned when an image is removed — deleting a photo leaves stale blob data in local storage; local storage must be checked and cleaned on every image removal | In dev |
| 46 | **Arch:** Remove `archived` item state — `deleted` is sufficient; all references to `archived` status must be removed from state, storage, and UI | New |

---

## v1.5.6 — 2026-04-14

### Fixed
- **#root-cause** Use thumbnail in `renderSlots()` — eliminated the root cause of iOS out-of-memory crash; home screen grid now renders the compressed thumbnail blob instead of the full-size medium image

---

## v1.5.5 — 2026-04-14

### Fixed
- **#log** Persist debug log to `localStorage` so it survives page kills — log entries written on each `dbg()` call; panel reads from storage on open so crash traces are recoverable after iOS app restart

---

## v1.5.4 — 2026-04-14

### Added
- **#51 In-app debug log panel** — Settings → Debug Log; `dbg()` logger traces the full photo pipeline (FileReader, compressTo, detectCropCoords, savePhotos) with relative timestamps; Refresh/Copy/Clear controls

---

## v1.5.3 — 2026-04-14

### Fixed
- **#50 Bulletproof iOS gallery processing** — `reader.onerror` + 15 s timeout on FileReader; 10 s timeout + cleanup on `compressTo`/`detectCropCoords`; try/catch + `ctx` null-check in canvas ops; re-entrancy guard on library processing loop; camera banner null-guards

---

## v1.5.2 — 2026-04-14

### Fixed
- **#49 Unhandled promise rejection on `renderDetail()`** — missing `await` in `savePhotos()` (`photos.js:340`) and missing `.catch()` in `openItem()` / `toggleAiPhoto()` (`actions.js:17`, `116`) caused iOS/Safari white-screen crash when adding images

---

## v1.5.1 — 2026-04-14

### Fixed
- **#48 Runtime `BRANCH_NAME` detection** — resolved via `window.location.hostname`; production shows `main`, all other environments show `dev`; `APP_VERSION` format extended to `major.minor.patch` starting at `v1.5.1`
- **#47 Gallery multi-select kicks user to home mid-processing** — mobile browsers (iOS Safari, Chrome Android) fire a phantom empty-files `change` event on `<input multiple>` when `event.target.value` is cleared inside the handler; fix: scope the `goHome()` guard to `mode === 'camera'` only (`photos.js:206`)

---

## v1.5 — 2026-04-10

### Added
- **#24 Settings screen** — API key screen replaced with a full Settings screen; editable AI Persona and Listing Rules textareas let users see and customise the prompt used for analysis; `⚙️` button on home opens settings; no more mid-flow redirects to settings when key is missing (alert shown instead)
- **#25 AI Smart-Crop** — TensorFlow.js COCO-SSD detects the main item in each photo and auto-crops to a 3:4 portrait centred on it; boundary clamping prevents edge items being cut; model pre-loaded in background on app start
- **#29 Smart-Crop opt-out** — AI Smart-Crop toggle in Settings (default ON); when disabled, photos use a simple centre-crop instead, preserving the original framing

### Fixed
- **#26** COCO-SSD detection now runs once per photo — `detectCropCoords()` extracted from `compressTo()`; both the 100px thumbnail and 1200px medium reuse the same crop coordinates
- **#27** Smart-crop now handles multi-detection — bounding box unions all detected objects so framing includes all items in frame
- **#28** Crop boundary clamping — crops that would extend outside the canvas are clamped; prevents black-bar artefacts on edge detections
