import { dbg } from './logger.js';

let modelPromise = null;

/** Injects a CDN <script> tag and waits for it to load */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

/**
 * Loads TF.js + COCO-SSD once and returns the model.
 * Safe to call concurrently — all callers share the same loading Promise.
 * Returns null on any failure so callers can degrade gracefully to centre-crop.
 */
export function initAI() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3');
      console.log('AI: Loading model...');
      const m = await window.cocoSsd.load();
      console.log('AI: Model ready');
      return m;
    })().catch(err => {
      console.warn('AI: Model unavailable, smart-crop disabled:', err);
      modelPromise = null;
      return null;
    });
  }
  return modelPromise;
}

/**
 * Detects the main object and returns 3:4 crop coordinates centred on it.
 * Returns null on any failure — callers should fall back to centre-crop.
 */
export async function detectCropCoords(dataUrl) {
  dbg('detectCropCoords: start');
  const model = await initAI();
  dbg(`detectCropCoords: model=${model ? 'ready' : 'null'}`);
  if (!model) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      dbg('detectCropCoords: TIMEOUT');
      img.onload = null; img.onerror = null; img.src = '';
      resolve(null);
    }, 10000);

    img.onerror = () => {
      dbg('detectCropCoords: img onerror');
      clearTimeout(timer); img.onload = null; img.src = '';
      resolve(null);
    };

    img.onload = async () => {
      clearTimeout(timer);
      img.onload = null; img.onerror = null;

      const fullW = img.width;
      const fullH = img.height;

      // Downscale to 512 px for detection — reduces TF.js tensor ~20x vs full-res
      const DETECT_SIZE = 512;
      const scale = Math.min(1, DETECT_SIZE / Math.max(fullW, fullH));
      const dCanvas = document.createElement('canvas');
      dCanvas.width  = Math.round(fullW * scale);
      dCanvas.height = Math.round(fullH * scale);
      const dCtx = dCanvas.getContext('2d');
      dCtx.drawImage(img, 0, 0, dCanvas.width, dCanvas.height);

      // Free the full-res decoded bitmap before the heavyweight detection call
      img.src = '';

      try {
        dbg('detectCropCoords: running model.detect...');
        const predictions = await model.detect(dCanvas);
        dCanvas.width = 0; // release canvas GPU memory
        dbg(`detectCropCoords: ${predictions.length} predictions, done`);

        const targetRatio = 3 / 4;
        let centerX = fullW / 2;
        let centerY = fullH / 2;
        if (predictions.length > 0) {
          const [x, y, w, h] = predictions[0].bbox;
          // Scale bbox back from detection space to original image space
          centerX = (x + w / 2) / scale;
          centerY = (y + h / 2) / scale;
        }
        let cropW, cropH;
        if (fullW / fullH > targetRatio) {
          cropH = fullH; cropW = fullH * targetRatio;
        } else {
          cropW = fullW; cropH = fullW / targetRatio;
        }
        const srcX = Math.max(0, Math.min(centerX - cropW / 2, fullW - cropW));
        const srcY = Math.max(0, Math.min(centerY - cropH / 2, fullH - cropH));
        resolve({ srcX, srcY, cropW, cropH });
      } catch (err) {
        dCanvas.width = 0;
        dbg(`detectCropCoords error: ${err.message}`);
        console.warn('AI detection failed, using centre crop:', err);
        resolve(null);
      }
    };

    img.src = dataUrl;
  });
}

/**
 * Resizes a photo to maxW × (maxW / 0.75) at the given JPEG quality.
 * cropCoords: {srcX, srcY, cropW, cropH} from detectCropCoords(), or null for centre crop.
 */
export function compressTo(dataUrl, maxW, quality, cropCoords = null) {
  dbg(`compressTo: maxW=${maxW}`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { dbg(`compressTo TIMEOUT: maxW=${maxW}`); cleanup(); reject(new Error('compressTo timeout')); }, 10000);

    function cleanup() {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
    }

    img.onerror = () => { dbg(`compressTo img onerror: maxW=${maxW}`); cleanup(); reject(new Error('Image failed to load')); };
    img.onload = () => {
      try {
        const targetRatio = 3 / 4;
        let srcX, srcY, cropW, cropH;
        if (cropCoords) {
          ({ srcX, srcY, cropW, cropH } = cropCoords);
        } else {
          if (img.width / img.height > targetRatio) {
            cropH = img.height;
            cropW = img.height * targetRatio;
          } else {
            cropW = img.width;
            cropH = img.width / targetRatio;
          }
          srcX = (img.width - cropW) / 2;
          srcY = (img.height - cropH) / 2;
        }
        const canvas = document.createElement('canvas');
        canvas.width = maxW;
        canvas.height = Math.round(maxW / targetRatio);
        const ctx = canvas.getContext('2d');
        if (!ctx) { dbg('compressTo: canvas ctx is null'); cleanup(); reject(new Error('Canvas context unavailable')); return; }
        ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        dbg(`compressTo done: maxW=${maxW}`);
        cleanup();
        resolve(result);
      } catch (err) {
        dbg(`compressTo error: ${err.message}`);
        cleanup();
        reject(err);
      }
    };
    img.src = dataUrl;
  });
}

export function parseAnthropicJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

export function joinArray(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value || '';
}
