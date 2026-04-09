import { appState, STATUS_LABELS, STATUS_BADGE_CLASSES, getApiKey, saveApiKeyValue, APP_VERSION, BRANCH_NAME, S_ITEMS, S_PHOTOS } from './state.js';
import { dbGet, dbGetAll, dbPut, dbDelete, openDB } from './db.js';
import { renderSuggestions } from './suggestions.js';

export async function initApp() {
  await openDB();
  appState.items = await dbGetAll(S_ITEMS);
  await autoClean();
  renderSuggestions();
  
  // Display version and branch on both pages
  const versionParts = APP_VERSION.split('-');
  const versionNum = versionParts[0].substring(1); 
  
  document.getElementById('version-display').textContent = versionNum;
  document.getElementById('branch-display').textContent = BRANCH_NAME;
  
  document.getElementById('version-display-apikey').textContent = versionNum;
  document.getElementById('branch-display-apikey').textContent = BRANCH_NAME;

  // 🚨 THE MISSING LOGIC 🚨
  const savedKey = getApiKey();
  
  if (savedKey && savedKey.startsWith('sk-')) {
    // Key found! Go to list of clothes.
    goHome(); 
  } else {
    // No key! Show the entry screen.
    showScreen('screen-apikey');
  }
}

export function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) {
    alert('Please enter an API key');
    return;
  }
  if (!key.startsWith('sk-')) {
    alert('Please enter a valid Anthropic API key (starts with sk-)');
    return;
  }
  
  // Close keyboard on mobile natively
  document.getElementById('api-key-input').blur();
  
  saveApiKeyValue(key);
  goHome();
}

export function handleApiFormSubmit(event) {
  if (event) event.preventDefault(); // Stop the reload instantly
  saveApiKey();                      // Run your logic
}

export function handleSuggestFormSubmit(event) {
  if (event) event.preventDefault();
  window.addSuggestion(); // Explicitly call the global one
}


export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

export async function updateStorageBar() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 100 * 1024 * 1024 } = await navigator.storage.estimate();
      const pct = Math.min(100, (usage / quota) * 100);
      const fill = document.getElementById('storage-fill');
      fill.style.width = pct + '%';
      fill.className = 'storage-bar-fill' + (pct > 80 ? ' danger' : pct > 50 ? ' warn' : '');
      document.getElementById('storage-label').textContent = `${(usage / 1024 / 1024).toFixed(1)} MB used`;
      return;
    }
    document.getElementById('storage-label').textContent = 'Storage OK';
    document.getElementById('storage-fill').style.width = '5%';
  } catch (error) {
    document.getElementById('storage-label').textContent = 'Storage OK';
  }
}

export async function autoClean() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const item of appState.items) {
    if (['sold', 'archived'].includes(item.status) && item.hasPhotos && (item.statusChangedAt || 0) < cutoff) {
      await dbDelete(S_PHOTOS, item.id);
      item.hasPhotos = false;
      item.thumbnail = null;
      await dbPut(S_ITEMS, item);
    }
  }
  appState.items = await dbGetAll(S_ITEMS);
}

export function setFilter(filter, button) {
  appState.filter = filter;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  button.classList.add('active');
  renderHome();
}

export function goHome() {
  renderHome();
  updateStorageBar();
  showScreen('screen-home');
}

export function resetStatePhotos() {
  document.getElementById('state-photos').innerHTML = `
    <button class="btn btn-primary" onclick="window.analyseItem()">🔍 &nbsp;Analyse with AI</button>
    <button class="btn btn-outline" onclick="window.openReplacePhotos()">Replace Photos</button>
  `;
}

export async function renderDetail() {
  const item = appState.currentItem;
  document.getElementById('detail-heading').textContent = item.title || 'Untitled item';
  document.getElementById('detail-badge-wrap').innerHTML = `<span class="badge ${STATUS_BADGE_CLASSES[item.status]}">${STATUS_LABELS[item.status]}</span>`;

  const grid = document.getElementById('detail-photos');
  const hintEl = document.getElementById('detail-photo-hint');
  if (item.hasPhotos) {
    const rec = await dbGet(S_PHOTOS, item.id);
    if (rec && rec.images) {
      grid.innerHTML = rec.images
        .map((photo, index) => {
          const selected = appState.aiSelectedIndices.includes(index);
          return `
            <div class="detail-photo-slot${selected ? ' ai-selected' : ''}" onclick="window.toggleAiPhoto(${index})">
              <img src="${photo}" />${selected ? '<div class="ai-badge">🔍 AI</div>' : ''}
            </div>
          `;
        })
        .join('');
      hintEl.style.display = 'block';
    } else {
      grid.innerHTML = '<p style="font-size:13px;color:var(--text3);grid-column:span 2;">Photos not found.</p>';
      hintEl.style.display = 'none';
    }
  } else {
    grid.innerHTML = '<p style="font-size:13px;color:var(--text3);grid-column:span 2;">Photos removed to save space.</p>';
    hintEl.style.display = 'none';
  }

  const analysed = ['analysed', 'listed', 'sold', 'archived'].includes(item.status);
  document.getElementById('state-photos').style.display = analysed ? 'none' : 'block';
  document.getElementById('state-analysed').style.display = analysed ? 'block' : 'none';

  if (analysed) {
    document.getElementById('f-title').value = item.title || '';
    document.getElementById('f-description').value = item.description || '';
    document.getElementById('f-category').value = item.category || '';
    document.getElementById('f-brand').value = item.brand || '';
    document.getElementById('f-size').value = item.size || '';
    document.getElementById('f-condition').value = item.condition || 'Good';
    document.getElementById('f-colours').value = item.colours || '';
    document.getElementById('f-materials').value = item.materials || '';
    document.getElementById('f-parcel').value = item.parcel || '';
    document.getElementById('f-price').value = item.price || '';
    document.getElementById('save-edits-btn').style.display = 'none';
  }

  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.value = item.status;
    statusSelect.className = 'status-select st-' + item.status;
  }
}

export async function renderHome() {
  const list = document.getElementById('item-list');
  const photoItems = appState.items.filter((item) => item.status === 'photos');
  const batchBtn = document.getElementById('btn-batch-analyse');
  if (batchBtn) batchBtn.style.display = photoItems.length ? 'flex' : 'none';

  const filtered = [...appState.items].reverse().filter((item) => {
    if (appState.filter === 'all') return item.status !== 'archived';
    return item.status === appState.filter;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="icon">👗</div><h2>${appState.filter === 'all' ? 'No items yet' : 'Nothing here'}</h2><p>${appState.filter === 'all' ? 'Tap the button below to photograph your first item.' : 'No items with this status yet.'}</p></div>`;
    return;
  }

  list.innerHTML = filtered
    .map((item) => {
      const thumb = item.thumbnail ? `<img src="${item.thumbnail}" alt="" />` : '<span>👕</span>';
      const meta = [item.price ? `£${item.price}` : '', item.brand ? `· ${item.brand}` : '']
        .filter(Boolean)
        .join(' ');
      return `
        <div class="item-card" onclick="window.openItem('${item.id}')">
          <div class="item-thumb">${thumb}</div>
          <div class="item-info">
            <div class="item-title">${item.title || 'Untitled item'}</div>
            <div class="item-meta">${meta}</div>
            <span class="badge ${STATUS_BADGE_CLASSES[item.status]}">${STATUS_LABELS[item.status]}</span>
          </div>
          <div class="chevron">›</div>
        </div>
      `;
    })
    .join('');
}

export function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'modal-listed') showScreen('screen-detail');
}

