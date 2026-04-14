const MAX_ENTRIES = 200;
const STORAGE_KEY = 'vinted_debug_log';
const _t0 = Date.now();

// Load any entries that survived the previous session
let _log = [];
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) _log = JSON.parse(stored);
} catch (e) {}

// Mark session boundary so pre-crash vs post-crash entries are distinct
_log.push(`\n--- SESSION START ${new Date().toLocaleTimeString()} ---`);
_persist();

export function dbg(msg) {
  const s = ((Date.now() - _t0) / 1000).toFixed(2);
  const entry = `[+${s}s] ${msg}`;
  console.log(entry);
  _log.push(entry);
  if (_log.length > MAX_ENTRIES) _log.shift();
  _persist();
}

function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_log));
  } catch (e) {}
}

export function refreshDebugLog() {
  const el = document.getElementById('debug-log-output');
  if (!el) return;
  el.textContent = _log.length ? [..._log].reverse().join('\n') : '(no entries yet)';
}

export function copyDebugLog() {
  const text = _log.join('\n');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => _fallbackCopy(text));
  } else {
    _fallbackCopy(text);
  }
}

function _fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function clearDebugLog() {
  _log.length = 0;
  _persist();
  refreshDebugLog();
}
