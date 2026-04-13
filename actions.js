import { appState, S_ITEMS, S_PHOTOS, setItems, setCurrentItem } from './state.js';
import { dbDelete, dbGet, dbGetAll, dbPut } from './db.js';
import { goHome, renderDetail, updateStorageBar, showScreen, closeModal, resetStatePhotos } from './ui.js';
import { initPhotoScreen } from './photos.js';

/* ==========================================================================
   SECTION 1: ITEM CORE NAVIGATION & MANAGEMENT
   ========================================================================== */

/** Opens a specific item and prepares the detail view */
export function openItem(id) {
  setCurrentItem(appState.data.items.find((item) => item.id === id));
  if (!appState.data.currentItem) return;
  appState.form.dirty = false;
  appState.form.aiSelectedIndices = [0, 1]; // Default first two photos for AI
  resetStatePhotos();
  renderDetail();
  showScreen('screen-detail');
}

/** Deletes current item and associated photos from DB */
export async function deleteItem() {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  await dbDelete(S_ITEMS, appState.data.currentItem.id);
  await dbDelete(S_PHOTOS, appState.data.currentItem.id);
  setItems(await dbGetAll(S_ITEMS));
  goHome();
}

/** Monitors changes to fields to show the 'Save' button */
export function markDirty() {
  appState.form.dirty = true;
  const saveBtn = document.getElementById('save-edits-btn');
  if (saveBtn) saveBtn.style.display = 'flex';
}

/** Saves manually edited fields back to the Database */
export async function saveEdits() {
  Object.assign(appState.data.currentItem, {
    title: document.getElementById('f-title').value,
    description: document.getElementById('f-description').value,
    category: document.getElementById('f-category').value,
    brand: document.getElementById('f-brand').value,
    size: document.getElementById('f-size').value,
    condition: document.getElementById('f-condition').value,
    colours: document.getElementById('f-colours').value,
    materials: document.getElementById('f-materials').value,
    price: document.getElementById('f-price') ? document.getElementById('f-price').value : appState.data.currentItem.price,
  });

  await dbPut(S_ITEMS, appState.data.currentItem);
  setItems(await dbGetAll(S_ITEMS));
  appState.form.dirty = false;

  if (document.getElementById('save-edits-btn')) {
    document.getElementById('save-edits-btn').style.display = 'none';
  }
  document.getElementById('detail-heading').textContent = appState.data.currentItem.title || 'Untitled item';
}

/* ==========================================================================
   SECTION 2: STATUS & PHOTO OPTIMIZATION
   ========================================================================== */

/** Handles status changes, prompting to delete photos if marking sold/archived */
export function handleSetStatus(status) {
  if (['sold', 'archived'].includes(status) && appState.data.currentItem.hasPhotos) {
    appState.form.pendingStatus = status;
    document.getElementById('drop-title').textContent = `Mark as ${status === 'sold' ? 'Sold' : 'Archived'}?`;
    document.getElementById('modal-drop-photos').style.display = 'flex';
  } else {
    setStatus(status);
  }
}

/** Clears high-res photos to save browser storage space */
export async function confirmDropPhotos() {
  closeModal('modal-drop-photos');
  await dbDelete(S_PHOTOS, appState.data.currentItem.id);
  appState.data.currentItem.hasPhotos = false;
  appState.data.currentItem.thumbnail = '';
  await setStatus(appState.form.pendingStatus);
  appState.form.pendingStatus = null;
}

/** Updates item status in DB and refreshes UI */
export async function setStatus(status) {
  appState.data.currentItem.status = status;
  appState.data.currentItem.statusChangedAt = Date.now();
  await dbPut(S_ITEMS, appState.data.currentItem);
  setItems(await dbGetAll(S_ITEMS));
  setCurrentItem(appState.data.items.find((item) => item.id === appState.data.currentItem.id));
  await renderDetail();
  updateStorageBar();
}

/* ==========================================================================
   SECTION 3: PHOTO MANAGEMENT (EDIT & SAVE)
   ========================================================================== */

/** Toggles which photos will be sent to AI for analysis */
export function toggleAiPhoto(index) {
  const isSelected = appState.form.aiSelectedIndices.includes(index);

  if (isSelected) {
    // Don't allow deselecting the last photo (Analysis needs at least one)
    if (appState.form.aiSelectedIndices.length <= 1) return;
    appState.form.aiSelectedIndices = appState.form.aiSelectedIndices.filter((i) => i !== index);
  } else {
    // Limit to 10 photos for the AI analysis
    if (appState.form.aiSelectedIndices.length >= 10) return;
    appState.form.aiSelectedIndices.push(index);
    appState.form.aiSelectedIndices.sort((a, b) => a - b);
  }
  
  renderDetail(); 
}

