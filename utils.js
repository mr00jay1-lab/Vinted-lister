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
  const model = await initAI();
  if (!model) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => { cleanup(); resolve(null); }, 10000);

    function cleanup() {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
    }

    img.onerror = () => { cleanup(); resolve(null); };
    img.onload = async () => {
      try {
        const targetRatio = 3 / 4;
        const predictions = await model.detect(img);
        let centerX = img.width / 2;
        let centerY = img.height / 2;
        if (predictions.length > 0) {
          const [x, y, w, h] = predictions[0].bbox;
          centerX = x + w / 2;
          centerY = y + h / 2;
        }
        let cropW, cropH;
        if (img.width / img.height > targetRatio) {
          cropH = img.height;
          cropW = img.height * targetRatio;
        } else {
          cropW = img.width;
          cropH = img.width / targetRatio;
        }
        const srcX = Math.max(0, Math.min(centerX - cropW / 2, img.width - cropW));
        const srcY = Math.max(0, Math.min(centerY - cropH / 2, img.height - cropH));
        cleanup();
        resolve({ srcX, srcY, cropW, cropH });
      } catch (err) {
        console.warn('AI detection failed, using centre crop:', err);
        cleanup();
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
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { cleanup(); reject(new Error('compressTo timeout')); }, 10000);

    function cleanup() {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
    }

    img.onerror = () => { cleanup(); reject(new Error('Image failed to load')); };
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
        if (!ctx) { cleanup(); reject(new Error('Canvas context unavailable')); return; }
        ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        cleanup();
        resolve(result);
      } catch (err) {
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
