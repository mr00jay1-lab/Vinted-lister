import { appState, MAX_PHOTOS, DEFAULT_PHOTOS, savePhotoMode, S_ITEMS, S_PHOTOS } from './state.js';
import { dbPut, dbGet, dbGetAll } from './db.js';
import { compressTo } from './utils.js';
import { analyseItem } from './analysis.js';
import { renderDetail, renderHome, goHome, showScreen } from './ui.js';

export function setPhotoMode(mode) {
  savePhotoMode(mode);
  document.getElementById('mode-btn-camera').classList.toggle('active', mode === 'camera');
  document.getElementById('mode-btn-library').classList.toggle('active', mode === 'library');
  hideBanner();
  renderSlots();
}

function hideBanner() {
  document.getElementById('next-photo-banner').style.display = 'none';
}

export function startNewItem() {
  appState.replacingItem = false;
  appState.addingMorePhotos = false;
  appState.currentItem = null;
  appState.pendingPhotos = [];
  appState.pendingSlot = null;
  document.getElementById('addphotos-title').textContent = 'Add Photos';
  document.getElementById('addphotos-sub').textContent = 'Choose your capture method';
  appState.photoMode = localStorage.getItem('vinted_photo_mode') || 'camera';
  initPhotoScreen();
  showScreen('screen-addphotos');
}

export async function openReplacePhotos() {
  appState.replacingItem = true;
  appState.addingMorePhotos = false;
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

export async function openAddMorePhotos() {
  appState.addingMorePhotos = true;
  appState.replacingItem = false;
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

export function initPhotoScreen() {
  hideBanner();
  document.getElementById('mode-btn-camera').classList.toggle('active', appState.photoMode === 'camera');
  document.getElementById('mode-btn-library').classList.toggle('active', appState.photoMode === 'library');
  renderSlots();
}

export function renderSlots() {
  const grid = document.getElementById('photo-grid');
  const filled = appState.pendingPhotos.filter(Boolean).length;
  const totalSlots = Math.min(MAX_PHOTOS, filled < DEFAULT_PHOTOS ? DEFAULT_PHOTOS : filled + 1);

  let html = '';
  for (let i = 0; i < totalSlots; i += 1) {
    const photo = appState.pendingPhotos[i];
    if (photo) {
      html += `
        <div class="photo-slot" onclick="slotTapped(${i})">
          <img src="${photo.dataUrl}" />
          <button class="remove-btn" onclick="event.stopPropagation();removeSlot(${i})">✕</button>
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
  document.getElementById('save-photos-btn').disabled = count === 0;
}

export function removeSlot(index) {
  appState.pendingPhotos[index] = null;
  while (appState.pendingPhotos.length && !appState.pendingPhotos[appState.pendingPhotos.length - 1]) {
    appState.pendingPhotos.pop();
  }
  hideBanner();
  renderSlots();
}

export function slotTapped(index) {
  appState.pendingSlot = index;
  if (appState.photoMode === 'camera') {
    const input = document.getElementById('photo-input-camera');
    input.value = '';
    input.click();
  } else {
    const input = document.getElementById('photo-input-library');
    input.value = '';
    input.click();
  }
}

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

export function handlePhoto(event, mode) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) {
    if (!appState.pendingPhotos.filter(Boolean).length) goHome();
    return;
  }

  if (mode === 'library') {
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
        processed += 1;
        if (processed === maxFiles) {
          hideBanner();
          renderSlots();
        }
      };
      reader.readAsDataURL(file);
    });
  } else {
    const file = files[0];
    const slot = appState.pendingSlot !== null ? appState.pendingSlot : appState.pendingPhotos.filter(Boolean).length;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const dataUrl = loadEvent.target.result;
      const thumbnail = await compressTo(dataUrl, 100, 0.7);
      const medium = await compressTo(dataUrl, 1200, 0.85);
      appState.pendingPhotos[slot] = { dataUrl: medium, thumbnail };
      appState.pendingSlot = null;
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

export async function savePhotos() {
  document.getElementById('modal-unsaved-photos').style.display = 'none';
  const photos = appState.pendingPhotos.filter(Boolean);
  if (!photos.length) return;

  let thumbnail = photos[0].thumbnail;
  if (!thumbnail) {
    thumbnail = appState.currentItem?.thumbnail || await compressTo(photos[0].dataUrl, 100, 0.7);
  }
  const images = photos.map((photo) => photo.dataUrl);

  if (appState.addingMorePhotos && appState.currentItem) {
    appState.currentItem.thumbnail = thumbnail;
    appState.currentItem.hasPhotos = true;
    appState.currentItem.status = 'photos';
    await dbPut(S_PHOTOS, { id: appState.currentItem.id, images });
    await dbPut(S_ITEMS, appState.currentItem);
    appState.items = await dbGetAll(S_ITEMS);
    appState.currentItem = appState.items.find((item) => item.id === appState.currentItem.id);
    await renderDetail();
    showScreen('screen-detail');
    analyseItem();
    return;
  }

  if (appState.replacingItem && appState.currentItem) {
    appState.currentItem.thumbnail = thumbnail;
    appState.currentItem.hasPhotos = true;
    await dbPut(S_PHOTOS, { id: appState.currentItem.id, images });
    await dbPut(S_ITEMS, appState.currentItem);
    appState.items = await dbGetAll(S_ITEMS);
    appState.currentItem = appState.items.find((item) => item.id === appState.currentItem.id);
    await renderDetail();
    showScreen('screen-detail');
    return;
  }

  const id = `item_${Date.now()}`;
  const item = {
    id,
    status: 'photos',
    thumbnail,
    hasPhotos: true,
    title: '',
    description: '',
    category: '',
    brand: '',
    size: '',
    condition: '',
    colours: '',
    materials: '',
    parcel: '',
    price: '',
    createdAt: Date.now(),
  };
  await dbPut(S_ITEMS, item);
  await dbPut(S_PHOTOS, { id, images });
  appState.items = await dbGetAll(S_ITEMS);
  goHome();
}
