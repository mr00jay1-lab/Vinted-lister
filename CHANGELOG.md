# Changelog

All notable changes to Vinted Lister are documented here.

---

## [Unreleased] — dev

| # | Description | Status |
|---|-------------|--------|
| 16 | **Arch:** Replace 3 photo-mode flags (`replacingItem`, `addingMorePhotos`, `isEditing`) with a single `photoContext` enum (`'new'\|'replace'\|'addMore'\|'edit'`) — currently set/cleared in 13 places across 2 files | Raised |
| 17 | **Arch:** Move detail screen form fields from JS template strings (`ui.js:256`) to static HTML in `index.html` — currently impossible to find by searching HTML; changing fields requires editing JS | Raised |
| 32 | **Arch:** API key called directly from the browser — key is visible in the network tab to anyone who opens devtools; move analysis calls to a Vercel serverless function (`/api/analyse`) to keep the key server-side | Raised |
| 34 | **Arch:** Global scope pollution via `Object.assign(window, exposed)` in `main.js` — all module functions dumped onto `window` to support inline `onclick` attributes; directly caused the `backFromAddPhotos` double-definition bug; fix is to remove inline `onclick` and bind events in JS via `addEventListener` | Raised |
| 35 | **Arch:** Cross-layer coupling — `actions.js` and `photos.js` call UI functions (`renderDetail`, `showScreen`, `goHome`) directly; a change to any UI function can cascade into data logic; decouple via a simple event bus or strict unidirectional flow (data layer updates state → UI layer reads and renders) | Raised |
| 36 | **Arch:** `appState` is a flat object mixing DB data (`items`, `currentItem`), navigation state (`filter`, `copyPage`, `isEditing`), and temporary form data (`pendingPhotos`, `replacingItem`); splitting into `appState.data` / `appState.ui` / `appState.form` sub-objects would make selective resets and debugging significantly easier | Raised |
| 37 | **Arch:** DB boundary has no data normalization — `thumbnail` is `null` when photos are loaded from IndexedDB, forcing `savePhotos()` to carry a manual fallback (`currentItem.thumbnail \|\| compressTo()`); normalization should happen at the `dbGet` boundary so callers receive clean objects | Raised |
| 38 | **Arch:** Setter pattern from #20 only covers `setItems` and `setCurrentItem` — high-frequency fields like `filter`, `pendingPhotos`, `isEditing`, `dirty` are still mutated directly from any file; extending setters (or a lightweight Proxy) to all key fields would complete the single-mutation-point goal | Raised |
| 39 | **Bug:** IndexedDB `photos` store entry is not deleted when an item is deleted or archived — `deleteItem` and `handleSetStatus('archived')` in `actions.js` remove the item record but leave the photos blob orphaned in the `photos` store, leaking storage | Raised |
| 40 | **Simplification:** Remove the Archived status entirely — the concept adds UI surface (filter tab, status option, auto-clean logic) with little practical value; items should go Photos → Analysed → Listed → Sold only; affects `state.js` (status enum), `ui.js` (filter), `actions.js` (dropdown), `index.html`, `styles.css` | Raised |

---

## v1.5 — 2026-04-10

### Added
- **#24 Settings screen** — API key screen replaced with a full Settings screen; editable AI Persona and Listing Rules textareas let users see and customise the prompt used for analysis; `⚙️` button on home opens settings; no more mid-flow redirects to settings when key is missing (alert shown instead)
- **#25 AI Smart-Crop** — TensorFlow.js COCO-SSD detects the main item in each photo and auto-crops to a 3:4 portrait centred on it; boundary clamping prevents edge items being cut; model pre-loaded in background on app start
- **#29 Smart-Crop opt-out** — AI Smart-Crop toggle in Settings (default ON); when disabled, photos use a simple centre-crop instead, preserving the original framing

### Fixed
- **#26** COCO-SSD detection now runs once per photo — `detectCropCoords()` extracted from `compressTo()`; both the 100px thumbnail and 1200px medium reuse the same crop coordinates
- **#27** Model loading is now mutex-safe — shared `modelPromise` replaces the non-async-safe `if (!model)` guard; concurrent callers at startup all await the same Promise
- **#28** Error fallback added to `handlePhoto` — both library and camera paths wrapped in try/catch; a failed photo shows an alert and leaves the slot empty rather than silently stalling
- **#33** Batch analysis now respects user photo selection — `runBatchAnalyse` uses `item.aiSelectedIndices` (falling back to `[0, 1]`) instead of hard-coded `slice(0, 2)`

### Architecture
- **#30** TF.js and COCO-SSD CDN imports pinned to `@4.22.0` / `@2.2.3`; loaded dynamically inside `initAI()` so a breaking upstream release cannot silently break the app
- **#31** Removed side-effect `import 'url'` for TF.js / COCO-SSD — replaced with dynamic `loadScript()` inside `initAI()`; `window.cocoSsd` is guaranteed to exist before `cocoSsd.load()` is called

---

## v1.4 — 2026-04-10

