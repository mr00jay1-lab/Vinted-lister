import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
import 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd';

let model = null; // Caches the AI so it doesn't reload every time

export async function compressTo(dataUrl, maxW, quality) {
  // Load model once and reuse it for all photos
  if (!model) {
    model = await cocoSsd.load();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const targetRatio = 3 / 4; // Vinted Portrait
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // --- STEP 1: DETECTION ---
      const predictions = await model.detect(img);
      let centerX = img.width / 2;
      let centerY = img.height / 2;

      if (predictions.length > 0) {
        // Find the "Subject" (usually the first result)
        const [x, y, w, h] = predictions[0].bbox;
        centerX = x + w / 2;
        centerY = y + h / 2;
      }

      // --- STEP 3: THE CROP MATH ---
      // Determine the largest 3:4 box that fits inside the image
      let cropW, cropH;
      if (img.width / img.height > targetRatio) {
        cropH = img.height;
        cropW = img.height * targetRatio;
      } else {
        cropW = img.width;
        cropH = img.width / targetRatio;
      }

      // Ensure the box doesn't go off the edges of the photo
      // Math.max(0, ...) ensures it doesn't go off the left/top
      // Math.min(limit, ...) ensures it doesn't go off the right/bottom
      let srcX = Math.max(0, Math.min(img.width - cropW, centerX - cropW / 2));
      let srcY = Math.max(0, Math.min(img.height - cropH, centerY - cropH / 2));

      // Set final dimensions
      canvas.width = maxW;
      canvas.height = Math.round(maxW / targetRatio);

      // Draw the smart slice
      ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
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
