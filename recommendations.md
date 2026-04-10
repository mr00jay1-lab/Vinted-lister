# Architecture Review & Improvement Plan: Vinted Lister App

## Executive Summary
The application demonstrates a solid, pragmatic vanilla JavaScript architecture. The separation of the data layer (IndexedDB wrapper) from state and UI is effective, and the decision to split heavy image payloads (`photos` store) from lightweight metadata (`items` store) is an excellent pattern for performance.

However, as the application scales, the current setup has several architectural bottlenecks—mostly related to tight coupling and global scope manipulation—that will make maintaining and debugging this codebase increasingly painful.

This document outlines areas for improvement, categorized by priority.

---

## 🔴 High Priority: Stability & Security

### 1. The Global Scope Hack (`window.fn`)
Currently, all functions are exposed to the `window` object to enable inline HTML `onclick` handlers (`Object.assign(window, exposed)`).
* **The Problem:** This is a major anti-pattern. It pollutes the global namespace, breaks module encapsulation, prevents tree-shaking, and leads directly to the bug where `backFromAddPhotos()` silently overrides itself based on import order. This makes the codebase highly fragile.
* **The Fix:** Remove inline `onclick` attributes from the HTML. Instead, bind events inside your JS modules using `document.getElementById('...').addEventListener('click', fn)` or event delegation.
* **The Overwrite Fix:** Resolve the `backFromAddPhotos` conflict immediately. Either consolidate them into a single function that checks the `appState.isEditing` flag, or give them distinct names and bind them strictly to their respective UI contexts.

### 2. Client-Side AI API Calls
The Vercel deployment serves static files directly, and `analysis.js` contains the AI calls.
* **The Problem:** Calling the Anthropic API (Claude) directly from the browser exposes your API key to anyone who opens the network tab. This is a critical security vulnerability and will inevitably lead to token scraping.
* **The Fix:** Move the API execution to a backend layer. Since you are hosted on Vercel, utilize Vercel Serverless Functions. Create an `/api/analyze` endpoint in an `/api` directory to securely hold your Anthropic key, perform the API request securely server-side, and return the parsed JSON to your frontend.

---

## 🟡 Medium Priority: State & Coupling

### 1. Tightly Coupled Dependency Graph
The import graph reveals cross-dependencies (e.g., `ui.js` imports `photos.js` concepts, and `actions.js` imports `ui.js`).
* **The Problem:** This creates circular dependencies, causing the "Ripple rule" (changing `ui.js` breaks actions/analysis). Modifying a UI element shouldn't inadvertently break a data action, and vice versa.
* **The Fix:** Implement a **Unidirectional Data Flow** or a simple **Pub/Sub (Event Bus)** pattern. 
    * `actions.js` handles business logic and updates `state.js`.
    * `ui.js` *listens* for state changes and updates the DOM. `actions.js` should not directly call UI rendering functions like `showScreen()` or `renderHome()`.

### 2. State Mutation Safety
`appState` is a globally accessible, mutable object.
* **The Problem:** Any file can mutate `appState.filter` or `appState.pendingPhotos` directly without notifying the rest of the application, leading to UI desynchronization.
* **The Fix:** Protect `appState`. Wrap it in simple getter/setter functions within `state.js`, or use a JavaScript `Proxy`. When a setter is called (e.g., `setFilter('sold')`), it updates the internal state and automatically triggers a UI re-render event.

---

## 🟢 Low Priority: Code Organization & PWA Tweaks

### 1. Transient vs. Persisted State
`appState` currently mixes database data (`items`), UI navigation state (`currentCopyPage`, `isEditing`), and temporary form data (`pendingPhotos`).
* **The Problem:** Flat state structures become messy as apps grow, making it difficult to reset specific application contexts (e.g., clearing form data after a successful save).
* **The Fix:** Logically group the state inside `state.js`:
    * `appState.ui` (e.g., `filter`, `currentCopyPage`, `isEditing`)
    * `appState.data` (e.g., `items`, `currentItem`)
    * `appState.form` (e.g., `pendingPhotos`, `replacingItem`)

### 2. Module-Level Variables as State
Variables like `currentCopyPage` live inside `actions.js`.
* **The Problem:** Keeping state variables scattered across different logic files makes tracking application state and debugging difficult.
* **The Fix:** Move module-level UI state into the centralized state store (e.g., `appState.ui.copyStep`). `state.js` should be the absolute single source of truth.

### 3. Localized DB Fallbacks
`thumbnail` is `null` when loading from the DB, forcing `savePhotos()` to manually fall back to `currentItem.thumbnail`.
* **The Problem:** Leaking data structural quirks into action/UI logic creates messy conditional statements throughout the app.
* **The Fix:** Handle data normalization at the boundary. When `dbGet()` fetches an item, a utility function should format the data structure properly *before* it enters `appState`. The UI and action logic shouldn't have to guess if a thumbnail exists or needs re-compressing.

💡 Potential Optimization: Batch Analysis Logic
In your current runBatchAnalyse() function, the code is hard-coded to pull only the first two images:

JavaScript
const images = rec?.images?.slice(0, 2) || [];
The Suggestion
Since you have already implemented appState.aiSelectedIndices to allow users to pick the "best" photos for the AI, you should update the batch logic to respect those choices. This ensures Claude analyzes the specific angles (like labels or close-ups) that the user intentionally selected.

Updated Logic Idea:

JavaScript
// Map the user's specific selections instead of a generic slice
const images = (item.aiSelectedIndices || [0, 1]) // Fallback to first two if none selected
  .filter(index => index < (rec?.images?.length || 0))
  .map(index => rec.images[index]);
Why do this?
Better Accuracy: Users often take a "label" photo at position 3 or 4. Slicing (0, 2) might miss the brand/size info.

Consistency: The Batch Analysis will now produce the same high-quality results as the Single Item Analysis.
