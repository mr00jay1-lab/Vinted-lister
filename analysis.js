import { appState, S_PHOTOS, S_ITEMS, getApiKey } from './state.js';
import { dbGet, dbPut } from './db.js';
import { parseAnthropicJson } from './utils.js';
import { renderDetail, renderHome, resetStatePhotos, closeModal, showScreen, updateStorageBar } from './ui.js';

const ANALYSIS_PROMPT = `Analyse these photos of a second-hand clothing/fashion item for a Vinted listing.
Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "concise listing title max 50 chars, include brand+item+colour",
  "description": "2-3 sentences for a Vinted buyer. Mention fit, style, any visible scratches, marks or flaws honestly. English only.",
  "category": "Vinted category e.g. Women's Clothing > Dresses",
  "brand": "brand name or Unknown",
  "size": "size from label if visible, else empty string",
  "condition": "New with tags|Like new|Good|Fair|Poor",
  "colours": ["primary colour", "secondary colour if present"],
  "materials": ["primary material", "secondary material if identifiable"],
  "parcel_size": "XS|S|M|L|XL — best guess based on item type and size"
}`;

function formatAnalysisResult(item, json) {
  return {
    ...item,
    title: json.title || '',
    description: json.description || '',
    category: json.category || '',
    brand: json.brand || '',
    size: json.size || '',
    condition: json.condition || 'Good',
    colours: Array.isArray(json.colours) ? json.colours.join(', ') : (json.colours || ''),
    materials: Array.isArray(json.materials) ? json.materials.join(', ') : (json.materials || ''),
    parcel: (json.parcel_size || '').replace(/[^XSML]/g, ''),
    status: 'analysed',
  };
}

export async function analyseItem() {
  const key = getApiKey();
  if (!key) {
    alert('Please add your API key first.');
    showScreen('screen-apikey');
    return;
  }

  const statePhotos = document.getElementById('state-photos');
  statePhotos.style.display = 'block';
  document.getElementById('state-analysed').style.display = 'none';
  statePhotos.innerHTML = `
    <div class="spinner-wrap">
      <div class="spinner"></div>
      <p style="font-size:16px;font-weight:600;color:var(--text);">Analysing photos…</p>
      <p style="font-size:13px;color:var(--text2);margin-top:6px;">Usually takes 10–15 seconds</p>
    </div>
  `;

  const itemId = appState.currentItem?.id;
  const rec = appState.currentItem?.hasPhotos ? await dbGet(S_PHOTOS, appState.currentItem.id) : null;
  const allImages = rec?.images || [];
  if (!allImages.length) {
    alert('No photos found.');
    resetStatePhotos();
    return;
  }

  const images = appState.aiSelectedIndices.filter((index) => index < allImages.length).map((index) => allImages[index]);
  if (!images.length) {
    alert('No photos selected for analysis.');
    resetStatePhotos();
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 900,
        messages: [{
          role: 'user',
          content: [
            ...images.map((image) => ({
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image.replace(/^data:image\/\w+;base64,/, '') },
            })),
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Unknown API error');
    const raw = data.content?.[0]?.text || '';
    const json = parseAnthropicJson(raw);

    if (!appState.currentItem || appState.currentItem.id !== itemId) return;

    appState.currentItem = formatAnalysisResult(appState.currentItem, json);
    await dbPut(S_ITEMS, appState.currentItem);
    appState.items = await dbGetAll(S_ITEMS);
    appState.currentItem = appState.items.find((item) => item.id === itemId);
    await renderDetail();
  } catch (error) {
    if (!appState.currentItem || appState.currentItem.id !== itemId) return;
    document.getElementById('state-photos').innerHTML = `
      <div style="padding:20px;text-align:center;">
        <p style="color:var(--red);margin-bottom:16px;font-size:15px;">Analysis failed: ${error.message}</p>
<button class="btn btn-primary" onclick="window.resetStatePhotos();window.analyseItem()">Try Again</button>
<button class="btn btn-outline" style="margin-top:8px;" onclick="window.resetStatePhotos()">Cancel</button>
      </div>
    `;
  }
}

export function openBatchAnalyse() {
  const photoItems = appState.items.filter((item) => item.status === 'photos');
  document.getElementById('batch-title').textContent = `Analyse ${photoItems.length} item${photoItems.length > 1 ? 's' : ''}?`;
  document.getElementById('batch-desc').textContent = `AI will analyse up to 2 photos per item. This uses ${photoItems.length} API call${photoItems.length > 1 ? 's' : ''}.`;
  document.getElementById('batch-progress').style.display = 'none';
  document.getElementById('batch-confirm-btn').style.display = 'flex';
  document.getElementById('batch-cancel-btn').style.display = 'flex';
  document.getElementById('modal-batch-analyse').style.display = 'flex';
}

export async function runBatchAnalyse() {
  const key = getApiKey();
  if (!key) {
    closeModal('modal-batch-analyse');
    alert('Please add your API key first.');
    showScreen('screen-apikey');
    return;
  }

  const photoItems = appState.items.filter((item) => item.status === 'photos');
  document.getElementById('batch-confirm-btn').style.display = 'none';
  document.getElementById('batch-cancel-btn').style.display = 'none';
  document.getElementById('batch-progress').style.display = 'block';

  let done = 0;
  for (const item of photoItems) {
    document.getElementById('batch-progress-text').textContent = `Analysing item ${done + 1} of ${photoItems.length}…`;
    try {
      const rec = await dbGet(S_PHOTOS, item.id);
      const images = rec?.images?.slice(0, 2) || [];
      if (!images.length) { done += 1; continue; }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 900,
          messages: [{
            role: 'user',
            content: [
              ...images.map((image) => ({
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: image.replace(/^data:image\/\w+;base64,/, '') },
              })),
              { type: 'text', text: ANALYSIS_PROMPT },
            ],
          }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Unknown API error');
      const raw = data.content?.[0]?.text || '';
      const json = parseAnthropicJson(raw);
      const updated = formatAnalysisResult(item, json);
      await dbPut(S_ITEMS, updated);
    } catch (error) {
      // continue on failure
    }
    done += 1;
  }

  appState.items = await dbGetAll(S_ITEMS);
  closeModal('modal-batch-analyse');
  renderHome();
  updateStorageBar();
}

