# Session Notes

## Sprint E Status
- [x] #36 — appState split into .data/.ui/.form (already done)
- [x] #16 — photoContext enum (already done)
- [x] #37 — thumbnail normalised at dbGet boundary via db.js normaliseItem (already done)
- [ ] #38 — extend setter pattern to key fields
- [ ] #46 — remove archived status

---

## #38 — Setters to add in state.js

New exports:
- `setPhotoContext(ctx)`
- `setPhotosDirty(val)`
- `setPendingPhotos(arr)` — full replacement only; element mutations within photos.js stay as-is
- `setPhotosReturnScreen(screen)`
- `setDirty(val)`
- `setPendingSlot(slot)`
- `setPendingStatus(status)`
- `setAiSelectedIndices(indices)`

### photos.js mutations to replace
- [ ] startNewItem: photoContext, photosDirty, photosReturnScreen, pendingPhotos, pendingSlot
- [ ] openReplacePhotos: photoContext, photosDirty, photosReturnScreen, pendingPhotos (x2)
- [ ] openAddMorePhotos: photoContext, photosDirty, photosReturnScreen, pendingPhotos (x2)
- [ ] discardAndGoHome: pendingPhotos, photosDirty, photoContext
- [ ] removeSlot: photosDirty (element mutations stay)
- [ ] slotTapped: pendingSlot
- [ ] triggerNextCamera: pendingSlot
- [ ] handlePhoto library: photosDirty (element mutations stay)
- [ ] handlePhoto camera: pendingSlot (x2), photosDirty (element mutations stay)
- [ ] savePhotos: photosDirty, photoContext

### actions.js mutations to replace
- [ ] openItem: dirty, aiSelectedIndices
- [ ] markDirty: dirty
- [ ] saveEdits: dirty
- [ ] handleSetStatus: pendingStatus
- [ ] confirmDropPhotos: pendingStatus
- [ ] toggleAiPhoto: aiSelectedIndices (both branches)
- [ ] openEditPhotos: photoContext, photosDirty, photosReturnScreen, pendingPhotos (x2)
- [ ] backFromAddPhotos: photoContext

---

## #46 — Remove archived status

### state.js
- [ ] Remove archived from STATUS_LABELS
- [ ] Remove archived from STATUS_BADGE_CLASSES

### ui.js
- [ ] autoClean(): add migration archived→sold; change condition to `item.status === 'sold'`
- [ ] renderHome(): remove `item.status !== 'archived'` guard (all items shown in 'all' view)
- [ ] renderDetail(): remove 'archived' from analysed check

### actions.js
- [ ] handleSetStatus(): remove 'archived' from drop-photos modal condition

### index.html
- [ ] Remove Archived filter tab
- [ ] Remove archived option from status-select dropdown

### styles.css
- [ ] Remove .badge-archived rule
- [ ] Remove .st-archived rule
