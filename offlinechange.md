# Changelog

### Status
* Moved to **dev**

### Added
* **AI Smart-Crop Engine**: Integrated `TensorFlow.js` and `COCO-SSD` model in `utils.js` to automatically detect objects (clothing, toys, etc.).
* **Vinted-Optimized Framing**: Added logic to enforce a strict **3:4 Portrait** aspect ratio while centering the crop on the AI-detected item.
* **Dynamic Padding & Boundary Protection**: Implemented coordinate clamping to ensure items at the edge of the frame (e.g., floor-level shots) are not sliced during the cropping process.
* **AI Background Pre-loading**: Added `initAI()` to the main entry point to download the model in the background, preventing UI "hangs" during the first photo upload.

### Changed
* **`compressTo` Utility**: Converted to an `async` function to accommodate AI processing; now handles both thumbnail (100px) and medium (1200px) generation with smart-centering.
* **Photo Processing Loop**: Updated `handlePhoto` in `photos.js` to correctly `await` parallel AI processing of multiple images, ensuring `renderSlots()` only triggers once the entire batch is framed.

### Architecture
* **#24 Logic Extraction**: Moved all geometric math and AI model management out of `photos.js` and into `utils.js` to keep the UI layer clean and modular.
* **#25 Performance Tuning**: Cached the AI model instance globally after the first load to ensure near-instant processing for subsequent photos in the same session.

---

### Key Summary of the "Smart Crop" Logic:
The system now uses a **Midpoint-Clamping** algorithm:
1. **Detection**: The AI provides a bounding box for the item.
2. **Centering**: We calculate the mathematical center of that box.
3. **Framing**: We place a 3:4 rectangle over that center.
4. **Clamping**: If that rectangle hits the edge of the physical photo, it "bumps" the box back into the frame using `Math.min/max` bounds checking rather than cutting the item.
