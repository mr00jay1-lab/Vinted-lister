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
| 39 | **Bug:** Suggestions button is missing from the detail screen — button does not appear / is not rendered | New |
| 40 | **Bug:** AI Smart-Crop toggle in Settings is unresponsive — toggling the switch has no effect; the setting cannot be turned on or off | New |
| 41 | **Feature:** Settings prompt editor — split the AI prompt into individual single-line prompts (one concept per line), displayed as separate text inputs; backend merges them into a single prompt before sending to the API; each input shows inline keyword hints to guide the user (e.g. `inspection`, `unknowns`, `constraint`) | New |
| 42 | **Feature:** Group AI prompt inputs in Settings into labelled sections — Persona, Title, Description, Image Inspection — each section contains its own prompt lines and displays its own set of configurable constraints | New |
| 43 | **Feature:** Photo reorder in photos screen — user can drag photos into a different order; image 1 becomes the item thumbnail shown on the home screen; order auto-saves on drop; thumbnail is regenerated after reorder | New |
| 44 | **Feature:** Sequential photo slot reveal — prevent adding a new image slot until the previous slot has an image; only one empty (+) slot is shown at the end of the current photos at any time; once image N is filled, slot N+1 becomes visible | New |
| 45 | **Bug:** Local storage not cleaned when an image is removed — deleting a photo leaves stale blob data in local storage; local storage must be checked and cleaned on every image removal | New |
| 46 | **Arch:** Remove `archived` item state — `deleted` is sufficient; all references to `archived` status must be removed from state, storage, and UI | New |

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
- **#30** COCO-SSD model pre-loaded on app start — first analysis no longer pays the 2-3 s model-load penalty
- **#31** Smart-crop applied to both thumbnail (100 px) and medium (1200 px) — previously only applied to thumbnail
- **#33** Batch analysis photo selection — users can choose which photos (up to 10) are sent to AI; default selects first two; toggle per photo in detail view

### Architecture
- **#20** Setter pattern — `setItems()` / `setCurrentItem()` added to `state.js`; direct `appState` mutations replaced across all files
- **#21** `autoClean()` — stale items (no title, no photos, >24 h old) are silently removed on app load
- **#22** `updateStorageBar()` moved to `ui.js`; no longer leaks into `actions.js`
- **#23** `resetStatePhotos()` extracted to `ui.js` — photo-form state reset is now a named, single-call operation

---

## v1.4 — 2026-03-28

### Added
- **#15** Replace Photos flow — users can swap all photos for an existing item from the detail screen
- **#18** Add More Photos flow — users can append photos to an existing item; triggers re-analysis automatically
- **#19** Edit Photos flow — users can reorder or remove individual photos without replacing the whole set

### Fixed
- **#21** Auto-clean on load — orphaned draft items (no title, no photos) removed silently on startup
- **#22** Storage bar — now updates correctly after photo deletion
- **#23** State reset — photo-screen flags cleared reliably when navigating away
