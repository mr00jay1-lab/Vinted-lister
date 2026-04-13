import { appState, MAX_PHOTOS, DEFAULT_PHOTOS, savePhotoMode, S_ITEMS, S_PHOTOS, setItems, setCurrentItem, getSmartCrop, setPendingPhotos, setIsEditing } from './state.js';
import { dbPut, dbGet, dbGetAll } from './db.js';
import { compressTo, detectCropCoords } from './utils.js';
import { analyseItem } from './analysis.js';
import { renderDetail, renderHome, goHome, showScreen, closeModal } from './ui.js';

/* ==========================================================================
   SECTION 1: SCREEN INITIALIZATION & MODES
   ========================================================================== */

/** Sets global photo source (Camera vs Gallery) and updates UI buttons */
export function setPhotoMode(mode) {
  savePhotoMode(mode);
  document.getElementById('mode-btn-camera').classList.toggle('active', mode === 'camera');
  document.getElementById('mode-btn-library').classList.toggle('active', mode === 'library');
  hideBanner();
  renderSlots();
}

/** Hides the "Take another photo?" banner */
function hideBanner() {
  const banner = document.getElementById('next-photo-banner');
  if (banner) banner.style.display = 'none';
}

/** Resets all states for a completely fresh item */
export function startNewItem() {
  appState.form.replacingItem = false;
  appState.form.addingMorePhotos = false;
  setIsEditing(false);
  appState.form.photosDirty = false;
  appState.ui.photosReturnScreen = 'screen-home';
  setCurrentItem(null);
  setPendingPhotos([]);
  appState.form.pendingSlot = null;

  // Restore the "New Item" button just in case it was hidden by openEditPhotos
  const nextItemBtn = document.getElementById('next-item-btn');
  if (nextItemBtn) nextItemBtn.style.display = 'flex';

  document.getElementById('addphotos-title').textContent = 'Add Photos';
  document.getElementById('addphotos-sub').textContent = 'Choose your capture method';

  appState.ui.photoMode = localStorage.getItem('vinted_photo_mode') || 'camera';
  initPhotoScreen();
  showScreen('screen-addphotos');
}

/** Prepares UI to overwrite existing photos */
export async function openReplacePhotos() {
  appState.form.replacingItem = true;
  appState.form.addingMorePhotos = false;
  appState.form.photosDirty = false;
  appState.ui.photosReturnScreen = 'screen-detail';
  setPendingPhotos([]);
  if (appState.data.currentItem && appState.data.currentItem.hasPhotos) {
    const rec = await dbGet(S_PHOTOS, appState.data.currentItem.id);
    if (rec && rec.images) {
      const storedThumb = appState.data.currentItem?.thumbnail ?? '';
      setPendingPhotos(rec.images.map((image, i) => ({ dataUrl: image, thumbnail: i === 0 ? storedThumb : '' })));
    }
  }
  document.getElementById('addphotos-title').textContent = 'Replace Photos';
  document.getElementById('addphotos-sub').textContent = 'Edit or replace existing photos';
  initPhotoScreen();
  showScreen('screen-addphotos');
}

/** Prepares UI to add to existing photos */
export async function openAddMorePhotos() {
  appState.form.addingMorePhotos = true;
  appState.form.replacingItem = false;
  appState.form.photosDirty = false;
  appState.ui.photosReturnScreen = 'screen-detail';
  setPendingPhotos([]);
  if (appState.data.currentItem && appState.data.currentItem.hasPhotos) {
    const rec = await dbGet(S_PHOTOS, appState.data.currentItem.id);
    if (rec && rec.images) {
      const storedThumb = appState.data.currentItem?.thumbnail ?? '';
      setPendingPhotos(rec.images.map((image, i) => ({ dataUrl: image, thumbnail: i === 0 ? storedThumb : '' })));
    }
  }
  document.getElementById('addphotos-title').textContent = 'Add / Replace Photos';
  document.getElementById('addphotos-sub').textContent = 'Add more or swap existing photos';
  initPhotoScreen();
  showScreen('screen-addphotos');
}

/** Syncs the photo screen state with current app settings */
export function initPhotoScreen() {
  hideBanner();
  document.getElementById('mode-btn-camera').classList.toggle('active', appState.ui.photoMode === 'camera');
  document.getElementById('mode-btn-library').classList.toggle('active', appState.ui.photoMode === 'library');
  renderSlots();
}

/* ==========================================================================
   SECTION 2: NAVIGATION & EXIT GUARDS
   ========================================================================== */

