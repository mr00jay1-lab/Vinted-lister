import { appState, saveSuggestions } from './state.js';

export function renderSuggestions() {
  const list = document.getElementById('suggest-list');
  if (!appState.suggestions.length) {
    list.innerHTML = '<div class="suggest-empty">No suggestions yet. Add one above!</div>';
    return;
  }
  list.innerHTML = appState.suggestions
    .map((suggestion, index) => `
      <div class="suggest-item">
        <div class="suggest-item-text">${index + 1}. ${suggestion}</div>
        <button class="suggest-item-del" onclick="deleteSuggestion(${index})">✕</button>
      </div>
    `)
    .join('');
}

export function openSuggestions() {
  document.getElementById('suggest-panel').style.display = 'flex';
  setTimeout(() => document.getElementById('suggest-input').focus(), 200);
}

export function closeSuggestions() {
  document.getElementById('suggest-panel').style.display = 'none';
}

export function suggestKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    addSuggestion();
  }
}

export function addSuggestion() {
  const input = document.getElementById('suggest-input');
  const text = input.value.trim();
  if (!text) return;
  appState.suggestions.push(text);
  saveSuggestions();
  input.value = '';
  renderSuggestions();
}

export function deleteSuggestion(index) {
  appState.suggestions.splice(index, 1);
  saveSuggestions();
  renderSuggestions();
}

export function copySuggestions() {
  if (!appState.suggestions.length) {
    alert('No suggestions to copy yet.');
    return;
  }
  const text = 'Vinted Lister Suggestions:\n\n' + appState.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const button = document.querySelector('.suggest-copy-btn');
    button.textContent = '✓ Copied!';
    setTimeout(() => { button.textContent = '📋 Copy All'; }, 2000);
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Copied! Paste into WhatsApp or anywhere you like.');
  });
}

window.deleteSuggestion = deleteSuggestion;
