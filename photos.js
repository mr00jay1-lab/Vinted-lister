import { appState, MAX_PHOTOS, DEFAULT_PHOTOS, savePhotoMode, S_ITEMS, S_PHOTOS, setItems, setCurrentItem } from './state.js';
import { dbPut, dbGet, dbGetAll } from './db.js';
import { compressTo } from './utils.js';
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
  appState.replacingItem = false;
  appState.addingMorePhotos = false;
  appState.isEditing = false;
  appState.photosDirty = false;
  appState.photosReturnScreen = 'screen-home';
  appState.currentItem = null;
  appState.pendingPhotos = [];
  appState.pendingSlot = null;

  // Restore the "New Item" button just in case it was hidden by openEditPhotos
  const nextItemBtn = document.getElementById('next-item-btn');
  if (nextItemBtn) nextItemBtn.style.display = 'flex';

  document.getElementById('addphotos-title').textContent = 'Add Photos';
  document.getElementById('addphotos-sub').textContent = 'Choose your capture method';
  
  appState.photoMode = localStorage.getItem('vinted_photo_mode') || 'camera';
  initPhotoScreen();
  showScreen('screen-addphotos');
}

/** Prepares UI to overwrite existing photos */
export async function openReplacePhotos() {
  appState.replacingItem = true;
  appState.addingMorePhotos = false;
  appState.photosDirty = false;
  appState.photosReturnScreen = 'screen-detail';
  appState.pendingPhotos = [];
  if (appState.currentItem && appState.currentItem.hasPhotos) {
    const rec = await dbGet(S_PHOTOS, appState.currentItem.id);
    if (rec && rec.images) {
      appState.pendingPhotos = rec.images.map((image) => ({ dataUrl: image, thumbnail: null }));
    }
  }
  document.getElementById('addphotos-title').textContent = 'Replace Photos';
  document.getElementById('addphotos-sub').textContent = 'Edit or replace existing photos';
  initPhotoScreen();
  showScreen('screen-addphotos');
}