/** Discards the current session and returns to the screen that launched photos */
export function discardAndGoHome() {
  closeModal('modal-unsaved-photos');
  setPendingPhotos([]);
  appState.form.photosDirty = false;

  // Clean up mode flags
  if (appState.form.isEditing) {
    setIsEditing(false);
    const nextItemBtn = document.getElementById('next-item-btn');
    if (nextItemBtn) nextItemBtn.style.display = 'flex';
  }
  appState.form.replacingItem = false;
  appState.form.addingMorePhotos = false;

  if (appState.ui.photosReturnScreen === 'screen-home') {
    goHome();
  } else {
    showScreen(appState.ui.photosReturnScreen);
  }
}

/* ==========================================================================
   SECTION 3: PHOTO GRID & SLOT MANAGEMENT
   ========================================================================== */

/** Draws the interactive photo slots (placeholders or images) */
export function renderSlots() {
  const grid = document.getElementById('photo-grid');
  const filled = appState.form.pendingPhotos.filter(Boolean).length;
  const totalSlots = Math.min(MAX_PHOTOS, filled < DEFAULT_PHOTOS ? DEFAULT_PHOTOS : filled + 1);

  let html = '';
  for (let i = 0; i < totalSlots; i += 1) {
    const photo = appState.form.pendingPhotos[i];
    if (photo) {
      html += `
       <div class="photo-slot" onclick="window.slotTapped(${i})">
          <img src="${photo.dataUrl}" />
          <button class="remove-btn" onclick="event.stopPropagation();window.removeSlot(${i})">✕</button>
        </div>
      `;
    } else {
      html += `
        <div class="photo-slot" onclick="slotTapped(${i})">
          <div class="slot-icon">＋</div>
          <div class="slot-label">Photo ${i + 1}</div>
        </div>
      `;
    }
  }

  grid.innerHTML = html;
  const count = appState.form.pendingPhotos.filter(Boolean).length;
  document.getElementById('photo-msg').textContent = count
    ? `${count} photo${count > 1 ? 's' : ''} ready — tap any to replace`
    : 'Add at least 1 photo to continue';
  
  // Disable "Continue" button if no photos exist
  const analyzeBtn = document.getElementById('save-photos-btn');
  if (analyzeBtn) analyzeBtn.disabled = count === 0;
}

/** Removes a specific photo and re-compacts the list */
export function removeSlot(index) {
  appState.form.pendingPhotos[index] = null;
  appState.form.photosDirty = true;
  while (appState.form.pendingPhotos.length && !appState.form.pendingPhotos[appState.form.pendingPhotos.length - 1]) {
    appState.form.pendingPhotos.pop();
  }
  hideBanner();
  renderSlots();
}

/** Triggers the native OS file/camera picker */
export function slotTapped(index) {
  appState.form.pendingSlot = index;
  const inputId = appState.ui.photoMode === 'camera' ? 'photo-input-camera' : 'photo-input-library';
  const input = document.getElementById(inputId);
  input.value = '';
  input.click();
}

/** Automatically triggers camera for the next available empty slot */
export function triggerNextCamera() {
  let next = -1;
  for (let i = 0; i < MAX_PHOTOS; i += 1) {
    if (!appState.form.pendingPhotos[i]) {
      next = i;
      break;
    }
  }
  if (next === -1) {
    hideBanner();
    renderSlots();
    return;
  }
  appState.form.pendingSlot = next;
  const input = document.getElementById('photo-input-camera');
  input.value = '';
  input.click();
}

/* ==========================================================================
   SECTION 4: IMAGE PROCESSING (FILE HANDLING)
   ========================================================================== */

