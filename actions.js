import { appState, S_ITEMS, S_PHOTOS } from './state.js';
import { dbDelete, dbGet, dbGetAll, dbPut } from './db.js';
import { goHome, renderDetail, updateStorageBar, showScreen, closeModal, resetStatePhotos } from './ui.js';

/* ==========================================================================
   SECTION 1: ITEM CORE NAVIGATION & MANAGEMENT
   ========================================================================== */

/** Opens a specific item and prepares the detail view */
export function openItem(id) {
  appState.currentItem = appState.items.find((item) => item.id === id);
  if (!appState.currentItem) return;
  appState.dirty = false;
  appState.aiSelectedIndices = [0, 1]; // Default first two photos for AI
  resetStatePhotos();
  renderDetail();
  showScreen('screen-detail');
}

/** Deletes current item and associated photos from DB */
export async function deleteItem() {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  await dbDelete(S_ITEMS, appState.currentItem.id);
  await dbDelete(S_PHOTOS, appState.currentItem.id);
  appState.items = await dbGetAll(S_ITEMS);
  goHome();
}

/** Monitors changes to fields to show the 'Save' button */
export function markDirty() {
  appState.dirty = true;
  const saveBtn = document.getElementById('save-edits-btn');
  if (saveBtn) saveBtn.style.display = 'flex';
}

/** Saves manually edited fields back to the Database */
export async function saveEdits() {
  Object.assign(appState.currentItem, {
    title: document.getElementById('f-title').value,
    description: document.getElementById('f-description').value,
    category: document.getElementById('f-category').value,
    brand: document.getElementById('f-brand').value,
    size: document.getElementById('f-size').value,
    condition: document.getElementById('f-condition').value,
    colours: document.getElementById('f-colours').value,
    materials: document.getElementById('f-materials').value,
    price: document.getElementById('f-price') ? document.getElementById('f-price').value : appState.currentItem.price,
  });

  await dbPut(S_ITEMS, appState.currentItem);
  appState.items = await dbGetAll(S_ITEMS);
  appState.dirty = false;
  
  if (document.getElementById('save-edits-btn')) {
    document.getElementById('save-edits-btn').style.display = 'none';
  }
  document.getElementById('detail-heading').textContent = appState.currentItem.title || 'Untitled item';
}

/* ==========================================================================
   SECTION 2: STATUS & PHOTO OPTIMIZATION
   ========================================================================== */

/** Handles status changes, prompting to delete photos if marking sold/archived */
export function handleSetStatus(status) {
  if (['sold', 'archived'].includes(status) && appState.currentItem.hasPhotos) {
    appState.pendingStatus = status;
    document.getElementById('drop-title').textContent = `Mark as ${status === 'sold' ? 'Sold' : 'Archived'}?`;
    document.getElementById('modal-drop-photos').style.display = 'flex';
  } else {
    setStatus(status);
  }
}

/** Clears high-res photos to save browser storage space */
export async function confirmDropPhotos() {
  closeModal('modal-drop-photos');
  await dbDelete(S_PHOTOS, appState.currentItem.id);
  appState.currentItem.hasPhotos = false;
  appState.currentItem.thumbnail = null; 
  await setStatus(appState.pendingStatus);
  appState.pendingStatus = null;
}

/** Updates item status in DB and refreshes UI */
export async function setStatus(status) {
  appState.currentItem.status = status;
  appState.currentItem.statusChangedAt = Date.now();
  await dbPut(S_ITEMS, appState.currentItem);
  appState.items = await dbGetAll(S_ITEMS);
  appState.currentItem = appState.items.find((item) => item.id === appState.currentItem.id);
  await renderDetail();
  updateStorageBar();
}

/* ==========================================================================
   SECTION 3: PHOTO MANAGEMENT (EDIT & SAVE)
   ========================================================================== */

/** Toggles which photos will be sent to AI for analysis */
export function toggleAiPhoto(index) {
  if (appState.aiSelectedIndices.includes(index)) {
    if (appState.aiSelectedIndices.length <= 1) return;
    appState.aiSelectedIndices = appState.aiSelectedIndices.filter((i) => i !== index);
  } else {
    if (appState.aiSelectedIndices.length >= 10) return;
    appState.aiSelectedIndices = [...appState.aiSelectedIndices, index].sort((a, b) => a - b);
  }
  renderDetail(); 
}

