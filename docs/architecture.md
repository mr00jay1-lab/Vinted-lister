# Architecture — Modular Build (v1.5)

`index.html` loads `main.js` as an ES module. All exported functions are spread onto `window` so HTML `onclick=` attributes work.

## File Map

| File | Role |
|------|------|
| `index.html` | HTML skeleton + screen markup + modals. No inline JS. Loads `main.js` |
| `styles.css` | All CSS |
| `main.js` | Entry point — imports all modules, spreads onto `window`, calls `initApp()`, calls `initAI()` |
| `state.js` | Single source of truth — `appState`, constants, all localStorage helpers |
| `db.js` | IndexedDB wrapper — `openDB`, `dbGet`, `dbGetAll`, `dbPut`, `dbDelete` |
| `ui.js` | Screens + rendering — `initApp`, `showScreen`, `goHome`, `openSettings`, `saveSettings`, `renderHome`, `renderDetail`, `renderPhotosActions`, `renderAnalysisSpinner`, `renderAnalysisError` |
| `photos.js` | Add Photos screen — `startNewItem`, `openReplacePhotos`, `openAddMorePhotos`, `openEditPhotos` (in actions), `savePhotos`, `handlePhoto`, `renderSlots`, `discardAndGoHome` |
| `actions.js` | Item CRUD + copy flow — `openItem`, `deleteItem`, `saveEdits`, `handleSetStatus`, `startCopyFlow`, `finishCopyFlow`, `copyFieldValue`, `toggleAiPhoto`, `backFromAddPhotos`, `openEditPhotos` |
| `analysis.js` | AI calls — `analyseItem`, `openBatchAnalyse`, `runBatchAnalyse`, `buildAnalysisPrompt()` (internal) |
| `suggestions.js` | Suggestions panel |
| `utils.js` | `initAI()`, `detectCropCoords(dataUrl)`, `compressTo(dataUrl, maxW, quality, cropCoords?)`, `parseAnthropicJson(raw)`, `joinArray(val)` |
| `server.js` | Local dev server (Node, port 8000) — not deployed |

## Import Graph

```
main.js
 ├── ui.js        ← state.js, db.js, suggestions.js
 ├── photos.js    ← state.js, db.js, utils.js, analysis.js, ui.js
 ├── actions.js   ← state.js, db.js, ui.js, photos.js
 ├── analysis.js  ← state.js, db.js, utils.js, ui.js
 └── suggestions.js ← state.js
```

**Ripple rule:** change `state.js` → everything affected. Change `ui.js` → photos/actions/analysis affected.

## state.js — Functions

```js
// API key
getApiKey()               // reads localStorage
saveApiKeyValue(key)

// AI prompt (editable in Settings)
getPersona()              // returns saved or DEFAULT_PERSONA
savePersona(text)
getRules()                // returns saved or DEFAULT_RULES
saveRules(text)

// Photo settings
getSmartCrop()            // bool — default true; false = centre-crop only
saveSmartCrop(bool)
savePhotoMode(mode)       // 'camera'|'library'

// State setters (use instead of direct mutation)
setItems(items)
setCurrentItem(item)
```

## appState — Key Fields

```js
appState = {
  items[],               // all DB items in memory
  currentItem,           // item open in detail screen
  filter,                // 'all'|'photos'|'analysed'|'listed'|'sold'|'archived'
  pendingPhotos[],       // {dataUrl, thumbnail} — add-photos screen working copy
  photosDirty,           // true only when user actually adds/removes a photo (not on DB load)
  photosReturnScreen,    // 'screen-home'|'screen-detail' — where back/discard navigates
  replacingItem,         // true = replacing existing item photos
  addingMorePhotos,      // true = adding to existing item
  isEditing,             // true = opened via openEditPhotos() from detail screen
  copyFields[],          // [title,desc,category,brand,size,condition,colours,materials]
  aiSelectedIndices,     // photo indices sent to AI (default [0,1])
  photoMode,             // 'camera'|'library'
  pendingStatus,         // status queued waiting for drop-photos confirmation
  pendingSlot,           // slot index for next camera photo
}
```

