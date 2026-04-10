import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
import 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd';

let model = null;

// New function to call when the app first starts
export async function initAI() {
  if (!model) {
    console.log("AI: Loading model...");
    model = await cocoSsd.load();
    console.log("AI: Model Ready");
  }
}

export async function compressTo(dataUrl, maxW, quality) {
  // If model isn't ready, wait for it instead of hanging
  if (!model) await initAI();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject("Image failed to load");
    img.onload = async () => {
      try {
        const targetRatio = 3 / 4;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // AI Detection
        const predictions = await model.detect(img);
        console.log("AI Predictions:", predictions); // Check your console!

        let centerX = img.width / 2;
        let centerY = img.height / 2;

        if (predictions.length > 0) {
          const [x, y, w, h] = predictions[0].bbox;
          centerX = x + w / 2;
          centerY = y + h / 2;
        }

        // CROP LOGIC
        let cropW, cropH;
        if (img.width / img.height > targetRatio) {
          cropH = img.height;
          cropW = img.height * targetRatio;
        } else {
          cropW = img.width;
          cropH = img.width / targetRatio;
        }

        let srcX = Math.max(0, Math.min(img.width - cropW, centerX - cropW / 2));
        let srcY = Math.max(0, Math.min(img.height - cropH, centerY - cropH / 2));

        canvas.width = maxW;
        canvas.height = Math.round(maxW / targetRatio);

        ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        console.error("AI Processing Error:", err);
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