/** Processes files selected by user, compresses them, and saves to state */
export function handlePhoto(event, mode) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) {
    if (!appState.form.pendingPhotos.filter(Boolean).length) goHome();
    return;
  }

  if (mode === 'library') {
    // Handling multiple files from Gallery
    let slotIndex = appState.form.pendingSlot !== null ? appState.form.pendingSlot : appState.form.pendingPhotos.filter(Boolean).length;
    let processed = 0;
    const maxFiles = Math.min(files.length, MAX_PHOTOS - (appState.form.pendingSlot !== null ? appState.form.pendingSlot : 0));

files.slice(0, maxFiles).forEach((file) => {
  const currentSlot = slotIndex++;
  const reader = new FileReader();
  reader.onload = async (loadEvent) => {
    const dataUrl = loadEvent.target.result;
    try {
      const coords = getSmartCrop() ? await detectCropCoords(dataUrl) : null;
      const thumbnail = await compressTo(dataUrl, 100, 0.7, coords);
      const medium = await compressTo(dataUrl, 1200, 0.85, coords);
      appState.form.pendingPhotos[currentSlot] = { dataUrl: medium, thumbnail };
      appState.form.photosDirty = true;
    } catch (err) {
      console.error('Photo processing failed for slot', currentSlot, err);
      alert(`Photo ${currentSlot + 1} could not be processed. Please try another.`);
    }
    processed += 1;
    if (processed === maxFiles) {
      hideBanner();
      renderSlots();
    }
  };
  reader.readAsDataURL(file);
});
  } else {
    // Handling single file from Camera
    const file = files[0];
    const slot = appState.form.pendingSlot !== null ? appState.form.pendingSlot : appState.form.pendingPhotos.filter(Boolean).length;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const dataUrl = loadEvent.target.result;
      try {
        const coords = getSmartCrop() ? await detectCropCoords(dataUrl) : null;
        const thumbnail = await compressTo(dataUrl, 100, 0.7, coords);
        const medium = await compressTo(dataUrl, 1200, 0.85, coords);
        appState.form.pendingPhotos[slot] = { dataUrl: medium, thumbnail };
        appState.form.pendingSlot = null;
        appState.form.photosDirty = true;
      } catch (err) {
        console.error('Photo processing failed for slot', slot, err);
        alert('Photo could not be processed. Please try again.');
      }
      renderSlots();

      const filled = appState.form.pendingPhotos.filter(Boolean).length;
      if (filled < MAX_PHOTOS) {
        const nextEmpty = appState.form.pendingPhotos.findIndex((photo, index) => !photo && index < MAX_PHOTOS);
        const nextSlot = nextEmpty === -1 ? filled : nextEmpty;
        document.getElementById('next-photo-text').textContent = `📷 Photo ${filled} saved — take another?`;
        document.getElementById('next-photo-banner').style.display = 'flex';
        appState.form.pendingSlot = nextSlot;
      } else {
        hideBanner();
      }
    };
    reader.readAsDataURL(file);
  }
}

/* ==========================================================================
   SECTION 5: FINALIZING & DB STORAGE
   ========================================================================== */
/**
 * Saves pending photos to IndexedDB then navigates.
 * startNewAfter — true when "+ New Item" button triggers save-then-new flow
 * backToOrigin  — true when called from the "unsaved photos" modal; navigates
 *                 to photosReturnScreen instead of always going to detail
 */
export async function savePhotos(startNewAfter = false, backToOrigin = false) {
  document.getElementById('modal-unsaved-photos').style.display = 'none';
  appState.form.photosDirty = false;
  const photos = appState.form.pendingPhotos.filter(Boolean);
  if (!photos.length) return;

  const thumbnail = photos[0].thumbnail || await compressTo(photos[0].dataUrl, 100, 0.7);
  const images = photos.map((photo) => photo.dataUrl);

  // LOGIC A & B: Existing item (edit / replace / addMore)
  if ((appState.form.addingMorePhotos || appState.form.replacingItem || appState.form.isEditing) && appState.data.currentItem) {
    appState.data.currentItem.thumbnail = thumbnail;
    appState.data.currentItem.hasPhotos = true;
    if (!appState.data.currentItem.status) appState.data.currentItem.status = 'photos';

    await dbPut(S_PHOTOS, { id: appState.data.currentItem.id, images });
    await dbPut(S_ITEMS, appState.data.currentItem);
    setItems(await dbGetAll(S_ITEMS));
    setCurrentItem(appState.data.items.find((item) => item.id === appState.data.currentItem.id));

    const wasAddingMore = appState.form.addingMorePhotos;
    setIsEditing(false);
    appState.form.addingMorePhotos = false;
    appState.form.replacingItem = false;
    const nextItemBtn = document.getElementById('next-item-btn');
    if (nextItemBtn) nextItemBtn.style.display = 'flex';

    await renderDetail();

    if (startNewAfter) {
      startNewItem();
    } else {
      showScreen('screen-detail');
      if (wasAddingMore) analyseItem();
    }
    return;
  }

  // LOGIC C: Brand new item
  const id = `item_${Date.now()}`;
  const item = {
    id, status: 'photos', thumbnail, hasPhotos: true,
    title: '', description: '', category: '', brand: '', size: '', condition: '',
    colours: '', materials: '', createdAt: Date.now(),
  };
  await dbPut(S_ITEMS, item);
  await dbPut(S_PHOTOS, { id, images });
  setItems(await dbGetAll(S_ITEMS));

  if (startNewAfter) {
    startNewItem();
  } else if (backToOrigin) {
    // User was navigating away — save the item but return to where they came from
    setCurrentItem(item);
    goHome();
  } else {
    setCurrentItem(item);
    showScreen('screen-detail');
    renderDetail();
  }
}


/** Utility to save current batch and immediately open a blank camera screen */
export async function saveAndStartNewItem() {
  const photos = appState.form.pendingPhotos.filter(Boolean);
  if (photos.length > 0) {
    await savePhotos(true); 
  } else {
    startNewItem();
  }
}
