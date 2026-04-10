import { appState, STATUS_LABELS, STATUS_BADGE_CLASSES, getApiKey, saveApiKeyValue, APP_VERSION, BRANCH_NAME, S_ITEMS, S_PHOTOS, setItems, setCurrentItem } from './state.js';
import { dbGet, dbGetAll, dbPut, dbDelete, openDB } from './db.js';
import { renderSuggestions } from './suggestions.js';

/* ==========================================================================
   SECTION 1: APP LIFECYCLE & INITIALIZATION
   ========================================================================== */

/** Bootstraps the app: Opens DB, cleans storage, and handles routing based on API key */
export async function initApp() {
  await openDB();
  appState.items = await dbGetAll(S_ITEMS);
  await autoClean();
  renderSuggestions();
  
  // Extract version number for display (e.g., "v1.0.0")
  const versionParts = APP_VERSION.split('-');
  const versionNum = versionParts[0].substring(1); 
  
  // Update version labels across screens
  document.getElementById('version-display').textContent = versionNum;
  document.getElementById('branch-display').textContent = BRANCH_NAME;
  document.getElementById('version-display-apikey').textContent = versionNum;
  document.getElementById('branch-display-apikey').textContent = BRANCH_NAME;

  // Check for existing Authropic Key
  const savedKey = getApiKey();
  if (savedKey && savedKey.startsWith('sk-')) {
    goHome(); 
  } else {
    showScreen('screen-apikey');
  }
}

/** Automatically removes high-res photos for items sold/archived over 30 days ago */
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
  setItems(await dbGetAll(S_ITEMS));
}

/* ==========================================================================
   SECTION 2: AUTHENTICATION & SETTINGS
   ========================================================================== */

/** Validates and saves the Anthropic API key to local storage */
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
  
  document.getElementById('api-key-input').blur(); // Hide mobile keyboard
  saveApiKeyValue(key);
  goHome();
}

/** Bridges the HTML form submission to the save logic */
export function handleApiFormSubmit(event) {
  if (event) event.preventDefault();
  saveApiKey();
}

/** Bridges the suggestions form submission to the global handler */
export function handleSuggestFormSubmit(event) {
  if (event) event.preventDefault();
  window.addSuggestion();
}

/* ==========================================================================
   SECTION 3: CORE NAVIGATION & UI UTILITIES
   ========================================================================== */

/** Switches active screens and resets scroll position */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/** Returns user to the home screen and refreshes listing data */
export function goHome() {
  renderHome();
  updateStorageBar();
  showScreen('screen-home');
}

/** Closes specific modal overlays */
export function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'modal-listed') showScreen('screen-detail');
}

/** Calculates and displays IndexedDB storage usage */
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

/* ==========================================================================
   SECTION 3b: PHOTO-AREA RENDER HELPERS
   Single source of truth for the #state-photos region.
   Call these instead of setting innerHTML directly elsewhere.
   ========================================================================== */

/** Renders the Edit Photos / Analyse action buttons */
export function renderPhotosActions() {
  const el = document.getElementById('state-photos');
  if (!el) return;
  el.innerHTML = `
    <div class="copy-row">
      <button class="btn btn-outline" onclick="window.openEditPhotos()">📷 Edit Photos</button>
      <button class="btn btn-primary" onclick="window.analyseItem()">🔍 Analyse with AI</button>
    </div>
  `;
}

/** Renders the spinner shown during AI analysis */
export function renderAnalysisSpinner() {
  const el = document.getElementById('state-photos');
  if (!el) return;
  el.innerHTML = `
    <div class="spinner-wrap" style="padding: 20px 0;">
      <div class="spinner"></div>
      <p style="font-size:16px;font-weight:600;color:var(--text);margin-top:12px;">Analysing photos…</p>
      <p style="font-size:13px;color:var(--text3);margin-top:6px;">Usually takes 10–15 seconds</p>
    </div>
  `;
}

