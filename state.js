export const DB_NAME = 'VintedListerDB';
export const DB_VER = 1;
export const S_ITEMS = 'items';
export const S_PHOTOS = 'photos';

export const APP_VERSION = 'v1.5.6';
export const BRANCH_NAME = (() => {
  const h = window.location.hostname;
  if (h === 'vinted-lister-eight.vercel.app') return 'main';
  return 'dev';
})();

export const MAX_PHOTOS = 10;
export const DEFAULT_PHOTOS = 4;

export const STATUS_LABELS = {
  photos: '📷 Photos taken',
  analysed: '🔍 Analysed',
  listed: '📋 Listed',
  sold: '✅ Sold',
  archived: '🗄️ Archived',
};

export const STATUS_BADGE_CLASSES = {
  photos: 'badge-photos',
  analysed: 'badge-analysed',
  listed: 'badge-listed',
  sold: 'badge-sold',
  archived: 'badge-archived',
};

export const appState = {
  data: {
    items: [],
    currentItem: null,
    suggestions: JSON.parse(localStorage.getItem('vinted_suggestions') || '[]'),
  },
  ui: {
    filter: 'all',
    photosReturnScreen: 'screen-home',
    copyPage: 1,
    photoMode: localStorage.getItem('vinted_photo_mode') || 'camera',
  },
  form: {
    pendingPhotos: [],
    photosDirty: false,
    photoContext: 'new', // 'new' | 'replace' | 'addMore' | 'edit'
    copyFields: [],
    copyIdx: 0,
    dirty: false,
    pendingStatus: null,
    aiSelectedIndices: [0, 1],
    pendingSlot: null,
  },
};

export function getApiKey() {
  return localStorage.getItem('vinted_api_key') || '';
}

export function saveApiKeyValue(key) {
  localStorage.setItem('vinted_api_key', key);
}

export function savePhotoMode(mode) {
  appState.ui.photoMode = mode;
  localStorage.setItem('vinted_photo_mode', mode);
}

// ── Settings defaults ──────────────────────────────────────────
// Used as the initial textarea content when the user hasn't customised yet.

const DEFAULT_PERSONA = `You are an experienced family-focused Vinted seller.
You specialize in high-quality kids' clothing and toys.
Your tone is honest, practical, and helpful — parent-to-parent.
You emphasize safety, cleanliness, and the exact condition of items so buyers feel confident.`;

const DEFAULT_RULES = `- Title: Concise, max 50 chars. Format: Brand Item Colour/Type (e.g., "LEGO Duplo Fire Station" or "Next Denim Dungarees Blue").
- Description:
  1. Write max 250 chars. For CLOTHES: focus on fit, style, and softness. For TOYS: focus on features, play value, and if all parts are included.
  2. ALWAYS append on a new line: "Open to offers and bundles. From a smoke and pet-free home."
- Inspection:
  - CLOTHES: Look closely at seams/edges for pilling or fading.
  - TOYS: Look for scratches, missing stickers, or battery compartment wear.
  - Always mention any marks or flaws honestly.
- Unknowns: Use "Unknown" or "" if brand/size is not visible.
- Constraint: STRICTLY no markdown code blocks, no preamble, and no postscript. Just the JSON.`;

export function getPersona() {
  return localStorage.getItem('vinted_persona') || DEFAULT_PERSONA;
}

export function savePersona(text) {
  localStorage.setItem('vinted_persona', text);
}

export function getRules() {
  return localStorage.getItem('vinted_rules') || DEFAULT_RULES;
}

export function saveRules(text) {
  localStorage.setItem('vinted_rules', text);
}

export function getSmartCrop() {
  return localStorage.getItem('vinted_smart_crop') !== 'off'; // default ON
}

export function saveSmartCrop(enabled) {
  localStorage.setItem('vinted_smart_crop', enabled ? 'on' : 'off');
}

export function saveSuggestions() {
  localStorage.setItem('vinted_suggestions', JSON.stringify(appState.data.suggestions));
}

// ── State setters ──────────────────────────────────────────────
// Use these instead of mutating appState directly — gives a single
// hook to add logging, validation, or server-sync in phase 2.

export function setItems(items) {
  appState.data.items = items;
}

export function setCurrentItem(item) {
  appState.data.currentItem = item;
}
