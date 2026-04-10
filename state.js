export const DB_NAME = 'VintedListerDB';
export const DB_VER = 1;
export const S_ITEMS = 'items';
export const S_PHOTOS = 'photos';

export const APP_VERSION = 'v1.4.0-modular-v1';
export const BRANCH_NAME = 'modular-v1';

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
  items: [],
  currentItem: null,
  filter: 'all',
  pendingPhotos: [],
  replacingItem: false,
  addingMorePhotos: false,
  copyFields: [],
  copyIdx: 0,
  copyPage: 1,
  dirty: false,
  pendingStatus: null,
  aiSelectedIndices: [0, 1],
  photoMode: localStorage.getItem('vinted_photo_mode') || 'camera',
  pendingSlot: null,
  suggestions: JSON.parse(localStorage.getItem('vinted_suggestions') || '[]'),
};

export function getApiKey() {
  return localStorage.getItem('vinted_api_key') || '';
}

export function saveApiKeyValue(key) {
  localStorage.setItem('vinted_api_key', key);
}

export function savePhotoMode(mode) {
  appState.photoMode = mode;
  localStorage.setItem('vinted_photo_mode', mode);
}

export function saveSuggestions() {
  localStorage.setItem('vinted_suggestions', JSON.stringify(appState.suggestions));
}

// ── State setters ──────────────────────────────────────────────
// Use these instead of mutating appState directly — gives a single
// hook to add logging, validation, or server-sync in phase 2.

export function setItems(items) {
  appState.items = items;
}

export function setCurrentItem(item) {
  appState.currentItem = item;
}
