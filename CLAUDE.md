# Vinted Lister — Claude Code Way of Working

## Repo
- **Prod URL:** https://vinted-lister-eight.vercel.app/
- **Dev/Preview URL:** https://vinted-lister-git-dev-mr00jay1-3402s-projects.vercel.app/
- **GitHub:** https://github.com/mr00jay1-lab/Vinted-lister
- modular build

## Branch Rules
- All changes go to `dev` branch — never commit directly to `main`
- Only merge to `main` when the user explicitly says to push/release
- When merging to main: bump version number, finalise changelog, tag the release

## Change Lifecycle
Every change follows this status flow:

| Status | Meaning |
|--------|---------|
| **Raised** | User has described the change — logged only, no action taken |
| **Analysed** | User has asked for analysis — approach discussed and agreed |
| **In dev** | User has asked to implement — code written and committed to dev |
| **In prod** | User has asked to release — merged to main and deployed |

## IMPORTANT — Do Not Self-Trigger
- When the user describes a change, bug or suggestion: **log it to the changelog as Raised and stop**
- **Never move an item to the next status without the user explicitly asking**
- The user controls all progression through the lifecycle
- Changes batch together and deploy as a sprint when the user decides

## Changelog Rules (`CHANGELOG.md`)
- Keep an `[Unreleased] — dev` section at the top for all changes currently in dev
- Add each change to the unreleased section as soon as it is coded
- When releasing to main: rename `[Unreleased]` to the new version number + date, create a fresh `[Unreleased]` section

## Version Numbering
- Format: `v{major}.{minor}` — e.g. v1.2, v1.3
- Minor bump for new features or fixes in a release
- Major bump only for full rebuilds or breaking changes
- Tag every release: `git tag v{version} && git push origin v{version}`

## Git Credentials
- PAT stored in `~/.git-credentials` — pushes work without re-authenticating
- Remote: `https://github.com/mr00jay1-lab/Vinted-lister.git`

## Vercel
- Project ID: `prj_pjmrN0tUpDgTsQTv6808AwYfa8dy`
- Team ID: `team_8wum7h9ziS5nFZazqEQljQlh`
- Vercel auto-deploys on every push to any branch

---

## Architecture — Modular Build (v1.4+)

App is now multi-file. `index.html` loads `main.js` as ES module. All JS functions are exposed onto `window` so HTML `onclick=` attributes work.

### File Map

| File | Role |
|------|------|
| `index.html` | HTML skeleton + all screen markup + modals. No inline JS. Loads `main.js` |
| `styles.css` | All CSS — themes, screens, components |
| `main.js` | Entry point. Imports all modules, spreads exports onto `window`, calls `initApp()` |
| `state.js` | Single source of truth — `appState` object, constants, localStorage helpers |
| `db.js` | IndexedDB wrapper — `openDB`, `dbGet`, `dbGetAll`, `dbPut`, `dbDelete` |
| `ui.js` | Screens, navigation, home/detail rendering — `initApp`, `showScreen`, `goHome`, `renderHome`, `renderDetail`, `resetStatePhotos`, `updateStorageBar` |
| `photos.js` | Add Photos screen — `startNewItem`, `openEditPhotos`, `savePhotos`, `handlePhoto`, `renderSlots`, `backFromAddPhotos`, `discardAndGoHome` |
| `actions.js` | Item CRUD + copy flow — `openItem`, `deleteItem`, `saveEdits`, `handleSetStatus`, `setStatus`, `startCopyFlow`, `finishCopyFlow`, `copyFieldValue`, `toggleAiPhoto` |
| `analysis.js` | AI calls — `analyseItem`, `openBatchAnalyse`, `runBatchAnalyse`. Contains `ANALYSIS_PROMPT` |
| `suggestions.js` | Suggestions panel — `openSuggestions`, `addSuggestion`, `copySuggestions` |
| `utils.js` | Pure helpers — `compressTo(dataUrl, maxW, quality)`, `parseAnthropicJson(raw)`, `joinArray(val)` |
| `server.js` | Local dev server (Node, port 8000). Not deployed — Vercel serves static files directly |