## Item Schema (IndexedDB `items` store)

```js
{
  id,           // 'item_' + timestamp
  status,       // 'photos'|'analysed'|'listed'|'sold'|'archived'
  thumbnail,    // compressed base64 JPEG (100px)
  hasPhotos,    // bool — false when photos purged
  title, description, category, brand, size,
  condition,    // 'New with tags'|'Like new'|'Good'|'Fair'|'Poor'
  colours, materials,
  createdAt, statusChangedAt
}
```

Photos stored separately in `photos` store as `{ id, images[] }` — images are 1200px base64 JPEGs.

## Key HTML IDs

```
screen-home, screen-addphotos, screen-detail, screen-copy, screen-settings
photo-grid (add photos), detail-photos (detail, .photo-grid-3wide)
state-photos, state-analysed (toggled by renderDetail)
settings-api-key, settings-persona, settings-rules, settings-smart-crop
copy-step-1/2/3, copy-field-0..7, copy-pics-grid
modal-batch-analyse, modal-unsaved-photos, modal-drop-photos
save-photos-btn, next-item-btn, save-edits-btn
version-display, branch-display, version-display-settings, branch-display-settings
```

## AI Analysis (v1.5)

- Model: `claude-opus-4-5`, max_tokens 900
- Prompt built at call time via `buildAnalysisPrompt()` in `analysis.js` — calls `getPersona()` + `getRules()` so Settings changes take effect immediately without reload
- JSON schema (title, description, category, brand, size, condition, colours[], materials[]) is a static constant `ANALYSIS_JSON_SCHEMA` in `analysis.js`
- JSON extracted via `parseAnthropicJson()` in `utils.js` (regex `\{[\s\S]*\}`)
- Missing API key → alert pointing to ⚙️ Settings (no mid-flow navigation)

## AI Smart-Crop (v1.5)

- TF.js + COCO-SSD loaded dynamically inside `initAI()` via `loadScript()` — version-pinned (`@4.22.0` / `@2.2.3`)
- `initAI()` returns a shared `modelPromise` — mutex-safe for concurrent callers
- `detectCropCoords(dataUrl)` — runs detection once, returns `{srcX, srcY, cropW, cropH}` or `null`
- `compressTo(dataUrl, maxW, quality, cropCoords?)` — uses provided coords or falls back to centre-crop
- `handlePhoto()` checks `getSmartCrop()` before calling `detectCropCoords`; both thumbnail (100px) and medium (1200px) reuse the same coords
- Smart-Crop toggled in Settings screen (`settings-smart-crop` checkbox)

## Photo Screen Navigation (v1.4+)

Three flags set on entry to the photos screen:
- `photosDirty` — only flipped to `true` when user actually adds/removes a photo
- `photosReturnScreen` — set to `'screen-home'` (new item) or `'screen-detail'` (edit/replace)
- `isEditing` — set by `openEditPhotos()` only

`backFromAddPhotos()` checks `photosDirty`: if false → navigate directly; if true → show unsaved-photos modal.
`savePhotos(startNewAfter, backToOrigin)` — `backToOrigin=true` navigates to `photosReturnScreen` rather than always `screen-detail`.

## Critical Patterns / Gotchas

- All functions must be on `window` — `main.js` does `Object.assign(window, exposed)`
- `backFromAddPhotos()` exists in BOTH `photos.js` and `actions.js` — `actions.js` version wins (last spread). The dead `photos.js` version is a known issue (#15, fixed in v1.4)
- `thumbnail` is `null` when loading photos from DB into `pendingPhotos` — `savePhotos()` falls back to `currentItem.thumbnail` or re-runs `compressTo`
- `isEditing` flag is distinct from `replacingItem`/`addingMorePhotos` — all three can interact in `savePhotos()`
- `openVinted` button is an `<a>` tag in HTML (not JS) — iOS PWA fix
- Screen `screen-settings` replaces old `screen-apikey` (removed in v1.5)