/** Prepares UI to add to existing photos */
export async function openAddMorePhotos() {
  appState.addingMorePhotos = true;
  appState.replacingItem = false;
  appState.photosDirty = false;
  appState.photosReturnScreen = 'screen-detail';
  appState.pendingPhotos = [];
  if (appState.currentItem && appState.currentItem.hasPhotos) {
    const rec = await dbGet(S_PHOTOS, appState.currentItem.id);
    if (rec && rec.images) {
      appState.pendingPhotos = rec.images.map((image) => ({ dataUrl: image, thumbnail: null }));
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
  document.getElementById('mode-btn-camera').classList.toggle('active', appState.photoMode === 'camera');
  document.getElementById('mode-btn-library').classList.toggle('active', appState.photoMode === 'library');
  renderSlots();
}

/* ==========================================================================
   SECTION 2: NAVIGATION & EXIT GUARDS
   ========================================================================== */

/** Discards the current session and returns to the screen that launched photos */
export function discardAndGoHome() {
  closeModal('modal-unsaved-photos');
  appState.pendingPhotos = [];
  appState.photosDirty = false;

  // Clean up mode flags
  if (appState.isEditing) {
    appState.isEditing = false;
    const nextItemBtn = document.getElementById('next-item-btn');
    if (nextItemBtn) nextItemBtn.style.display = 'flex';
  }
  appState.replacingItem = false;
  appState.addingMorePhotos = false;

  if (appState.photosReturnScreen === 'screen-home') {
    goHome();
  } else {
    showScreen(appState.photosReturnScreen);
  }
}

/* ==========================================================================
   SECTION 3: PHOTO GRID & SLOT MANAGEMENT
   ========================================================================== */

/** Draws the interactive photo slots (placeholders or images) */
export function renderSlots() {
  const grid = document.getElementById('photo-grid');
  const filled = appState.pendingPhotos.filter(Boolean).length;
  const totalSlots = Math.min(MAX_PHOTOS, filled < DEFAULT_PHOTOS ? DEFAULT_PHOTOS : filled + 1);

  let html = '';
  for (let i = 0; i < totalSlots; i += 1) {
    const photo = appState.pendingPhotos[i];
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
  const count = appState.pendingPhotos.filter(Boolean).length;
  document.getElementById('photo-msg').textContent = count
    ? `${count} photo${count > 1 ? 's' : ''} ready — tap any to replace`
    : 'Add at least 1 photo to continue';
  
  // Disable "Continue" button if no photos exist
  const analyzeBtn = document.getElementById('save-photos-btn');
  if (analyzeBtn) analyzeBtn.disabled = count === 0;
}

/** Removes a specific photo and re-compacts the list */
export function removeSlot(index) {
  appState.pendingPhotos[index] = null;
  appState.photosDirty = true;
  while (appState.pendingPhotos.length && !appState.pendingPhotos[appState.pendingPhotos.length - 1]) {
    appState.pendingPhotos.pop();
  }
  hideBanner();
  renderSlots();
}

/** Triggers the native OS file/camera picker */
export function slotTapped(index) {
  appState.pendingSlot = index;
  const inputId = appState.photoMode === 'camera' ? 'photo-input-camera' : 'photo-input-library';
  const input = document.getElementById(inputId);
  input.value = '';
  input.click();
}

/** Automatically triggers camera for the next available empty slot */
export function triggerNextCamera() {
  let next = -1;
  for (let i = 0; i < MAX_PHOTOS; i += 1) {
    if (!appState.pendingPhotos[i]) {
      next = i;
      break;
    }
  }
  if (next === -1) {
    hideBanner();
    renderSlots();
    return;
  }
  appState.pendingSlot = next;
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
    if (!appState.pendingPhotos.filter(Boolean).length) goHome();
    return;
  }

  if (mode === 'library') {
    // Handling multiple files from Gallery
    let slotIndex = appState.pendingSlot !== null ? appState.pendingSlot : appState.pendingPhotos.filter(Boolean).length;
    let processed = 0;
    const maxFiles = Math.min(files.length, MAX_PHOTOS - (appState.pendingSlot !== null ? appState.pendingSlot : 0));

    files.slice(0, maxFiles).forEach((file) => {
      const currentSlot = slotIndex++;
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        const dataUrl = loadEvent.target.result;
        const thumbnail = await compressTo(dataUrl, 100, 0.7);
        const medium = await compressTo(dataUrl, 1200, 0.85);
        appState.pendingPhotos[currentSlot] = { dataUrl: medium, thumbnail };
        appState.photosDirty = true;
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
    const slot = appState.pendingSlot !== null ? appState.pendingSlot : appState.pendingPhotos.filter(Boolean).length;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const dataUrl = loadEvent.target.result;
      const thumbnail = await compressTo(dataUrl, 100, 0.7);
      const medium = await compressTo(dataUrl, 1200, 0.85);
      appState.pendingPhotos[slot] = { dataUrl: medium, thumbnail };
      appState.pendingSlot = null;
      appState.photosDirty = true;
      renderSlots();

      const filled = appState.pendingPhotos.filter(Boolean).length;
      if (filled < MAX_PHOTOS) {
        const nextEmpty = appState.pendingPhotos.findIndex((photo, index) => !photo && index < MAX_PHOTOS);
        const nextSlot = nextEmpty === -1 ? filled : nextEmpty;
        document.getElementById('next-photo-text').textContent = `📷 Photo ${filled} saved — take another?`;
        document.getElementById('next-photo-banner').style.display = 'flex';
        appState.pendingSlot = nextSlot;
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
/** Saves pending photos to IndexedDB and navigates to Detail screen */
export async function savePhotos(startNewAfter = false) {
  document.getElementById('modal-unsaved-photos').style.display = 'none';
  appState.photosDirty = false;
  const photos = appState.pendingPhotos.filter(Boolean);
  if (!photos.length) return;

  let thumbnail = photos[0].thumbnail;
  if (!thumbnail) {
    thumbnail = appState.currentItem?.thumbnail || await compressTo(photos[0].dataUrl, 100, 0.7);
  }
  const images = photos.map((photo) => photo.dataUrl);

  // LOGIC A & B: Handling Existing Item (Adding, Replacing, or Editing)
  if ((appState.addingMorePhotos || appState.replacingItem || appState.isEditing) && appState.currentItem) {
    appState.currentItem.thumbnail = thumbnail;
    appState.currentItem.hasPhotos = true;
    
    // If it was just 'photos' status, keep it. If it was higher, keep it.
    if (!appState.currentItem.status) appState.currentItem.status = 'photos';

    await dbPut(S_PHOTOS, { id: appState.currentItem.id, images });
    await dbPut(S_ITEMS, appState.currentItem);

    setItems(await dbGetAll(S_ITEMS));
    setCurrentItem(appState.items.find((item) => item.id === appState.currentItem.id));
    
    // Reset our Edit flag and restore UI
    appState.isEditing = false;
    const nextItemBtn = document.getElementById('next-item-btn');
    if (nextItemBtn) nextItemBtn.style.display = 'flex';

    await renderDetail();
    
    if (startNewAfter) { 
      startNewItem(); 
    } else { 
      showScreen('screen-detail'); 
      // If we were "Adding More", we usually want a re-analysis
      if (appState.addingMorePhotos) analyseItem(); 
    }
    
    // Reset mode flags
    appState.addingMorePhotos = false;
    appState.replacingItem = false;
    return;
  }

  // LOGIC C: Creating a brand new item (unchanged)
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
  } else {
    setCurrentItem(item);
    showScreen('screen-detail');
    renderDetail();
  }
}


/** Utility to save current batch and immediately open a blank camera screen */
export async function saveAndStartNewItem() {
  const photos = appState.pendingPhotos.filter(Boolean);
  if (photos.length > 0) {
    await savePhotos(true); 
  } else {
    startNewItem();
  }
}
