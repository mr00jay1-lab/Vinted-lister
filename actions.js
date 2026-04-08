import { appState, S_ITEMS, S_PHOTOS } from './state.js';
import { dbDelete, dbGet, dbGetAll, dbPut } from './db.js';
import { goHome, renderDetail, renderHome, updateStorageBar, showScreen, closeModal } from './ui.js';

export function openItem(id) {
  appState.currentItem = appState.items.find((item) => item.id === id);
  if (!appState.currentItem) return;
  appState.dirty = false;
  appState.aiSelectedIndices = [0, 1];
  resetStatePhotos();
  renderDetail();
  showScreen('screen-detail');
}

export async function deleteItem() {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  await dbDelete(S_ITEMS, appState.currentItem.id);
  await dbDelete(S_PHOTOS, appState.currentItem.id);
  appState.items = await dbGetAll(S_ITEMS);
  goHome();
}

export function markDirty() {
  appState.dirty = true;
  document.getElementById('save-edits-btn').style.display = 'flex';
}

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
    parcel: document.getElementById('f-parcel').value,
    price: document.getElementById('f-price').value,
  });
  await dbPut(S_ITEMS, appState.currentItem);
  appState.items = await dbGetAll(S_ITEMS);
  appState.dirty = false;
  document.getElementById('save-edits-btn').style.display = 'none';
  document.getElementById('detail-heading').textContent = appState.currentItem.title || 'Untitled item';
}

export function handleSetStatus(status) {
  if (['sold', 'archived'].includes(status) && appState.currentItem.hasPhotos) {
    appState.pendingStatus = status;
    document.getElementById('drop-title').textContent = `Mark as ${status === 'sold' ? 'Sold' : 'Archived'}?`;
    document.getElementById('modal-drop-photos').style.display = 'flex';
  } else {
    setStatus(status);
  }
}

export async function confirmDropPhotos() {
  closeModal('modal-drop-photos');
  await dbDelete(S_PHOTOS, appState.currentItem.id);
  appState.currentItem.hasPhotos = false;
  appState.currentItem.thumbnail = null;
  await setStatus(appState.pendingStatus);
  appState.pendingStatus = null;
}

export async function setStatus(status) {
  appState.currentItem.status = status;
  appState.currentItem.statusChangedAt = Date.now();
  await dbPut(S_ITEMS, appState.currentItem);
  appState.items = await dbGetAll(S_ITEMS);
  appState.currentItem = appState.items.find((item) => item.id === appState.currentItem.id);
  await renderDetail();
  updateStorageBar();
}

export async function showDownloadModal() {
  if (!appState.currentItem.hasPhotos) {
    alert('No photos stored for this item.');
    return;
  }

  const rec = await dbGet(S_PHOTOS, appState.currentItem.id);
  if (!rec?.images?.length) {
    alert('No photos found.');
    return;
  }

  const grid = document.getElementById('download-photo-grid');
  grid.innerHTML = rec.images
    .map((photo, index) => `
      <div class="photo-save-item">
        <img src="${photo}" alt="Photo ${index + 1}" />
        <div class="photo-save-label">Hold & save</div>
      </div>
    `)
    .join('');

  document.getElementById('modal-download').style.display = 'flex';
}

export function toggleAiPhoto(index) {
  if (appState.aiSelectedIndices.includes(index)) {
    if (appState.aiSelectedIndices.length <= 1) return;
    appState.aiSelectedIndices = appState.aiSelectedIndices.filter((i) => i !== index);
  } else {
    if (appState.aiSelectedIndices.length >= 10) return;
    appState.aiSelectedIndices = [...appState.aiSelectedIndices, index].sort((a, b) => a - b);
  }

  const grid = document.getElementById('detail-photos');
  grid.querySelectorAll('.detail-photo-slot').forEach((slot, idx) => {
    const selected = appState.aiSelectedIndices.includes(idx);
    slot.classList.toggle('ai-selected', selected);
    const badge = slot.querySelector('.ai-badge');
    if (selected && !badge) {
      const element = document.createElement('div');
      element.className = 'ai-badge';
      element.textContent = '🔍 AI';
      slot.appendChild(element);
    } else if (!selected && badge) {
      badge.remove();
    }
  });
}

export function finishCopyFlow() {
  document.getElementById('modal-listed').style.display = 'flex';
}

export async function confirmListed() {
  await setStatus('listed');
  closeModal('modal-listed');
  goHome();
}

export function skipField() {
  if (appState.copyIdx < appState.copyFields.length - 1) {
    appState.copyIdx += 1;
    renderCopyField();
  }
}

export function nextField() {
  appState.copyIdx += 1;
  renderCopyField();
}

export function copyField() {
  const value = appState.copyFields[appState.copyIdx].value;
  const isLast = appState.copyIdx === appState.copyFields.length - 1;
  navigator.clipboard.writeText(value).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
  document.getElementById('copied-msg').style.opacity = '1';
  document.getElementById('copy-action-row').style.display = 'none';
  document.getElementById(isLast ? 'btn-done' : 'btn-next').style.display = 'flex';
}

export function renderCopyField() {
  const field = appState.copyFields[appState.copyIdx];
  const isLast = appState.copyIdx === appState.copyFields.length - 1;
  document.getElementById('copy-progress').textContent = `Field ${appState.copyIdx + 1} of ${appState.copyFields.length}`;
  document.getElementById('copy-label').textContent = field.label;
  const valueElement = document.getElementById('copy-value');
  valueElement.textContent = field.value || '—';
  valueElement.className = 'copy-value' + (field.value.length > 60 ? ' long' : '');
  document.getElementById('copy-dots').innerHTML = appState.copyFields
    .map((_, index) => `<div class="dot${index <= appState.copyIdx ? ' active' : ''}"></div>`)
    .join('');
  document.getElementById('copy-action-row').style.display = 'flex';
  document.getElementById('btn-skip').style.display = isLast ? 'none' : 'flex';
  document.getElementById('btn-next').style.display = 'none';
  document.getElementById('btn-done').style.display = 'none';
  document.getElementById('copied-msg').style.opacity = '0';
}

export function startCopyFlow() {
  const item = appState.currentItem;
  appState.copyFields = [
    { label: 'Title', value: item.title || '' },
    { label: 'Description', value: item.description || '' },
    { label: 'Category', value: item.category || '' },
    { label: 'Brand', value: item.brand || '' },
    { label: 'Size', value: item.size || '' },
    { label: 'Condition', value: item.condition || '' },
    { label: 'Colour', value: item.colours || '' },
    { label: 'Material', value: item.materials || '' },
    { label: 'Parcel Size', value: item.parcel || '' },
  ];
  appState.copyIdx = 0;
  renderCopyField();
  showScreen('screen-copy');
}

    .map((suggestion, index) => `
      <div class="suggest-item">
        <div class="suggest-item-text">${index + 1}. ${suggestion}</div>
        <button class="suggest-item-del" onclick="deleteSuggestion(${index})">✕</button>
      </div>
    `)
    .join('');
}

function resetStatePhotos() {
  document.getElementById('state-photos').innerHTML = `
    <button class="btn btn-primary" onclick="analyseItem()">🔍 &nbsp;Analyse with AI</button>
    <button class="btn btn-outline" onclick="openReplacePhotos()">Replace Photos</button>
  `;
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'modal-listed') showScreen('screen-detail');
}
