import { appState, S_PHOTOS, S_ITEMS, getApiKey, getPersona, getRules, setItems, setCurrentItem } from './state.js';
import { dbGet, dbPut, dbGetAll } from './db.js';
import { parseAnthropicJson } from './utils.js';
import { renderDetail, renderHome, resetStatePhotos, closeModal, updateStorageBar, renderAnalysisSpinner, renderAnalysisError } from './ui.js';

/* ==========================================================================
   SECTION 1: AI CONFIGURATION & PROMPTS
   ========================================================================== */

// JSON output schema — combined with user-editable persona + rules at call time
const ANALYSIS_JSON_SCHEMA = `
Return ONLY valid JSON. No markdown, no explanation, no backticks.
{
  "title": "listing title",
  "description": "buyer description",
  "category": "Vinted category path",
  "brand": "brand name",
  "size": "size label",
  "condition": "New with tags|Like new|Good|Fair|Poor",
  "colours": ["list", "of", "colours"],
  "materials": ["list", "of", "materials"]
}`;

// Built fresh on every call so persona/rules changes in Settings take effect immediately
function buildAnalysisPrompt() {
  return `${getPersona()}\n${getRules()}\n${ANALYSIS_JSON_SCHEMA}`;
}

/* ==========================================================================
   SECTION 2: THE MASTER AI REQUEST (THE BRAIN)
   ========================================================================== */

/** * One function to rule them all. 
 * Handles the actual network request to Anthropic.
 */
async function requestAIAnalysis(images, key) {
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
            source: { 
              type: 'base64', 
              media_type: 'image/jpeg', 
              data: image.replace(/^data:image\/\w+;base64,/, '') 
            },
          })),
          { type: 'text', text: buildAnalysisPrompt() },
        ],
      }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Unknown API error');
  
  const raw = data.content?.[0]?.text || '';
  return parseAnthropicJson(raw);
}

/** Helper to map JSON response to our Item object */
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
    status: 'analysed',
  };
}

/* ==========================================================================
   SECTION 3: SINGLE ITEM ANALYSIS
   ========================================================================== */

export async function analyseItem() {
  const key = getApiKey();
  if (!key) {
    alert('Add your Anthropic API key in Settings — tap ⚙️ on the home screen.');
    return;
  }

  // 1. UI Setup - Hide results, show loading
  const statePhotos = document.getElementById('state-photos');
  const stateAnalysed = document.getElementById('state-analysed');
  
  statePhotos.style.display = 'block';
  stateAnalysed.style.display = 'none';

  renderAnalysisSpinner();

  const itemId = appState.data.currentItem?.id;
  const rec = appState.data.currentItem?.hasPhotos ? await dbGet(S_PHOTOS, itemId) : null;
  const allImages = rec?.images || [];

  const images = appState.form.aiSelectedIndices
    .filter((index) => index < allImages.length)
    .map((index) => allImages[index]);

  if (!images.length) {
    alert('No photos selected for AI.');
    resetStatePhotos(); // This will restore the "Edit/Re-Analyse" buttons
    return;
  }

  try {
    const json = await requestAIAnalysis(images, key);

    // Guard against user navigating away during the 10s wait
    if (!appState.data.currentItem || appState.data.currentItem.id !== itemId) return;

    setCurrentItem(formatAnalysisResult(appState.data.currentItem, json));
    await dbPut(S_ITEMS, appState.data.currentItem);

    setItems(await dbGetAll(S_ITEMS));
    setCurrentItem(appState.data.items.find((item) => item.id === itemId));

    // This will draw the AI fields AND restore the buttons via renderDetail
    await renderDetail();

  } catch (error) {
    if (!appState.data.currentItem || appState.data.currentItem.id !== itemId) return;
    
    renderAnalysisError(error.message);
  }
}

/* ==========================================================================
   SECTION 4: BATCH ANALYSIS
   ========================================================================== */

export function openBatchAnalyse() {
  const photoItems = appState.data.items.filter((item) => item.status === 'photos');
  document.getElementById('batch-title').textContent = `Analyse ${photoItems.length} items?`;
  document.getElementById('batch-progress').style.display = 'none';
  document.getElementById('batch-confirm-btn').style.display = 'flex';
  document.getElementById('modal-batch-analyse').style.display = 'flex';
}

export async function runBatchAnalyse() {
  const key = getApiKey();
  if (!key) {
    closeModal('modal-batch-analyse');
    alert('Add your Anthropic API key in Settings — tap ⚙️ on the home screen.');
    return;
  }

  const photoItems = appState.data.items.filter((item) => item.status === 'photos');
  document.getElementById('batch-confirm-btn').style.display = 'none';
  document.getElementById('batch-cancel-btn').style.display = 'none';
  document.getElementById('batch-progress').style.display = 'block';

  let done = 0;
  for (const item of photoItems) {
    document.getElementById('batch-progress-text').textContent = `Analysing ${done + 1} of ${photoItems.length}…`;
    
    try {
      const rec = await dbGet(S_PHOTOS, item.id);
      const images = (item.aiSelectedIndices || [0, 1])
        .filter(i => i < (rec?.images?.length || 0))
        .map(i => rec.images[i]);
      if (images.length) {
        // 🚨 Use the Master Function
        const json = await requestAIAnalysis(images, key);
        const updated = formatAnalysisResult(item, json);
        await dbPut(S_ITEMS, updated);
      }
    } catch (error) {
      console.error("Batch failure for item:", item.id, error);
    }
    done++;
  }

  setItems(await dbGetAll(S_ITEMS));
  closeModal('modal-batch-analyse');
  renderHome();
  updateStorageBar();
}
