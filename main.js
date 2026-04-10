import * as ui from './ui.js';
import * as photos from './photos.js';
import * as analysis from './analysis.js';
import * as actions from './actions.js';
import * as suggestions from './suggestions.js';
import { initAI } from './utils.js';

const exposed = {
  ...ui,
  ...photos,
  ...analysis,
  ...actions,
  ...suggestions,
};

Object.assign(window, exposed);

ui.initApp().catch((error) => {
  console.error('Failed to initialize app:', error);
});


initAI(); // Start downloading the AI model in the background as soon as the app opens
