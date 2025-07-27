// js/main.js

import * as SvgManager from './svgManager.js';
import * as EventHandlers from './eventHandlers.js';
import { HistoryManager } from './historyManager.js'; // Import the class
import { loadObjectAttributesData } from './dataManager.js'; // Import the data loader

document.addEventListener('DOMContentLoaded', async () => {
    SvgManager.initSvgManager('svg-canvas'); // Initialize SvgManager first
    
    // Load object attributes data
    await loadObjectAttributesData();

    // Create a single instance of HistoryManager
    const historyManager = new HistoryManager();
    
    // Pass the instance to the event handlers, which will manage all state pushes
    EventHandlers.setupEventListeners(historyManager);
});
