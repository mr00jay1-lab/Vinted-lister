# Changelog

All notable changes to Vinted Lister are documented here.

---

## [Unreleased] — dev

| # | Description | Status |
|---|-------------|--------|
| 16 | **Arch:** Replace 3 photo-mode flags (`replacingItem`, `addingMorePhotos`, `isEditing`) with a single `photoContext` enum (`'new'|'replace'|'addMore'|'edit'`) — currently set/cleared in 13 places across 2 files | Raised |
| 17 | **Arch:** Move detail screen form fields from JS template strings (`ui.js:256`) to static HTML in `index.html` — currently impossible to find by searching HTML; changing fields requires editing JS | Raised |

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