### Fixed
- **Bug #21:** Add Photos back button now shows "save before leaving?" prompt when user has taken photos but not saved them — new item flow was going straight to home without warning
- **Bug #22:** Unsaved photos prompt no longer appears when opening edit mode without making any changes — `photosDirty` flag now tracks actual user edits rather than DB loads
- **Bug #23:** "Save Photos →" in the unsaved-photos prompt now returns to the correct screen — home for new-item flow, item detail for edit/replace flows (previously always went to item detail)

### Changed
- **Version display** — banner now shows `v1.4 · dev`; version read directly from `state.js` constants, parsing simplified
- **Item cards** — meta line now shows `Brand · Size` when either is set

### Architecture
- **#15** Deleted dead `backFromAddPhotos` from `photos.js` — `actions.js` version wins via `main.js` spread
- **#18** Moved `currentCopyPage` from module-level `let` in `actions.js` to `appState.copyPage` in `state.js`
- **#19** Extracted `renderPhotosActions()`, `renderAnalysisSpinner()`, `renderAnalysisError()` into `ui.js`; replaced 4 inline `innerHTML` sites across `ui.js` and `analysis.js`
- **#20** Added `setItems()` and `setCurrentItem()` setters in `state.js`; all direct mutation sites across `ui.js`, `photos.js`, `actions.js`, `analysis.js` updated to use them
- Added `photosDirty` and `photosReturnScreen` to `appState` to make photo-screen navigation explicit and reliable

---

## v1.3 — 2026-04-07

### Fixed
- **Bug #8:** Photo mode now correctly remembers last-used source (camera/library) across sessions; defaults to camera on first launch
- **Bug #9:** "Analyse All" button no longer pushes "+ New Item" off screen — now floats above the FAB as a compact pill button, visible only when relevant
- **Bug #5:** Copy flow crash fixed — stale `btn-vinted` JS reference replaced with `btn-done`

### Added
- **Batch Analyse** — home screen button analyses all Photos-status items sequentially (2 images each) with a confirmation prompt (#1)
- **Unsaved photos prompt** — back button on Add Photos screen now asks "Save before leaving?" with Save / Discard / Cancel options (#10)

### Changed
- **Copy flow** — "Open Vinted App" button moved to top of flow; final step shows "Done — Mark as Listed?" (#2, #4)
- **Vinted URL** — fixed from broken `/sell` path to `https://www.vinted.co.uk` (#3)
- **"Start Listing"** — renamed from "Copy & Go to Vinted" (#6)
- **Status dropdown** — replaced 5 separate status buttons with a single colour-coded dropdown (#7)
- **Add Photos grid** — 3-column layout for smaller, more compact tiles (#12)
- **Progressive slots** — shows 4 slots by default; 5th slot appears only when all 4 are filled, expanding up to 10 (#11)
- **Navigation simplified** — bottom nav back buttons removed from detail and copy screens; header ← is the sole back navigation (#13)
- **Spacing tightened** — header, content, fields, buttons, filter bar and storage bar all use reduced padding/margins for more visible content (#14)

---

## v1.2 — 2026-04-07

### Added
- **AI photo selector** on detail screen — photos show teal outline + 🔍 AI badge when selected for analysis
  - Default: first 2 photos selected
  - Tap to toggle in/out of selection (min 1, max 10)
  - Hint text: "Tap photos to select for AI analysis"
- **New listing fields**: Size, Colour, Material, Parcel Size (XS/S/M/L/XL)
- **Updated AI prompt** — richer output including size, colours, materials and parcel size; max_tokens increased to 900
- **Copy flow expanded** — 9 fields (Title, Description, Category, Brand, Size, Condition, Colour, Material, Parcel Size); Price removed from copy flow
- **Skip button** in copy flow — side-by-side with Copy button, advances without copying

### Changed
- Field order on detail screen: Title → Description → Category → Brand → Size → Condition → Colour → Material → Parcel Size → Price
- All empty photo slots now show **＋** instead of 📷

### Fixed
- Cancelling the photo picker with no photos selected now returns to Home screen
- Add Photos screen no longer auto-opens the file picker on load
- Library file input uses explicit extensions (`.jpg`, `.heic` etc.) to reduce iOS action sheet appearance

---

## v1.1 — Prior to v1.2

### Added
- Camera / Library mode selector on Add Photos screen
- Multi-photo support — up to 10 photos per item, dynamic slots
- **Add / Replace Photos & Re-analyse** button on detail screen — replaces photos and auto-triggers AI
- **Save Photos modal** — hold-and-save UI for iPhone camera roll
- **Suggestions panel** (💡 floating button) — add, delete, copy feedback/ideas
- Bottom navigation bar ("← Back to Home", "← Back to Item")
- Archived items hidden from the **All** tab (only visible under Archived filter)

---

## v1.0 — Initial release

- Single-file web app (`index.html`), no build step, deployed via Vercel
- Anthropic API key entry screen (stored locally, never shared)
- Add photos (up to 4), compress & store in IndexedDB
- AI analysis via Claude — generates title, category, brand, condition, description, price
- Edit listing fields manually
- Status tracking: Photos → Analysed → Listed → Sold → Archived
- Copy-to-Vinted flow (field-by-field clipboard copy)
- Storage usage bar
- Auto-clean photos for sold/archived items after 30 days
- Dark mode support