### Import Graph
```
main.js
 ├── ui.js        ← state.js, db.js, suggestions.js
 ├── photos.js    ← state.js, db.js, utils.js, analysis.js, ui.js
 ├── actions.js   ← state.js, db.js, ui.js, photos.js
 ├── analysis.js  ← state.js, db.js, utils.js, ui.js
 └── suggestions.js ← state.js
```
**Ripple rule:** change `state.js` → everything affected. Change `ui.js` → photos/actions/analysis affected.

### appState — Key Fields
```js
appState = {
  items[],           // all DB items in memory
  currentItem,       // item open in detail screen
  filter,            // home filter: 'all'|'photos'|'analysed'|'listed'|'sold'|'archived'
  pendingPhotos[],   // {dataUrl, thumbnail} objects for add-photos screen
  replacingItem,     // true = replacing existing item photos
  addingMorePhotos,  // true = adding to existing item
  isEditing,         // true = opened via openEditPhotos() from detail screen
  copyFields[],      // [title,desc,category,brand,size,condition,colours,materials]
  aiSelectedIndices, // photo indices sent to AI (default [0,1])
  photoMode,         // 'camera'|'library' — persisted to localStorage
  pendingStatus,     // status queued waiting for drop-photos confirmation
  pendingSlot,       // slot index for next camera photo
}
```

### Item Schema (IndexedDB `items` store)
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
Photos stored separately in `photos` store as `{ id, images[] }` where images are 1200px base64 JPEGs.

### Copy Flow (3-page screen)
- Page 1 (`#copy-step-1`): photo grid — hold to save to gallery
- Page 2 (`#copy-step-2`): tap to copy Title / Description / Category
- Page 3 (`#copy-step-3`): Brand / Size / Condition / Colour / Material
- `currentCopyPage` is a module-level var in `actions.js`
- `finishCopyFlow()` sets status → 'listed' and goes home
- "Finish / Don't mark listed" button goes straight home without status change

### Key HTML IDs (frequently referenced in JS)
`screen-home`, `screen-addphotos`, `screen-detail`, `screen-copy`
`photo-grid` (add photos), `detail-photos` (detail, uses `.photo-grid-3wide`)
`state-photos`, `state-analysed` (toggled by `renderDetail`)
`copy-step-1/2/3`, `copy-field-0..7`, `copy-pics-grid`
`modal-batch-analyse`, `modal-unsaved-photos`, `modal-drop-photos`
`save-photos-btn`, `next-item-btn`, `save-edits-btn`

### AI Analysis
- Model: `claude-opus-4-5`, max_tokens 900
- Prompt in `analysis.js` → `ANALYSIS_PROMPT` (persona + rules + JSON schema)
- Fields returned: title, description, category, brand, size, condition, colours[], materials[]
- `parcel_size` removed from prompt/schema in v1.4 refactor
- JSON extracted via `parseAnthropicJson()` in `utils.js` (regex `\{[\s\S]*\}`)

### Critical Patterns / Gotchas
- All functions must be on `window` — HTML uses `onclick="window.fn()"`. `main.js` does `Object.assign(window, exposed)`.
- `backFromAddPhotos()` exists in BOTH `photos.js` and `actions.js` — `actions.js` version wins (last spread in `main.js`). The `actions.js` version handles `isEditing` flag.
- When loading photos from DB into `pendingPhotos`, `thumbnail` is set to `null`. `savePhotos()` handles this by falling back to `currentItem.thumbnail` or re-compressing.
- `isEditing` flag (`actions.js`) = distinct from `replacingItem`/`addingMorePhotos`. Used by `openEditPhotos()`.
- `openVinted` button is now an `<a>` tag in HTML (not JS) — iOS PWA fix.
- Git remote reverts to local proxy each session — always run `git remote set-url origin https://github.com/mr00jay1-lab/Vinted-lister.git` before pushing.
