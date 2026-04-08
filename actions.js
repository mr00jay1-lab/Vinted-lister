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
  }
}

export function nextField() {
  appState.copyIdx += 1;
}

export function copyFieldValue(fieldIdx) {
  const value = appState.copyFields[fieldIdx].value;
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
  copiedMsg.style.display = 'flex';
  setTimeout(() => {
    copiedMsg.style.display = 'none';
  }, 1500);
}

export function nextCopyPage() {
  appState.copyIdx = 1; // Move to page 2
  document.getElementById('copy-page-1').style.display = 'none';
  document.getElementById('copy-page-2').style.display = 'grid';
  document.getElementById('copy-page').textContent = '2';
  document.getElementById('btn-prev-page').style.display = 'flex';
  document.getElementById('btn-next-page').style.display = 'none';
}

export function prevCopyPage() {
  appState.copyIdx = 0; // Move to page 1
  document.getElementById('copy-page-1').style.display = 'grid';
  document.getElementById('copy-page-2').style.display = 'none';
  document.getElementById('copy-page').textContent = '1';
  document.getElementById('btn-prev-page').style.display = 'none';
  document.getElementById('btn-next-page').style.display = 'flex';
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
  ];
  appState.copyIdx = 0;
  
  // Render all fields
  appState.copyFields.forEach((field, idx) => {
    const fieldEl = document.getElementById(`copy-field-${idx}`);
    if (fieldEl) {
      fieldEl.querySelector('.copy-field-value').textContent = field.value || '—';
    }
  });
  
  // Reset to page 1
  document.getElementById('copy-page-1').style.display = 'grid';
  document.getElementById('copy-page-2').style.display = 'none';
  document.getElementById('copy-page').textContent = '1';
  document.getElementById('btn-prev-page').style.display = 'none';
  document.getElementById('btn-next-page').style.display = 'flex';
  
  showScreen('screen-copy');
}

export function renderCopyField() {
  // This function is replaced by the new click-to-copy logic, kept for compatibility
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
