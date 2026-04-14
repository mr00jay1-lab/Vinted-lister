const MAX_ENTRIES = 200;
const _log = [];
const _t0 = Date.now();

export function dbg(msg) {
  const s = ((Date.now() - _t0) / 1000).toFixed(2);
  const entry = `[+${s}s] ${msg}`;
  console.log(entry);
  _log.push(entry);
  if (_log.length > MAX_ENTRIES) _log.shift();
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
  refreshDebugLog();
}
