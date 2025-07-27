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

    // Theme switching logic
    const themeToggleButton = document.getElementById('toggle-theme-btn');
    let currentTheme = 'gradio'; // 'gradio' as default, 'default' (2010) as alternative

    // Function to load a stylesheet
    function loadStylesheet(themeName) {
        const head = document.head;
        let oldLink = document.querySelector('link[rel="stylesheet"][data-theme]');
        if (oldLink) {
            head.removeChild(oldLink);
        }

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.type = 'text/css';
        newLink.setAttribute('data-theme', themeName); // Custom attribute to identify our theme link

        if (themeName === 'gradio') { // Gradio is now default
            newLink.href = 'assets/style_gradio.css';
        } else if (themeName === 'default') { // Default (2010) is now alternative
            newLink.href = 'assets/style.css';
        }
        head.appendChild(newLink);
    }

    // Initial theme load
    loadStylesheet(currentTheme);

    themeToggleButton.addEventListener('click', () => {
        if (currentTheme === 'gradio') {
            currentTheme = 'default'; // Switch to 2010 theme
            themeToggleButton.textContent = 'Switch to Gradio Theme';
        } else {
            currentTheme = 'gradio'; // Switch to Gradio theme
            themeToggleButton.textContent = 'Switch to 2010 Theme';
        }
        loadStylesheet(currentTheme);
    });
});
