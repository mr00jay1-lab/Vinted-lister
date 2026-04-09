import { appState, S_PHOTOS, S_ITEMS, getApiKey } from './state.js';
import { dbGet, dbPut, dbGetAll } from './db.js';
import { parseAnthropicJson } from './utils.js';
import { renderDetail, renderHome, resetStatePhotos, closeModal, showScreen, updateStorageBar } from './ui.js';

/* ==========================================================================
   SECTION 1: AI CONFIGURATION & PROMPTS
   ========================================================================== */

// 1. Define the persona
const PROMPT_PERSONA = "You are an expert Vinted seller known for fast sales and honest descriptions.";

// 2. Define the rules
const PROMPT_RULES = `
- Title: Concise, max 50 chars, include brand + item + colour.
- Description: 1-2 sentences in English. Focus on fit and style. 
- Inspection: Look very closely at the seams and edges for any pilling or fading. Mention any visible scratches, marks, or flaws honestly.
- Unknowns: If brand or size is not visible, use "Unknown" or an empty string.
- Formatting: Return ONLY the JSON object. 
- Constraint: STRICTLY do not include any text, markdown code blocks (like \` \` \`json), or explanations before or after the JSON.
`;

// 3. Combine them into the final prompt used by the API
const ANALYSIS_PROMPT = `
${PROMPT_PERSONA}
${PROMPT_RULES}

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
          { type: 'text', text: ANALYSIS_PROMPT },
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
    showScreen('screen-apikey');
    return;
  }

  // UI Setup
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
  const rec = appState.currentItem?.hasPhotos ? await dbGet(S_PHOTOS, itemId) : null;
  const allImages = rec?.images || [];
  
  const images = appState.aiSelectedIndices
    .filter((index) => index < allImages.length)
    .map((index) => allImages[index]);

  if (!images.length) {
    alert('No photos selected.');
    resetStatePhotos();
    return;
  }

  try {
    // 🚨 Use the Master Function
    const json = await requestAIAnalysis(images, key);

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

/* ==========================================================================
   SECTION 4: BATCH ANALYSIS
   ========================================================================== */

export function openBatchAnalyse() {
  const photoItems = appState.items.filter((item) => item.status === 'photos');
  document.getElementById('batch-title').textContent = `Analyse ${photoItems.length} items?`;
  document.getElementById('batch-progress').style.display = 'none';
  document.getElementById('batch-confirm-btn').style.display = 'flex';
  document.getElementById('modal-batch-analyse').style.display = 'flex';
}

export async function runBatchAnalyse() {
  const key = getApiKey();
  if (!key) {
    closeModal('modal-batch-analyse');
    showScreen('screen-apikey');
    return;
  }

  const photoItems = appState.items.filter((item) => item.status === 'photos');
  document.getElementById('batch-confirm-btn').style.display = 'none';
  document.getElementById('batch-cancel-btn').style.display = 'none';
  document.getElementById('batch-progress').style.display = 'block';

  let done = 0;
  for (const item of photoItems) {
    document.getElementById('batch-progress-text').textContent = `Analysing ${done + 1} of ${photoItems.length}…`;
    
    try {
      const rec = await dbGet(S_PHOTOS, item.id);
      const images = rec?.images?.slice(0, 2) || [];
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

  appState.items = await dbGetAll(S_ITEMS);
  closeModal('modal-batch-analyse');
  renderHome();
  updateStorageBar();
}
