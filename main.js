import * as ui from './ui.js';
import * as photos from './photos.js';
import * as analysis from './analysis.js';
import * as actions from './actions.js';
import * as suggestions from './suggestions.js';

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

window.analyseItem = analyseItem;
