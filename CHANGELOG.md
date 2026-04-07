# Changelog

All notable changes to Vinted Lister are documented here.

---

## [Unreleased] — dev

| # | Description | Status |
|---|-------------|--------|
| 1 | Batch Analyse button on home — analyses all Photos-status items in sequence, 2 images each, confirmation prompt first | In dev |
| 2 | Open Vinted App button moved to top of copy flow, not end | In dev |
| 3 | Vinted URL fix — was `/sell` (404), now `https://www.vinted.co.uk` | In dev |
| 4 | Copy flow final step shows "Done — Mark as Listed?" instead of duplicate Open Vinted button | In dev |
| 5 | **Bug:** "Copy & Go to Vinted" button on item page does nothing — root cause: stale `btn-vinted` JS reference crashing the copy flow | In dev |
| 6 | **Change:** Rename "Copy & Go to Vinted" button to "Start Listing" | In dev |
| 7 | **Change:** Status section on item page — replace 5 buttons with a single large dropdown, current status shown as the label | In dev |
| 8 | **Bug:** Default photo source should be camera on 1st launch, then remember last used value for all subsequent new/existing items. Fix: remove force-set of library mode in `startNewItem()` | Analysed |
| 9 | **Bug:** Home page — "Analyse All" button pushes "Add Item" off screen. Fix: move Analyse All to a smaller secondary button floating above the main FAB, only visible when relevant | Analysed |
| 10 | **Change:** Back button on Add Photos page — show prompt modal "You have unsaved photos. Save before leaving?" Yes / Discard / Cancel | Analysed |
| 11 | **Change:** Add Photos page — show 4 slots by default; show 5th slot only when all 4 filled, 6th only when 5 filled, etc. (progressive expansion up to max) | Analysed |
| 12 | **Change:** Add Photos page — smaller tiles so 3 rows visible on screen with nav buttons; tiles compact enough to show all current slots without scrolling | Analysed |
| 13 | **Change:** Remove duplicate back buttons — screens have both header ← and bottom nav back buttons; proposal: remove bottom nav back buttons, keep header only | Raised |
| 14 | **Change:** Reduce vertical spacing throughout (header top padding, section gaps, storage bar) to gain more usable screen space on iPhone | Raised |

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
