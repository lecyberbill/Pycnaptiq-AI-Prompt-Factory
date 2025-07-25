// js/main.js

import * as SvgManager from './svgManager.js';
import * as EventHandlers from './eventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {
    SvgManager.initSvgManager('svg-canvas');
    EventHandlers.setupEventListeners();
});
