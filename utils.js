let net = null; // We'll cache the model here

export async function compressTo(dataUrl, maxW, quality) {
  // Load the model once
  if (!net) net = await cocoSsd.load();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const targetRatio = 3 / 4;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 1. AI detection: Find the "item"
      const predictions = await net.detect(img);
      
      // Default to image center
      let centerX = img.width / 2;
      let centerY = img.height / 2;

      // If AI found something, use the center of the detection box
      if (predictions.length > 0) {
        const [x, y, w, h] = predictions[0].bbox;
        centerX = x + (w / 2);
        centerY = y + (h / 2);
      }

      // 2. Calculate the crop box dimensions (3:4)
      let cropW, cropH;
      if (img.width / img.height > targetRatio) {
        cropH = img.height;
        cropW = img.height * targetRatio;
      } else {
        cropW = img.width;
        cropH = img.width / targetRatio;
      }

      // 3. Ensure the crop box stays inside the image pixels
      let srcX = Math.max(0, Math.min(img.width - cropW, centerX - cropW / 2));
      let srcY = Math.max(0, Math.min(img.height - cropH, centerY - cropH / 2));

      // 4. Set final canvas size and draw
      canvas.width = maxW;
      canvas.height = Math.round(maxW / targetRatio);

      ctx.drawImage(
        img,
        srcX, srcY, cropW, cropH,          // The "Smart" slice
        0, 0, canvas.width, canvas.height // The output
      );

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
