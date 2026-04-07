# Changelog

All notable changes to Vinted Lister are documented here.

---

## [Unreleased] — dev

### Added
- **Batch Analyse** button on home screen — appears when items with Photos status exist. Shows confirmation (item count + API call cost), then analyses all in sequence using first 2 photos per item
- **Open Vinted App** button now appears at the top of the copy flow (before field copying), not at the end

### Fixed
- Vinted URL changed from `/sell` (404) to `https://www.vinted.co.uk` (working)
- Copy flow final step now shows "Done — Mark as Listed?" instead of a duplicate Open Vinted button

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
