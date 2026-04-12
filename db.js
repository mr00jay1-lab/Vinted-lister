import { DB_NAME, DB_VER, S_ITEMS, S_PHOTOS } from './state.js';

let db = null;

function normaliseItem(item) {
  if (!item) return item;
  return {
    thumbnail: null,
    hasPhotos: false,
    title: '', description: '', category: '', brand: '',
    size: '', condition: '', colours: '', materials: '',
    ...item,
  };
}

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VER);
    request.onupgradeneeded = event => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(S_ITEMS)) database.createObjectStore(S_ITEMS, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(S_PHOTOS)) database.createObjectStore(S_PHOTOS, { keyPath: 'id' });
    };
    request.onsuccess = event => { db = event.target.result; resolve(); };
    request.onerror = event => reject(event.target.error);
  });
}

const tx = (store, mode = 'readonly') => db.transaction(store, mode).objectStore(store);

export const dbGet = (store, key) => new Promise((resolve, reject) => {
  const request = tx(store).get(key);
  request.onsuccess = () => resolve(store === S_ITEMS ? normaliseItem(request.result) : request.result);
  request.onerror = () => reject(request.error);
});

export const dbGetAll = (store) => new Promise((resolve, reject) => {
  const request = tx(store).getAll();
  request.onsuccess = () => resolve(store === S_ITEMS ? request.result.map(normaliseItem) : request.result);
  request.onerror = () => reject(request.error);
});

export const dbPut = (store, value) => new Promise((resolve, reject) => {
  const request = tx(store, 'readwrite').put(value);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});

export const dbDelete = (store, key) => new Promise((resolve, reject) => {
  const request = tx(store, 'readwrite').delete(key);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});