/** Redirects to Add Photos screen in "Edit Mode" and loads current photos from DB */
export async function openEditPhotos() {
  const item = appState.currentItem;
  if (!item) return;

  // 1. Set the flag so savePhotos knows to return here
  appState.isEditing = true; 
  
  // 2. LOAD THE PHOTOS: Fetch from DB and put into the pending area
  appState.pendingPhotos = [];
  if (item.hasPhotos) {
    try {
      const rec = await dbGet(S_PHOTOS, item.id);
      if (rec && rec.images) {
        // Map dataUrls into the object format the photo screen expects
        appState.pendingPhotos = rec.images.map(img => ({
          dataUrl: img,
          thumbnail: null // Will be regenerated on save if needed
        }));
      }
    } catch (err) {
      console.error("Failed to load photos for editing:", err);
    }
  }

  // 3. UI Cleanup: Hide "New Item" button
  const nextItemBtn = document.getElementById('next-item-btn');
  if (nextItemBtn) nextItemBtn.style.display = 'none';

  // 4. Switch Screen
  showScreen('screen-addphotos');

  // 5. REFRESH THE GRID: Tell the photo screen to draw the images we just loaded
  if (window.initPhotoScreen) {
    window.initPhotoScreen();
  } else {
    // Fallback if initPhotoScreen isn't on window yet
    const grid = document.getElementById('photo-grid');
    if (grid) window.renderSlots(); 
  }
}

/** Handles the back button on Add Photos screen */
export function backFromAddPhotos() {
  if (appState.isEditing) {
    appState.isEditing = false;
    const nextItemBtn = document.getElementById('next-item-btn');
    if (nextItemBtn) nextItemBtn.style.display = 'flex';
    renderDetail();
    showScreen('screen-detail');
  } else {
    goHome();
  }
}

/* ==========================================================================
   SECTION 4: LISTING FLOW (THE 3-PAGE COPY SYSTEM)
   ========================================================================== */

let currentCopyPage = 1;

/** Entry point for the listing process */
export async function startCopyFlow() {
  const item = appState.currentItem;
  if (!item) return;

  currentCopyPage = 1; 

  // 1. Populate Photos (Page 1) 
  const rec = await dbGet(S_PHOTOS, item.id);
  const grid = document.getElementById('copy-pics-grid');
  
  if (rec && rec.images && grid) {
    grid.innerHTML = rec.images.map(img => 
      `<img src="${img}" alt="Item photo" />`
    ).join('');
  }

  // 2. Map all item data to the copy-field elements
  appState.copyFields = [
    item.title, 
    item.description, 
    item.category,
    item.brand, 
    item.size, 
    item.condition, 
    item.colours, 
    item.materials
  ];

  appState.copyFields.forEach((val, i) => {
    const el = document.querySelector(`#copy-field-${i} .copy-field-value`);
    if (el) el.textContent = val || '—';
    const check = document.querySelector(`#copy-field-${i} .copy-field-copied`);
    if (check) check.style.display = 'none';
  });

  updateCopyUI();
  showScreen('screen-copy');
}

/** Navigation: Move forward in the copy flow */
export function nextCopyPage() {
  if (currentCopyPage < 3) {
    currentCopyPage++;
    updateCopyUI();
  }
}

/** Navigation: Move backward in the copy flow */
export function prevCopyPage() {
  if (currentCopyPage > 1) {
    currentCopyPage--;
    updateCopyUI();
  }
}

/** UI Sync: Shows/Hides pages and buttons based on current step */
function updateCopyUI() {
  document.querySelectorAll('.copy-fields-page').forEach(p => p.style.display = 'none');
  
  const activeStep = document.getElementById(`copy-step-${currentCopyPage}`);
  if (activeStep) activeStep.style.display = 'block';
  
  const pageNumEl = document.getElementById('copy-page-num');
  if (pageNumEl) pageNumEl.textContent = currentCopyPage;

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  const btnDone = document.getElementById('btn-done');
  const btnFinish = document.getElementById('btn-finish-no-save');

  if (btnPrev) btnPrev.style.visibility = currentCopyPage === 1 ? 'hidden' : 'visible';
  if (btnNext) btnNext.style.display = currentCopyPage === 3 ? 'none' : 'block';
  if (btnDone) btnDone.style.display = currentCopyPage === 3 ? 'block' : 'none';
  if (btnFinish) btnFinish.style.display = currentCopyPage === 3 ? 'none' : 'block';
}

/** Handles actual clipboard copying */
export function copyFieldValue(fieldIdx) {
  const value = appState.copyFields[fieldIdx];
  if (!value) return;

  navigator.clipboard.writeText(value).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
  
  const field = document.getElementById(`copy-field-${fieldIdx}`);
  const copiedMsg = field.querySelector('.copy-field-copied');
  if (copiedMsg) {
    copiedMsg.style.display = 'flex';
    setTimeout(() => { copiedMsg.style.display = 'none'; }, 1500);
  }
}

/** Finalizes the listing and moves item to 'listed' status */
export async function finishCopyFlow() {
  await setStatus('listed');
  goHome();
}
