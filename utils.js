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
  // Ensure AI model is loaded to prevent execution 'hangs'
  if (!model) await initAI();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject("Image failed to load");
    img.onload = async () => {
      try {
        const targetRatio = 3 / 4; // Vinted Portrait Ratio
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 1. Run AI Detection
        const predictions = await model.detect(img);
        
        // Default to the exact center of the image
        let centerX = img.width / 2;
        let centerY = img.height / 2;

        if (predictions.length > 0) {
          // Get the bounding box of the most confident detection [x, y, width, height]
          const [x, y, w, h] = predictions[0].bbox;
          
          // Calculate the center point of the detected object
          centerX = x + w / 2;
          centerY = y + h / 2;

          /**
           * OPTIONAL: PADDING LOGIC
           * If you want the AI to "zoom out" slightly so the item isn't touching the 
           * edges of the 3:4 crop, you can adjust centerX/Y or the crop size here.
           * For items at the very bottom (like your Airpods case), the boundary 
           * logic below is actually the most important fix.
           */
        }

        // 2. CROP SIZE CALCULATION
        // We find the largest possible 3:4 rectangle that fits inside the source image
        let cropW, cropH;
        if (img.width / img.height > targetRatio) {
          // Image is wider than 3:4 (Landscape)
          cropH = img.height;
          cropW = img.height * targetRatio;
        } else {
          // Image is narrower than 3:4 (Tall Portrait)
          cropW = img.width;
          cropH = img.width / targetRatio;
        }

        // 3. BOUNDARY GUARD RAILS
        // We calculate the top-left corner (srcX, srcY) based on the item center.
        // Math.min/Max ensures that if the item is at the edge (like the bottom), 
        // the crop box 'stops' at the image boundary rather than cutting the item.
        
        // Calculate X and stay within 0 and (ImageWidth - CropWidth)
        let srcX = centerX - cropW / 2;
        srcX = Math.max(0, Math.min(srcX, img.width - cropW));

        // Calculate Y and stay within 0 and (ImageHeight - CropHeight)
        let srcY = centerY - cropH / 2;
        srcY = Math.max(0, Math.min(srcY, img.height - cropH));

        // 4. DRAW & RESIZE
        canvas.width = maxW;
        canvas.height = Math.round(maxW / targetRatio);

        // Clear canvas and draw the 'Smart Slice'
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img, 
          srcX, srcY, cropW, cropH,     // Source: The AI-centered 3:4 slice
          0, 0, canvas.width, canvas.height // Destination: The resized output
        );

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