/** Redirects to Add Photos screen in "Edit Mode" and loads current photos from DB */
export async function openEditPhotos() {
  const item = appState.data.currentItem;
  if (!item) return;

  // 1. Set flags so savePhotos/back knows we came from detail
  appState.form.isEditing = true;
  appState.form.photosDirty = false;
  appState.ui.photosReturnScreen = 'screen-detail';

  // 2. LOAD THE PHOTOS: Fetch from DB and put into the pending area
  appState.form.pendingPhotos = [];
  if (item.hasPhotos) {
    try {
      const rec = await dbGet(S_PHOTOS, item.id);
      if (rec && rec.images) {
        // Map dataUrls into the object format the photo screen expects
        const storedThumb = appState.data.currentItem?.thumbnail ?? '';
        appState.form.pendingPhotos = rec.images.map((img, i) => ({
          dataUrl: img,
          thumbnail: i === 0 ? storedThumb : '',
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
  initPhotoScreen();
}

/** Handles the back button on Add Photos screen */
export function backFromAddPhotos() {
  if (appState.form.photosDirty) {
    // User has added or removed a photo — ask before leaving
    document.getElementById('modal-unsaved-photos').style.display = 'flex';
  } else {
    // Nothing changed — clean up and navigate straight back
    if (appState.form.isEditing) {
      appState.form.isEditing = false;
      const nextItemBtn = document.getElementById('next-item-btn');
      if (nextItemBtn) nextItemBtn.style.display = 'flex';
      showScreen('screen-detail');
    } else if (appState.ui.photosReturnScreen === 'screen-home') {
      goHome();
    } else {
      showScreen(appState.ui.photosReturnScreen);
    }
  }
}

/* ==========================================================================
   SECTION 4: LISTING FLOW (THE 3-PAGE COPY SYSTEM)
   ========================================================================== */

/** Entry point for the listing process (Page 1) */
export async function startCopyFlow() {
  const item = appState.data.currentItem;
  if (!item) return;

  appState.ui.copyPage = 1;

  // 1. Populate Photos (Page 1) 
  const rec = await dbGet(S_PHOTOS, item.id);
  const grid = document.getElementById('copy-pics-grid');
  
  if (rec && rec.images && grid) {
    // 🚨 UPDATED: Apply the 3-wide grid class and wrap images in slots
    grid.className = 'photo-grid-3wide'; 
    grid.innerHTML = rec.images.map(img => `
      <div class="copy-photo-slot">
        <img src="${img}" alt="Item photo" />
      </div>
    `).join('');
  }

  // 2. Map all item data to the copy-field elements
  appState.form.copyFields = [
    item.title, 
    item.description, 
    item.category,
    item.brand, 
    item.size, 
    item.condition, 
    item.colours, 
    item.materials
  ];

  appState.form.copyFields.forEach((val, i) => {
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
  if (appState.ui.copyPage < 3) {
    appState.ui.copyPage++;
    updateCopyUI();
  }
}

/** Navigation: Move backward in the copy flow */
export function prevCopyPage() {
  if (appState.ui.copyPage > 1) {
    appState.ui.copyPage--;
    updateCopyUI();
  }
}

/** UI Sync: Shows/Hides pages and buttons based on current step */
function updateCopyUI() {
  document.querySelectorAll('.copy-fields-page').forEach(p => p.style.display = 'none');

  const activeStep = document.getElementById(`copy-step-${appState.ui.copyPage}`);
  if (activeStep) activeStep.style.display = 'block';

  const pageNumEl = document.getElementById('copy-page-num');
  if (pageNumEl) pageNumEl.textContent = appState.ui.copyPage;

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  const btnDone = document.getElementById('btn-done');
  const btnFinish = document.getElementById('btn-finish-no-save');

  if (btnPrev) btnPrev.style.visibility = appState.ui.copyPage === 1 ? 'hidden' : 'visible';
  if (btnNext) btnNext.style.display = appState.ui.copyPage === 3 ? 'none' : 'block';
  if (btnDone) btnDone.style.display = appState.ui.copyPage === 3 ? 'block' : 'none';
  if (btnFinish) btnFinish.style.display = appState.ui.copyPage === 3 ? 'none' : 'block';
}

/** Handles actual clipboard copying */
export function copyFieldValue(fieldIdx) {
  const value = appState.form.copyFields[fieldIdx];
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