/** Renders the error state with a retry option */
export function renderAnalysisError(message) {
  const el = document.getElementById('state-photos');
  if (!el) return;
  el.innerHTML = `
    <div style="padding:20px;text-align:center;">
      <p style="color:var(--red);margin-bottom:16px;font-size:15px;">Analysis failed: ${message}</p>
      <div class="copy-row">
        <button class="btn btn-primary" onclick="window.analyseItem()">Try Again</button>
        <button class="btn btn-outline" onclick="window.renderPhotosActions()">Cancel</button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   SECTION 4: HOME SCREEN RENDERING
   ========================================================================== */

/** Updates the active filter (All, Photos, Analysed, etc.) and re-renders the list */
export function setFilter(filter, button) {
  appState.filter = filter;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  button.classList.add('active');
  renderHome();
}

/** Draws the list of items on the home screen based on active filters */
export async function renderHome() {
  const list = document.getElementById('item-list');
  const photoItems = appState.items.filter((item) => item.status === 'photos');
  
  // Show/Hide Batch Analyse button if there are items in 'photos' status
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
      const meta = [item.brand ? `${item.brand}` : ''].filter(Boolean).join(' ');

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

/* ==========================================================================
   SECTION 5: DETAIL SCREEN RENDERING
   ========================================================================== */

/** Resets the action buttons on the detail screen before analysis */
export function resetStatePhotos() {
  const statePhotos = document.getElementById('state-photos');
  const stateAnalysed = document.getElementById('state-analysed');
  if (!statePhotos || !stateAnalysed) return;

  if (appState.currentItem && appState.currentItem.status !== 'photos') {
    statePhotos.style.display = 'none';
    stateAnalysed.style.display = 'block';
  } else {
    statePhotos.style.display = 'block';
    stateAnalysed.style.display = 'none';
    renderPhotosActions();
  }
}

/** Renders the full detail page including photos, AI details, and listing forms */
export async function renderDetail() {
  const item = appState.currentItem;
  document.getElementById('detail-heading').textContent = item.title || 'Untitled item';
  document.getElementById('detail-badge-wrap').innerHTML = `<span class="badge ${STATUS_BADGE_CLASSES[item.status]}">${STATUS_LABELS[item.status]}</span>`;

  // --- Photo Rendering Section ---
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
      grid.innerHTML = '<p style="font-size:13px;color:var(--text3);grid-column:span 3;text-align:center;">Photos not found.</p>';
      hintEl.style.display = 'none';
    }
  } else {
    grid.innerHTML = '<p style="font-size:13px;color:var(--text3);grid-column:span 3;text-align:center;">Photos removed to save space.</p>';
    hintEl.style.display = 'none';
  }

  // --- Analysis/Form Section ---
  const analysed = ['analysed', 'listed', 'sold', 'archived'].includes(item.status);
  
  // Update the initial state-photos area (pre-analysis)
  document.getElementById('state-photos').style.display = analysed ? 'none' : 'block';
  if (!analysed) renderPhotosActions();

  const stateAnalysed = document.getElementById('state-analysed');
  stateAnalysed.style.display = analysed ? 'block' : 'none';

  if (analysed) {
    stateAnalysed.innerHTML = `
      <div class="section-title">Listing Details</div>
      <div class="field"><label>Title</label><input id="f-title" type="text" oninput="window.markDirty()" /></div>
      <div class="field"><label>Description</label><textarea id="f-description" oninput="window.markDirty()"></textarea></div>
      <div class="field"><label>Category</label><input id="f-category" type="text" oninput="window.markDirty()" /></div>
      
      <div class="fields-grid-2col">
        <div class="field"><label>Brand</label><input id="f-brand" type="text" oninput="window.markDirty()" /></div>
        <div class="field"><label>Size</label><input id="f-size" type="text" oninput="window.markDirty()" /></div>
      </div>

      <div class="fields-grid-2col">
        <div class="field"><label>Condition</label>
          <select id="f-condition" onchange="window.markDirty()">
            <option>New with tags</option><option>Like new</option><option>Good</option><option>Fair</option><option>Poor</option>
          </select>
        </div>
        <div class="field"><label>Colour</label><input id="f-colours" type="text" oninput="window.markDirty()" /></div>
      </div>

      <div class="fields-grid-2col">
        <div class="field"><label>Material</label><input id="f-materials" type="text" oninput="window.markDirty()" /></div>
      </div>

      <button class="btn btn-outline" id="save-edits-btn" onclick="window.saveEdits()" style="display:none; width:100%; margin-bottom:10px;">💾 &nbsp;Save Changes</button>
      
      <div class="section-title">Actions</div>
      
      <div class="copy-row">
        <button class="btn btn-outline" onclick="window.openEditPhotos()">📷 Edit Photos</button>
        <button class="btn btn-primary" onclick="window.analyseItem()">🔍 Re-Analyse</button>
      </div>

      <button class="btn btn-blue" onclick="window.startCopyFlow()" style="width:100%; margin-top:10px;">🏷️ &nbsp;Start Listing</button>
    `;

    // Fill the inputs with current item data
    document.getElementById('f-title').value = item.title || '';
    document.getElementById('f-description').value = item.description || '';
    document.getElementById('f-category').value = item.category || '';
    document.getElementById('f-brand').value = item.brand || '';
    document.getElementById('f-size').value = item.size || '';
    document.getElementById('f-condition').value = item.condition || 'Good';
    document.getElementById('f-colours').value = item.colours || '';
    document.getElementById('f-materials').value = item.materials || '';
  }

  // Sync the status dropdown
  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.value = item.status;
    statusSelect.className = 'status-select st-' + item.status;
  }
}

