// js/eventHandlers.js

import * as SvgManager from './svgManager.js';
import * as DragAndResize from './dragAndResize.js';
import { getClosestColorName } from './colorUtils.js';
import * as BackgroundManager from './backgroundManager.js';
import * as DataManager from './dataManager.js'; // Import the data manager

let historyManager; // Will be initialized in setupEventListeners

let colorSelect, labelText, createShapeBtn, deleteShapeBtn, clearCanvasBtn, exportPromptBtn, promptDisplay, exportPngBtn, saveSvgBtn;
let bringToFrontBtn, sendToBackBtn, bringForwardBtn, sendBackwardBtn;
let undoBtn, redoBtn; // New variables for undo/redo buttons
let strokeColorInput, applyStrokeToAllBtn, copyPromptBtn; // New variables for stroke color input, button, and copy prompt button
let noFillColorCheckbox; // Declared globally

let shapeTypeDropdownValue = 'rect'; // DEPRECATED: Will be replaced by direct interaction
let backgroundCategoryDropdownValue = null; // Store selected background category
let backgroundIdeaDropdownValue = null; // Store selected background idea (will be removed after refactoring)
let selectedBackgroundIdea = null; // Store the selected background idea for prompt generation
let selectedBackgroundGradientColors = null; // Store the selected background gradient colors
let selectedCameraAngle = null; // To store the currently selected camera angle
let selectedLightingMood = null; // To store the currently selected lighting and mood
let selectedArtStyle = null; // To store the currently selected art style

let copiedShapeData = null; // To store data of the copied shape

let selectedFreeformPointVisual = null; // To store the currently selected freeform point visual
let selectedFreeformPointIndex = -1; // To store the index of the currently selected freeform point

let freeformToolsDrawer; // New variable for the freeform tools drawer
let activeTextEditorForeignObject = null; // New global variable to track active text editor

// Freeform drawing state
let isDrawingFreeform = false;
let currentFreeformPathData = []; // Stores path commands {cmd: 'M'/'L'/'C', x, y, c1x, c1y, c2x, c2y}
let currentFreeformGroup = null;
let currentFreeformPathElement = null; // The actual SVG path element

// Declare dropdown instances globally so handleIdCardIconClick can access them
let emotionDropdownInstance;
let actionDropdownInstance;
let eyeColorDropdownInstance;
let clothingDropdownInstance;
let hairStyleDropdownInstance;
let hairColorDropdownInstance;

let promptPrefixTextarea; // New variable for prompt prefix textarea
let promptSuffixTextarea; // New variable for prompt suffix textarea

export function setupEventListeners(historyMgr) {
    historyManager = historyMgr; // Initialize the module-level historyManager

    labelText = document.getElementById('shape-label');
    createShapeBtn = document.getElementById('create-shape');
    deleteShapeBtn = document.getElementById('delete-shape');
    clearCanvasBtn = document.getElementById('clear-canvas');
    exportPromptBtn = document.getElementById('export-prompt');
    promptDisplay = document.getElementById('prompt-display');
    exportPngBtn = document.getElementById('export-png');
    saveSvgBtn = document.getElementById('save-svg');
    copyPromptBtn = document.getElementById('copy-prompt-btn'); // Initialize copy prompt button
    bringToFrontBtn = document.getElementById('bring-to-front-btn');
    sendToBackBtn = document.getElementById('send-to-back-btn');
    bringForwardBtn = document.getElementById('bring-forward-btn');
    sendBackwardBtn = document.getElementById('send-backward-btn');
    undoBtn = document.getElementById('undo-btn'); // Initialize undo button
    redoBtn = document.getElementById('redo-btn'); // Initialize redo button
    const svgCanvas = SvgManager.getSvgCanvas();
    freeformToolsDrawer = document.getElementById('freeform-tools-drawer'); // Initialize the drawer variable
    applyStrokeToAllBtn = document.getElementById('apply-stroke-to-all'); // Initialize apply stroke button
    const objectIdCard = document.getElementById('object-id-card');
    const closeIdCardBtn = objectIdCard.querySelector('#close-id-card'); // Corrected selector
    const objectIdCardHeader = objectIdCard.querySelector('.panel-header');

    colorSelect = document.getElementById('shape-color'); // Initialized here
    colorSelect.addEventListener('input', handleColorChange);

    noFillColorCheckbox = document.getElementById('no-fill-color'); // Assign to the global variable
    noFillColorCheckbox.addEventListener('change', handleNoFillColorChange); // Add event listener

    strokeColorInput = document.getElementById('stroke-color'); // Initialized here
    strokeColorInput.addEventListener('input', handleStrokeColorChange);
    applyStrokeToAllBtn.addEventListener('click', handleApplyStrokeToAll);

    // Removed isDraggingIdCard variables and related event listeners as the panel is no longer floating freely.
    // The panel is now embedded in the right sidebar.
    createShapeBtn.addEventListener('click', () => createShape(shapeTypeDropdownValue)); // Keep button for now, creates shape in center
    deleteShapeBtn.addEventListener('click', handleDeleteShape);
    clearCanvasBtn.addEventListener('click', handleResetCanvas);
    exportPromptBtn.addEventListener('click', handleExportPrompt);
    exportPngBtn.addEventListener('click', handleExportPng);
    saveSvgBtn.addEventListener('click', handleSaveSvg);
    copyPromptBtn.addEventListener('click', handleCopyPrompt); // Add event listener for copy prompt button
    bringToFrontBtn.addEventListener('click', () => handleZIndexChange(SvgManager.bringToFront));
    sendToBackBtn.addEventListener('click', () => handleZIndexChange(SvgManager.sendToBack));
    bringForwardBtn.addEventListener('click', () => handleZIndexChange(SvgManager.bringForward));
    sendBackwardBtn.addEventListener('click', () => handleZIndexChange(SvgManager.sendBackward));
    undoBtn.addEventListener('click', handleUndo);
    redoBtn.addEventListener('click', handleRedo);
    closeIdCardBtn.addEventListener('click', () => objectIdCard.style.display = 'none'); // Hide when close button is clicked

    // Initialize new textareas
    promptPrefixTextarea = document.getElementById('prompt-prefix-text');
    promptSuffixTextarea = document.getElementById('prompt-suffix-text');

    const saveIdCardAttributesBtn = document.getElementById('save-id-card-attributes');
    saveIdCardAttributesBtn.addEventListener('click', handleSaveIdCardAttributes);

    // Global event listeners for drag/resize and freeform drawing
    svgCanvas.addEventListener('mousemove', (e) => {
        if (isDrawingFreeform) { // If currently drawing freeform, handle freeform specific mousemove
            handleFreeformMouseMove(e);
        } else { // Otherwise, allow general drag/resize (for all shapes, including freeform when not drawing)
            DragAndResize.doDragOrResize(e);
        }
    });

    svgCanvas.addEventListener('mouseup', (e) => {
        if (isDrawingFreeform) { // If currently drawing freeform, handle freeform specific mouseup
            handleFreeformMouseUp(e);
        } else { // Otherwise, allow general drag/resize (for all shapes, including freeform when not drawing)
            if (DragAndResize.endDragOrResize()) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                updateAllButtonStates(); // Update undo/redo buttons state
            }
        }
    });
    
    svgCanvas.addEventListener('mouseleave', (e) => {
        if (isDrawingFreeform) { // If currently drawing freeform, treat as mouse up
            handleFreeformMouseUp(e);
        } else { // Otherwise, allow general drag/resize (for all shapes, including freeform when not drawing)
            if (DragAndResize.endDragOrResize()) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                updateAllButtonStates(); // Update undo/redo buttons state
            }
        }
    });

    svgCanvas.addEventListener('freeformPointClick', handleFreeformPointClick);
    svgCanvas.addEventListener('freeformPointsCleared', resetSelectedFreeformPoint);

    // Handle global mousedown for shape deselection
    document.addEventListener('mousedown', (e) => {
        const clickedOnShapeGroup = e.target.closest('.shape-group');
        const clickedOnControlsSidebar = e.target.closest('#controls-sidebar');
        const clickedOnRightSidebar = e.target.closest('#right-sidebar');
        const clickedOnPromptArea = e.target.closest('#prompt-export-controls');
        const clickedOnCustomDropdown = e.target.closest('.custom-dropdown'); // Don't deselect if clicking on dropdowns
        const clickedOnObjectIdCard = e.target.closest('#object-id-card'); // Check if click was on the object ID card

        // Deselect if currently selected shape AND click was not on a shape group,
        // AND not on any control panel/dropdown, AND not on the SVG canvas itself (unless in freeform draw mode),
        // AND not on the object ID card.
        if (SvgManager.getSelectedShapeGroup() && 
            !clickedOnShapeGroup && 
            !clickedOnControlsSidebar && 
            !clickedOnRightSidebar && 
            !clickedOnPromptArea &&
            !clickedOnCustomDropdown &&
            !clickedOnObjectIdCard && // New condition: do not deselect if clicking on the ID card
            !(shapeTypeDropdownValue === 'freeform' && e.target === svgCanvas)) // Allow clicks on canvas in freeform mode
        {
            SvgManager.setSelectedShapeGroup(null);
            updateAllButtonStates();
        }
    });

    // Keep the specific mousedown on svgCanvas for freeform drawing initiation
    svgCanvas.addEventListener('mousedown', (e) => {
        // This listener only initiates freeform drawing.
        // Deselection is handled by the global document mousedown listener.
        if (shapeTypeDropdownValue === 'freeform') {
            handleFreeformMouseDown(e);
        }
    });

    // Add contextmenu listener for right-click on shapes to edit label
    svgCanvas.addEventListener('contextmenu', (e) => {
        const targetGroup = e.target.closest('.shape-group');
        if (targetGroup) {
            e.preventDefault(); // Prevent default context menu
            const textElement = targetGroup._labelText;
            if (textElement) {
                const currentLabel = textElement.textContent.trim();
                const newLabel = prompt('Enter new label for the shape:', currentLabel === '\u00A0' ? '' : currentLabel);
                if (newLabel !== null) { // If user didn't cancel
                    SvgManager.updateShapeText(targetGroup, newLabel.trim() === '' ? '\u00A0' : newLabel);
                }
            }
        }
    });

    // Observer les changements sur la sélection pour activer/désactiver les boutons
    observer = new MutationObserver(() => {
        updateAllButtonStates();
    });
    observer.observe(svgCanvas, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // Initialisation de l'état des boutons
    updateAllButtonStates();

    // Camera Angle Controls
    const cameraAngleButtonsContainer = document.getElementById('camera-angle-buttons');
    populateCameraAngles(cameraAngleButtonsContainer);

    // --- Drag and Drop for Shape Creation ---
    const shapeIcons = document.querySelectorAll('.shape-icon');
    shapeIcons.forEach(icon => {
        icon.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.shapeType);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    svgCanvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow dropping
        e.dataTransfer.dropEffect = 'copy';
    });

    svgCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const shapeType = e.dataTransfer.getData('text/plain');
        const svgRect = svgCanvas.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;
        createShape(shapeType, x, y);
    });
    
    // Freeform mode button
    const freeformBtn = document.getElementById('freeform-mode-btn');
    freeformBtn.addEventListener('click', () => {
        shapeTypeDropdownValue = 'freeform';
        const selectedShape = SvgManager.getSelectedShapeGroup();
        if (selectedShape && selectedShape.getAttribute('data-shape-type') === 'freeform') {
            // If a freeform shape is already selected, enter edit mode for it
            isDrawingFreeform = false; // Not drawing, but editing
            currentFreeformGroup = selectedShape;
            currentFreeformPathElement = selectedShape._shapeBody;
            currentFreeformPathData = SvgManager.getFreeformPathData(currentFreeformPathElement);
            DragAndResize.enableDragAndResize(currentFreeformGroup);
            SvgManager.setSelectedShapeGroup(currentFreeformGroup); // Ensure points are visible
        } else {
            // No freeform shape selected, prepare to draw a new one
            isDrawingFreeform = true; // Ready to draw
            currentFreeformGroup = null;
            currentFreeformPathData = [];
            currentFreeformPathElement = null;
            SvgManager.clearFreeformPointVisuals();
            SvgManager.setSelectedShapeGroup(null); // Deselect any non-freeform shape
        }
        updateAllButtonStates(); // Update button states based on new mode
    });
    
    // Background Category
    let backgroundIdeaDropdownInstance; 

    const backgroundCategoryDropdown = setupCustomDropdown('background-category-dropdown',
        BackgroundManager.getBackgroundCategories().map(cat => ({name: cat, value: cat})),
        (selectedCategoryObject) => { // This is the onSelectCallback for backgroundCategoryDropdown
            backgroundCategoryDropdownValue = selectedCategoryObject.value; // Update the global variable
            // Repopulate background ideas based on new category
            const newIdeas = BackgroundManager.getIdeasForCategory(backgroundCategoryDropdownValue);
            backgroundIdeaDropdownInstance.updateOptions(newIdeas);
            // Manually trigger the selection logic for the first option of the new ideas
            if (newIdeas.length > 0) {
                const firstIdea = newIdeas[0];
                selectedBackgroundIdea = firstIdea.name;
                selectedBackgroundGradientColors = firstIdea.gradient_colors;
                SvgManager.setCanvasBackgroundGradient(selectedBackgroundGradientColors); // Apply gradient
                historyManager.pushState(SvgManager.getCanvasStateAsData()); // Save state after background change
                handleExportPrompt(); // Re-generate prompt with new background
            } else {
                selectedBackgroundIdea = null;
                selectedBackgroundGradientColors = null;
                SvgManager.setCanvasBackgroundGradient([]); // Clear gradient if no ideas
                handleExportPrompt();
            }
        }
    ); // Correctly closing the setupCustomDropdown call

    // Initialize backgroundCategoryDropdownValue after setup
    backgroundCategoryDropdownValue = backgroundCategoryDropdown.getSelectedValue();

    // Initial population for background idea dropdown
    // This needs to be called after backgroundCategoryDropdownValue is initialized
    const initialBackgroundIdeas = BackgroundManager.getIdeasForCategory(backgroundCategoryDropdownValue);
    backgroundIdeaDropdownInstance = setupCustomDropdown('background-idea-dropdown', initialBackgroundIdeas, (selectedIdeaObject) => {
        selectedBackgroundIdea = selectedIdeaObject.name; // Update selectedBackgroundIdea with the name
        selectedBackgroundGradientColors = selectedIdeaObject.gradient_colors; // Store colors
        SvgManager.setCanvasBackgroundGradient(selectedBackgroundGradientColors); // Apply gradient
        historyManager.pushState(SvgManager.getCanvasStateAsData()); // Save state after background change
        handleExportPrompt();
    });
    // Set initial values based on the first option after setup
    if (initialBackgroundIdeas.length > 0) {
        selectedBackgroundIdea = initialBackgroundIdeas[0].name;
        selectedBackgroundGradientColors = initialBackgroundIdeas[0].gradient_colors;
        SvgManager.setCanvasBackgroundGradient(selectedBackgroundGradientColors); // Apply initial gradient
    }

    // Push the true initial state to history after all setup is complete
    historyManager.pushState(SvgManager.getCanvasStateAsData());
    updateAllButtonStates(); // Update buttons with initial history state

    // Lighting & Mood
    const lightingMoodDropdown = setupCustomDropdown('lighting-mood-dropdown',
        BackgroundManager.getLightingAndMoods().map(mood => ({name: mood.name, value: mood.prompt_phrase, image_path: mood.image_path})),
        (selectedObject) => {
            selectedLightingMood = selectedObject.value;
            handleExportPrompt();
        }
    );
    selectedLightingMood = lightingMoodDropdown.getSelectedValue();

    // Art Style/Medium
    const artStyleDropdown = setupCustomDropdown('art-style-dropdown',
        BackgroundManager.getArtStyles().map(style => ({name: style.name, value: style.prompt_phrase, image_path: style.image_path})),
        (selectedObject) => {
            selectedArtStyle = selectedObject.value;
            handleExportPrompt();
        }
    );
    selectedArtStyle = artStyleDropdown.getSelectedValue();

    // Emotions and Actions Dropdowns
    emotionDropdownInstance = setupCustomDropdown('emotion-dropdown',
        DataManager.getEmotions().map(emotion => ({ name: emotion.name, value: emotion.prompt_phrase })),
        (selectedObject) => {
            const selectedGroup = SvgManager.getSelectedShapeGroup();
            if (selectedGroup) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                selectedGroup.setAttribute('data-emotion', selectedObject.value);
                handleExportPrompt();
            }
        },
        true // Include "Select Emotion" option
    );

    actionDropdownInstance = setupCustomDropdown('action-dropdown',
        DataManager.getActions().map(action => ({ name: action.name, value: action.prompt_phrase })),
        (selectedObject) => {
            const selectedGroup = SvgManager.getSelectedShapeGroup();
            if (selectedGroup) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                selectedGroup.setAttribute('data-action', selectedObject.value);
                handleExportPrompt();
            }
        },
        true // Include "Select Action" option
    );

    // New dropdowns for detailed attributes
    eyeColorDropdownInstance = setupCustomDropdown('eye-color-dropdown',
        DataManager.getEyeColors().map(color => ({ name: color.name, value: color.prompt_phrase })),
        (selectedObject) => {
            const selectedGroup = SvgManager.getSelectedShapeGroup();
            if (selectedGroup) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                selectedGroup.setAttribute('data-eye-color', selectedObject.value);
                handleExportPrompt();
            }
        },
        true // Include "Select Eye Color" option
    );

    clothingDropdownInstance = setupCustomDropdown('clothing-dropdown',
        DataManager.getClothing().map(item => ({ name: item.name, value: item.prompt_phrase })),
        (selectedObject) => {
            const selectedGroup = SvgManager.getSelectedShapeGroup();
            if (selectedGroup) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                selectedGroup.setAttribute('data-clothing', selectedObject.value);
                handleExportPrompt();
            }
        },
        true // Include "Select Clothing" option
    );

    hairStyleDropdownInstance = setupCustomDropdown('hair-style-dropdown',
        DataManager.getHairStyles().map(style => ({ name: style.name, value: style.prompt_phrase })),
        (selectedObject) => {
            const selectedGroup = SvgManager.getSelectedShapeGroup();
            if (selectedGroup) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                selectedGroup.setAttribute('data-hair-style', selectedObject.value);
                handleExportPrompt();
            }
        },
        true // Include "Select Hair Style" option
    );

    hairColorDropdownInstance = setupCustomDropdown('hair-color-dropdown',
        DataManager.getHairColors().map(color => ({ name: color.name, value: color.prompt_phrase })),
        (selectedObject) => {
            const selectedGroup = SvgManager.getSelectedShapeGroup();
            if (selectedGroup) {
                historyManager.pushState(SvgManager.getCanvasStateAsData());
                selectedGroup.setAttribute('data-hair-color', selectedObject.value);
                handleExportPrompt();
            }
        },
        true // Include "Select Hair Color" option
    );

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-dropdown.open').forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    });

    // Add keyboard shortcut for deleting selected shape
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            handleUndo();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            handleRedo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') { // 'Delete' key or 'Backspace'
            e.preventDefault();
            handleDeleteShape();
        } else if (e.ctrlKey && e.key === 'c') { // Ctrl+C for copy
            e.preventDefault();
            handleCopyShape();
        } else if (e.ctrlKey && e.key === 'v') { // Ctrl+V for paste
            e.preventDefault();
            handlePasteShape();
        }
    });

    // Freeform Tools Button Listeners
    document.getElementById('add-point-btn').addEventListener('click', handleAddPointBtn);
    document.getElementById('delete-point-btn').addEventListener('click', handleDeletePointBtn);
    document.getElementById('convert-to-bezier-btn').addEventListener('click', handleConvertToBezierBtn);
    document.getElementById('toggle-edit-mode-btn').addEventListener('click', handleToggleEditModeBtn);
    document.getElementById('close-path-btn').addEventListener('click', handleClosePathBtn);
    document.getElementById('done-editing-freeform-btn').addEventListener('click', handleDoneEditingFreeform);
}

// Freeform tool functions
function handleAddPointBtn() {
    if (shapeTypeDropdownValue === 'freeform') {
        const selected = SvgManager.getSelectedShapeGroup();
        if (selected && selected.getAttribute('data-shape-type') === 'freeform' && !isDrawingFreeform) {
            // If a freeform shape is already selected, enter edit mode for it
            isDrawingFreeform = false; // Not drawing, but editing
            currentFreeformGroup = selected;
            currentFreeformPathElement = selected._shapeBody;
            currentFreeformPathData = SvgManager.getFreeformPathData(currentFreeformPathElement); // Load current path data
            SvgManager.clearFreeformPointVisuals(); // Clear existing visuals before re-drawing new ones
            SvgManager.setSelectedShapeGroup(selected); // Keep selected
            console.log("Add Point button clicked. Ready to add points to existing freeform path.");
        } else {
            // If no freeform shape is selected, or we are already drawing, start a new path
            isDrawingFreeform = true;
            currentFreeformGroup = null; // Clear current group to start fresh for a NEW drawing
            currentFreeformPathData = [];
            currentFreeformPathElement = null;
            SvgManager.clearFreeformPointVisuals(); // Clear existing point visuals
            SvgManager.setSelectedShapeGroup(null); // Deselect any active shape, including previously closed freeform
            console.log("Add Point button clicked. Ready to draw new freeform path.");
        }
        updateAllButtonStates();
        historyManager.pushState(SvgManager.getCanvasStateAsData());
    }
}

let observer; // Declare observer globally

function handleUndo() {
    const prevState = historyManager.undo();
    
    // Store the ID of the currently selected shape before any changes
    const currentSelectedShape = SvgManager.getSelectedShapeGroup();
    const selectedShapeId = currentSelectedShape ? currentSelectedShape.id : null;

    observer.disconnect(); // Disconnect observer to prevent mutation events during restoration

    if (prevState) {
        SvgManager.restoreCanvasState(prevState);
    } else {
        // If prevState is null, it means we've reached the beginning of history.
        // The desired state is an empty canvas.
        SvgManager.clearCanvas();
    }
    
    observer.observe(SvgManager.getSvgCanvas(), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); // Reconnect observer

    // After restoration, try to re-select the previously selected shape if it still exists
    let reselectedShape = null;
    if (selectedShapeId) {
        reselectedShape = document.getElementById(selectedShapeId);
    }
    SvgManager.setSelectedShapeGroup(reselectedShape); // This will call updateShapeAppearance

    updateAllButtonStates();
    handleExportPrompt(); // Update prompt after state change
}

function handleRedo() {
    const nextState = historyManager.redo();
    if (nextState) {
        // Store the ID of the currently selected shape, if any
        const currentSelectedShape = SvgManager.getSelectedShapeGroup();
        const selectedShapeId = currentSelectedShape ? currentSelectedShape.id : null;

        observer.disconnect(); // Disconnect observer
        SvgManager.restoreCanvasState(nextState);
        observer.observe(SvgManager.getSvgCanvas(), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); // Reconnect observer
        
        // After restoration, try to re-select the previously selected shape
        let reselectedShape = null;
        if (selectedShapeId) {
            reselectedShape = document.getElementById(selectedShapeId);
        }
        SvgManager.setSelectedShapeGroup(reselectedShape); // This will call updateShapeAppearance if a shape is selected

        updateAllButtonStates();
        handleExportPrompt(); // Update prompt after state change
    }
}

function handleDeletePointBtn() {
    if (currentFreeformGroup && selectedFreeformPointVisual && selectedFreeformPointIndex !== -1) {
        const pathData = currentFreeformGroup._pathData;

        // Remove the point from pathData
        pathData.splice(selectedFreeformPointIndex, 1);

        // If the path becomes too short (e.g., less than 2 points for a line or 1 for a move), clear it
        if (pathData.length < 1) {
            SvgManager.deleteSelectedShape(); // Delete the entire freeform shape if no points left
            currentFreeformGroup = null;
            currentFreeformPathData = [];
            currentFreeformPathElement = null;
            // Clear point visuals as the shape is deleted
            SvgManager.clearFreeformPointVisuals();
        } else {
            // Update the path in SvgManager
            SvgManager.updateFreeformPath(currentFreeformGroup._shapeBody, pathData);
            SvgManager.clearFreeformPointVisuals(); // Clear old visuals
            SvgManager.setSelectedShapeGroup(currentFreeformGroup); // Re-render visuals for updated path
        }

        // Clear selected point state
        if (selectedFreeformPointVisual) {
            selectedFreeformPointVisual.classList.remove('selected-point');
        }
        selectedFreeformPointVisual = null;
        selectedFreeformPointIndex = -1;
        
        console.log("Deleted point at index:", selectedFreeformPointIndex);
    } else {
        console.log("No freeform point selected for deletion.");
        alert("Please select a freeform point to delete.");
    }
    updateAllButtonStates();
}

function handleConvertToBezierBtn() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup && selectedGroup.getAttribute('data-shape-type') === 'freeform' && selectedFreeformPointIndex !== -1) {
        SvgManager.convertToCubicBezier(selectedGroup, selectedFreeformPointIndex);
        console.log("Converted to Bezier");
    } else {
        alert("Please select a point on a freeform shape to convert.");
    }
}

function handleToggleEditModeBtn() {
    if (shapeTypeDropdownValue === 'freeform') {
        isDrawingFreeform = !isDrawingFreeform;

        if (isDrawingFreeform) {
            currentFreeformGroup = null;
            currentFreeformPathData = [];
            currentFreeformPathElement = null;
            SvgManager.clearFreeformPointVisuals();
            SvgManager.setSelectedShapeGroup(null);
            console.log("Add Point button clicked. Ready to draw new freeform path.");
        } else {
            if (currentFreeformGroup && currentFreeformPathData.length > 1 && currentFreeformPathData[currentFreeformPathData.length - 1].cmd !== 'Z') {
                console.log("Freeform drawing stopped.");
            }
            freeformToolsDrawer.style.display = 'none';
            SvgManager.setSelectedShapeGroup(null);
            currentFreeformGroup = null;
            currentFreeformPathElement = null;
            currentFreeformPathData = [];
            SvgManager.clearFreeformPointVisuals();
            console.log("Exited freeform editing mode via 'Toggle Edit Mode' button.");
        }
        updateAllButtonStates();
    }
}

function handleClosePathBtn() {
    if (currentFreeformGroup && currentFreeformPathData.length > 1) {
        if (currentFreeformPathData[currentFreeformPathData.length - 1].cmd !== 'Z') {
            currentFreeformPathData.push({ cmd: 'Z' });
            SvgManager.updateFreeformPath(currentFreeformPathElement, currentFreeformPathData);
        }
        isDrawingFreeform = false;
        SvgManager.clearFreeformPointVisuals();
        SvgManager.setSelectedShapeGroup(currentFreeformGroup);
        DragAndResize.enableDragAndResize(currentFreeformGroup);
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        updateAllButtonStates();
        console.log("Path closed and freeform drawing ended. Shape is now selectable and resizable.");
    } else {
        console.log("Cannot close path: no active freeform path or not enough points.");
    }
}

function handleFreeformMouseDown(e) {
    if (e.button !== 0) return;

    const svgCanvas = SvgManager.getSvgCanvas();
    const svgRect = svgCanvas.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    if (isDrawingFreeform && shapeTypeDropdownValue === 'freeform') {
        if (!currentFreeformGroup) {
            currentFreeformPathData = [{ cmd: 'M', x: x, y: y }];
            const color = colorSelect.value;
            const label = labelText.value.trim() || `Freeform ${Date.now()}`;
            currentFreeformGroup = SvgManager.createFreeformPath(currentFreeformPathData, color, label, strokeColorInput.value, 2, null, noFillColorCheckbox.checked); // Pass noFillColorCheckbox.checked
            currentFreeformPathElement = currentFreeformGroup._shapeBody;
            SvgManager.setSelectedShapeGroup(currentFreeformGroup);
            DragAndResize.enableDragAndResize(currentFreeformGroup);
            SvgManager.addFreeformPointVisual(currentFreeformGroup, { x: x, y: y }, 0);
        } else {
            const lastCommand = currentFreeformPathData[currentFreeformPathData.length - 1];
            if (lastCommand && lastCommand.cmd !== 'Z') {
                currentFreeformPathData.push({ cmd: 'L', x: x, y: y });
                SvgManager.updateFreeformPath(currentFreeformPathElement, currentFreeformPathData);
                SvgManager.addFreeformPointVisual(currentFreeformGroup, { x: x, y: y }, currentFreeformPathData.length - 1);
            }
        }
    } else {
        if (e.target === svgCanvas) {
            SvgManager.setSelectedShapeGroup(null);
            updateAllButtonStates();
        }
    }
}

function handleFreeformMouseMove(e) {
    if (!isDrawingFreeform || currentFreeformPathData.length === 0) return;

    const svgCanvas = SvgManager.getSvgCanvas();
    const svgRect = svgCanvas.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
}

function handleFreeformMouseUp(e) {
}

function handleCopyShape() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        copiedShapeData = SvgManager.getShapeData(selectedGroup);
        copiedShapeData.eyeColor = selectedGroup.getAttribute('data-eye-color');
        copiedShapeData.clothing = selectedGroup.getAttribute('data-clothing');
        copiedShapeData.hairStyle = selectedGroup.getAttribute('data-hair-style');
        copiedShapeData.hairColor = selectedGroup.getAttribute('data-hair-color');
        copiedShapeData.noColor = selectedGroup.getAttribute('data-no-color') === 'true'; // Copy no-color state
        copiedShapeData.promptPrefix = selectedGroup.getAttribute('data-prompt-prefix'); // Copy prompt prefix
        copiedShapeData.promptSuffix = selectedGroup.getAttribute('data-prompt-suffix'); // Copy prompt suffix
        console.log('Shape copied:', copiedShapeData);
    }
}

function handlePasteShape() {
    if (copiedShapeData) {
        const newX = copiedShapeData.x + 20;
        const newY = copiedShapeData.y + 20;
        
        const newGroup = SvgManager.createShapeGroup(
            copiedShapeData.type,
            copiedShapeData.color,
            copiedShapeData.label,
            newX,
            newY,
            copiedShapeData.width,
            copiedShapeData.height,
            copiedShapeData.strokeColor,
            copiedShapeData.strokeWidth,
            null, // Let SvgManager generate a new ID
            copiedShapeData.noColor // Pass noColor state
        );
        if (newGroup) {
            newGroup.setAttribute('data-eye-color', copiedShapeData.eyeColor || '');
            newGroup.setAttribute('data-clothing', copiedShapeData.clothing || '');
            newGroup.setAttribute('data-hair-style', copiedShapeData.hairStyle || '');
            newGroup.setAttribute('data-hair-color', copiedShapeData.hairColor || '');
            newGroup.setAttribute('data-prompt-prefix', copiedShapeData.promptPrefix || ''); // Paste prompt prefix
            newGroup.setAttribute('data-prompt-suffix', copiedShapeData.promptSuffix || ''); // Paste prompt suffix

            DragAndResize.enableDragAndResize(newGroup);
            SvgManager.setSelectedShapeGroup(newGroup);
            updateAllButtonStates();
            historyManager.pushState(SvgManager.getCanvasStateAsData());
            console.log('Shape pasted:', newGroup);
        }
    }
}

function handleDoneEditingFreeform() {
    if (isDrawingFreeform || currentFreeformGroup) {
        historyManager.pushState(SvgManager.getCanvasStateAsData());
    }
    isDrawingFreeform = false;
    freeformToolsDrawer.style.display = 'none';
    SvgManager.setSelectedShapeGroup(null);
    updateAllButtonStates();
    console.log("Exited freeform editing mode.");
}

function resetSelectedFreeformPoint() {
    if (selectedFreeformPointVisual) {
        selectedFreeformPointVisual.classList.remove('selected-point');
    }
    selectedFreeformPointVisual = null;
    selectedFreeformPointIndex = -1;
    updateAllButtonStates();
}

function handleFreeformPointClick(e) {
    const newSelectedPointVisual = e.detail.pointVisual;
    const newSelectedPointIndex = e.detail.pointIndex;

    if (selectedFreeformPointVisual && selectedFreeformPointVisual !== newSelectedPointVisual) {
        selectedFreeformPointVisual.classList.remove('selected-point');
    }

    if (selectedFreeformPointVisual === newSelectedPointVisual) {
        selectedFreeformPointVisual.classList.remove('selected-point');
        selectedFreeformPointVisual = null;
        selectedFreeformPointIndex = -1;
    } else {
        newSelectedPointVisual.classList.add('selected-point');
        selectedFreeformPointVisual = newSelectedPointVisual;
        selectedFreeformPointIndex = newSelectedPointIndex;
    }
    updateAllButtonStates();
}

function setupCustomDropdown(dropdownId, optionsData, onSelectCallback = null, includeNoneOption = false) {
    const dropdown = document.getElementById(dropdownId);
    const selectedValueDisplay = dropdown.querySelector('.dropdown-selected-value');
    const optionsContainer = dropdown.querySelector('.dropdown-options');

    let currentSelectedValue = null;
    let currentSelectedObject = null;

    // Add a "Select X" option if requested
    let finalOptionsData = [...optionsData];
    if (includeNoneOption) {
        const dropdownLabel = dropdown.closest('.control-section').querySelector('h3').textContent; // Get parent section title
        finalOptionsData.unshift({ name: `Select ${dropdownLabel.replace('s', '')}`, value: '' }); // Prepend "Select X"
    }

    const updateOptions = (newOptionsData) => {
        optionsContainer.innerHTML = '';
        newOptionsData.forEach(optionData => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('dropdown-option');
            optionElement.setAttribute('data-value', optionData.value || '');
            optionElement.setAttribute('title', optionData.name);

            // Check if there's an image path
            if (optionData.image_path) {
                const img = document.createElement('img');
                img.src = optionData.image_path;
                img.classList.add('dropdown-image'); // Add a class for CSS styling
                optionElement.appendChild(img);
            }

            const textSpan = document.createElement('span');
            textSpan.textContent = optionData.name;
            textSpan.classList.add('dropdown-text'); // Add a class for CSS styling
            optionElement.appendChild(textSpan);

            optionElement.addEventListener('click', () => {
                // Clear existing content in selectedValueDisplay
                selectedValueDisplay.innerHTML = ''; 

                // Add image if available
                if (optionData.image_path) {
                    const img = document.createElement('img');
                    img.src = optionData.image_path;
                    img.classList.add('dropdown-image'); // Use the same class as options
                    selectedValueDisplay.appendChild(img);
                }

                // Add text
                const textSpan = document.createElement('span');
                textSpan.textContent = optionData.name;
                textSpan.classList.add('dropdown-text'); // Use the same class as options
                selectedValueDisplay.appendChild(textSpan);

                selectedValueDisplay.setAttribute('data-value', optionData.value || '');
                currentSelectedValue = optionData.value || '';
                currentSelectedObject = optionData;
                dropdown.classList.remove('open');
                if (onSelectCallback) {
                    onSelectCallback(currentSelectedObject);
                }
            });
            optionsContainer.appendChild(optionElement);
        });

        if (newOptionsData.length === 0) {
            selectedValueDisplay.innerHTML = ''; // Clear content
            selectedValueDisplay.setAttribute('data-value', '');
            currentSelectedValue = null;
            currentSelectedObject = null;
        }
    };

    const setSelectedValue = (valueToSelect) => {
        // Find the option by value first, then by name if value is empty (for "Select X" option)
        const selectedOption = finalOptionsData.find(opt => opt.value === valueToSelect) ||
                               (valueToSelect === '' && includeNoneOption ? finalOptionsData[0] : null); // Select "None" if value is empty and option exists

        if (selectedOption) {
            selectedValueDisplay.innerHTML = ''; // Clear existing content
            if (selectedOption.image_path) {
                const img = document.createElement('img');
                img.src = selectedOption.image_path;
                img.classList.add('dropdown-image');
                selectedValueDisplay.appendChild(img);
            }
            const textSpan = document.createElement('span');
            textSpan.textContent = selectedOption.name;
            textSpan.classList.add('dropdown-text');
            selectedValueDisplay.appendChild(textSpan);

            selectedValueDisplay.setAttribute('data-value', selectedOption.value || '');
            currentSelectedValue = selectedOption.value || '';
            currentSelectedObject = selectedOption;
        } else {
            // If the value doesn't match any option, default to the first option (which might be "Select X")
            if (finalOptionsData.length > 0) {
                selectedValueDisplay.innerHTML = ''; // Clear content
                if (finalOptionsData[0].image_path) {
                    const img = document.createElement('img');
                    img.src = finalOptionsData[0].image_path;
                    img.classList.add('dropdown-image');
                    selectedValueDisplay.appendChild(img);
                }
                const textSpan = document.createElement('span');
                textSpan.textContent = finalOptionsData[0].name;
                textSpan.classList.add('dropdown-text');
                selectedValueDisplay.appendChild(textSpan);

                selectedValueDisplay.setAttribute('data-value', finalOptionsData[0].value || '');
                currentSelectedValue = finalOptionsData[0].value || '';
                currentSelectedObject = finalOptionsData[0];
            } else {
                selectedValueDisplay.innerHTML = ''; // Clear content
                selectedValueDisplay.setAttribute('data-value', '');
                currentSelectedValue = null;
                currentSelectedObject = null;
            }
        }
    };

    updateOptions(finalOptionsData); // Use finalOptionsData for initial population
    const initialHtmlValue = selectedValueDisplay.getAttribute('data-value');
    setSelectedValue(initialHtmlValue || ''); // Pass empty string to default to "Select X" if exists

    selectedValueDisplay.addEventListener('click', (event) => {
        event.stopPropagation();
        document.querySelectorAll('.custom-dropdown.open').forEach(openDropdown => {
            if (openDropdown !== dropdown) {
                openDropdown.classList.remove('open');
            }
        });
        dropdown.classList.toggle('open');

        // Dynamically set position and width of dropdown options when opened
        if (dropdown.classList.contains('open')) {
            const rect = selectedValueDisplay.getBoundingClientRect();
            optionsContainer.style.position = 'fixed'; // Override absolute to fixed
            optionsContainer.style.top = `${rect.bottom}px`;
            optionsContainer.style.left = `${rect.left}px`;
            optionsContainer.style.width = `${rect.width}px`;
        } else {
            optionsContainer.style.position = ''; // Reset position
            optionsContainer.style.top = '';
            optionsContainer.style.left = '';
            optionsContainer.style.width = '';
        }
    });

    return {
        getSelectedValue: () => currentSelectedValue,
        getSelectedObject: () => currentSelectedObject,
        updateOptions: updateOptions,
        setSelectedValue: setSelectedValue
    };
}

function populateCameraAngles(container) {
    const angles = BackgroundManager.getCameraAngles();
    const tooltipImageContainer = document.getElementById('camera-angle-tooltip');
    const tooltipImage = document.getElementById('camera-angle-tooltip-image');

    container.innerHTML = '';
    angles.forEach(angle => {
        const button = document.createElement('button');
        button.textContent = angle.name;
        button.classList.add('camera-angle-btn');
        button.setAttribute('data-prompt-phrase', angle.prompt_phrase);
        
        // Add mouseover/mouseout listeners for image tooltip
        if (angle.image_path) {
            button.addEventListener('mouseover', (e) => {
                tooltipImage.src = angle.image_path;
                tooltipImageContainer.style.display = 'block';
                // Position the tooltip near the mouse or button
                tooltipImageContainer.style.left = `${e.clientX + 15}px`; // Use clientX/Y for viewport coordinates
                tooltipImageContainer.style.top = `${e.clientY + 15}px`;
            });
            button.addEventListener('mousemove', (e) => {
                tooltipImageContainer.style.left = `${e.clientX + 15}px`;
                tooltipImageContainer.style.top = `${e.clientY + 15}px`;
            });
            button.addEventListener('mouseout', () => {
                tooltipImageContainer.style.display = 'none';
            });
        }

        button.addEventListener('click', () => {
            document.querySelectorAll('.camera-angle-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            button.classList.add('selected');
            selectedCameraAngle = angle.prompt_phrase;
            handleExportPrompt();
        });
        container.appendChild(button);
    });

    if (angles.length > 0) {
        container.querySelector('.camera-angle-btn').classList.add('selected');
        selectedCameraAngle = angles[0].prompt_phrase;
    }
}

function createShape(shapeType, x, y) {
    let color = colorSelect.value;
    const label = labelText.value.trim() || `Shape ${Date.now()}`;
    const strokeColor = strokeColorInput.value;
    const strokeWidth = 2;

    let isNoColorSelected = noFillColorCheckbox.checked;

    if (isNoColorSelected) {
        color = '#F5DEB3'; // Set to flesh tone
    }

    if (shapeType === 'freeform') {
        // This part is now handled by the 'freeform-mode-btn' event listener
        alert("Please use the 'Freeform' button to start drawing a freeform shape.");
        return;
    }

    const svgCanvas = SvgManager.getSvgCanvas();
    // Use provided coordinates, or center if not provided
    const initialX = x ? x - 50 : (svgCanvas.clientWidth / 2) - 50; // Adjust for shape width
    const initialY = y ? y - 50 : (svgCanvas.clientHeight / 2) - 50; // Adjust for shape height
    const initialWidth = 100;
    const initialHeight = 100;

    const newGroup = SvgManager.createShapeGroup(shapeType, color, label, initialX, initialY, initialWidth, initialHeight, strokeColor, strokeWidth, null, isNoColorSelected);
    if (newGroup) {
        DragAndResize.enableDragAndResize(newGroup);
        labelText.value = '';
        SvgManager.setSelectedShapeGroup(newGroup);
        updateAllButtonStates();
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        handleExportPrompt();
    }
}

function handleNoFillColorChange() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (noFillColorCheckbox.checked) {
        if (selectedGroup) {
            historyManager.pushState(SvgManager.getCanvasStateAsData());
            selectedGroup.setAttribute('data-original-color', selectedGroup.getAttribute('data-color')); // Store original color
            SvgManager.updateShapeColor(selectedGroup, '#F5DEB3', true); // Update shape with flesh tone and mark as no-color
        }
        colorSelect.value = '#F5DEB3'; // Set color picker to flesh tone
        colorSelect.disabled = true; // Disable color picker
    } else {
        colorSelect.disabled = false; // Enable color picker
        if (selectedGroup) {
            historyManager.pushState(SvgManager.getCanvasStateAsData());
            const originalColor = selectedGroup.getAttribute('data-original-color');
            SvgManager.updateShapeColor(selectedGroup, originalColor || '#FF0000', false); // Restore original color or default red
            selectedGroup.removeAttribute('data-original-color'); // Clean up
            colorSelect.value = originalColor || '#FF0000'; // Update color picker
        }
    }
    handleExportPrompt();
}

function handleStrokeColorChange(e) {
    const newColor = e.target.value;
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        SvgManager.updateShapeStrokeColor(selectedGroup, newColor);
        handleExportPrompt();
    }
}

function handleApplyStrokeToAll() {
    const strokeColor = strokeColorInput.value;
    const svgCanvas = SvgManager.getSvgCanvas();
    const allShapeGroups = svgCanvas.querySelectorAll('.shape-group');
    if (allShapeGroups.length > 0) {
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        allShapeGroups.forEach(group => {
            SvgManager.updateShapeStrokeColor(group, strokeColor);
        });
        handleExportPrompt();
    }
}

function handleExportPrompt() {
    const svgCanvas = SvgManager.getSvgCanvas();
    const groups = Array.from(svgCanvas.querySelectorAll('.shape-group'));
    const canvasDimensions = SvgManager.getCanvasDimensions();

    const canvasWidth = canvasDimensions.width;
    const canvasHeight = canvasDimensions.height;

    const groupedShapes = {};

    groups.forEach((group, index) => {
        const shapeDataFromManager = SvgManager.getShapeData(group);
        if (!shapeDataFromManager) {
            console.warn("Could not get shape data for group:", group);
            return;
        }

        const label = shapeDataFromManager.label;
        const shapeType = shapeDataFromManager.type;
        const hexColor = shapeDataFromManager.color;
        const emotion = shapeDataFromManager.emotion;
        const action = shapeDataFromManager.action;
        const eyeColor = shapeDataFromManager.eyeColor;
        const clothing = shapeDataFromManager.clothing;
        const hairStyle = shapeDataFromManager.hairStyle;
        const hairColor = shapeDataFromManager.hairColor;
        const isNoColor = shapeDataFromManager.noColor;
        const promptPrefix = group.getAttribute('data-prompt-prefix') || ''; // Get prefix
        const promptSuffix = group.getAttribute('data-prompt-suffix') || ''; // Get suffix
        
        console.log(`Processing group ${index}: Label='${label}', Type='${shapeType}', Color='${hexColor}', Emotion='${emotion}', Action='${action}', EyeColor='${eyeColor}', Clothing='${clothing}', HairStyle='${hairStyle}', HairColor='${hairColor}', NoColor='${isNoColor}', PromptPrefix='${promptPrefix}', PromptSuffix='${promptSuffix}'`);
        console.log("Full shapeDataFromManager:", shapeDataFromManager);

        let naturalColorName = getClosestColorName(hexColor);
        if (isNoColor) {
            naturalColorName = "flesh-toned";
        }

        const renderedWidth = shapeDataFromManager.width;
        const renderedHeight = shapeDataFromManager.height;
        const centerX = shapeDataFromManager.x + renderedWidth / 2;
        const centerY = shapeDataFromManager.y + renderedHeight / 2;

        const thirdWidth = canvasWidth / 3;
        const thirdHeight = canvasHeight / 3;

        let horizontalPos = '';
        if (centerX < thirdWidth) {
            horizontalPos = 'left';
        } else if (centerX > 2 * thirdWidth) {
            horizontalPos = 'right';
        } else {
            horizontalPos = 'center';
        }

        let verticalPos = '';
        if (centerY < thirdHeight) {
            verticalPos = 'top';
        } else if (centerY > 2 * thirdHeight) {
            verticalPos = 'bottom';
        } else {
            verticalPos = 'middle';
        }

        const positionMap = {
            'top-left': 'in the upper-left corner',
            'top-center': 'at the top-center',
            'top-right': 'in the upper-right corner',
            'middle-left': 'on the middle-left side',
            'middle-center': 'in the exact center',
            'middle-right': 'on the middle-right side',
            'bottom-left': 'in the lower-left corner',
            'bottom-center': 'at the bottom-center',
            'bottom-right': 'in the lower-right corner'
        };
        const naturalPosition = positionMap[`${verticalPos}-${horizontalPos}`] || `at ${verticalPos}-${horizontalPos}`;

        let zIndexDescription = '';
        if (groups.length > 1) {
            if (index === groups.length - 1) {
                zIndexDescription = 'in the foreground';
            } else if (index === 0) {
                zIndexDescription = 'in the background';
            }
        }

        const shapeData = {
            label: label,
            type: shapeType,
            color: naturalColorName,
            emotion: emotion,
            action: action,
            eyeColor: eyeColor,
            clothing: clothing,
            hairStyle: hairStyle,
            hairColor: hairColor,
            naturalPosition: naturalPosition,
            zIndexDescription: zIndexDescription,
            size: { width: Math.round(renderedWidth), height: Math.round(renderedHeight) },
            originalGroupIndex: index,
            noColor: isNoColor,
            promptPrefix: promptPrefix, // Add to shapeData
            promptSuffix: promptSuffix // Add to shapeData
        };

        const key = `${shapeType}_${naturalColorName}`;
        if (!groupedShapes[key]) {
            groupedShapes[key] = [];
        }
        groupedShapes[key].push(shapeData);
    });

    let prompt_parts = [];

    if (selectedCameraAngle) {
        prompt_parts.push(selectedCameraAngle);
    }

    if (selectedArtStyle) {
        prompt_parts.push(`${selectedArtStyle} style`);
    }

    let background_phrase;
    if (selectedBackgroundIdea) {
        background_phrase = `a scene on a background of ${selectedBackgroundIdea}`;
    } else {
        background_phrase = `a scene with a neutral background`;
    }
    prompt_parts.push(background_phrase);

    let intro_sentence = "Generate " + prompt_parts.join(", ") + ".";

    if (selectedLightingMood) {
        intro_sentence += ` The lighting is ${selectedLightingMood}.`;
    }

    let prompt = intro_sentence;

    const shapePhrases = [];
    for (const key in groupedShapes) {
        const shapesInGroup = groupedShapes[key];
        const firstShape = shapesInGroup[0];

        let phrase;
        if (shapesInGroup.length === 1) {
            const naturalSize = getNaturalSizeDescription(firstShape.size.width, firstShape.size.height, canvasWidth, canvasHeight);
            
            let descriptiveParts = [];

            if (firstShape.zIndexDescription) {
                descriptiveParts.push(firstShape.zIndexDescription);
            }
            console.log("Debug Prompt - Emotion:", firstShape.emotion);
            if (firstShape.emotion && firstShape.emotion !== 'Select Emotion' && firstShape.emotion !== '') {
                descriptiveParts.push(`feeling ${firstShape.emotion}`);
            }
            console.log("Debug Prompt - Action:", firstShape.action);
            if (firstShape.action && firstShape.action !== 'Select Action' && firstShape.action !== '') {
                descriptiveParts.push(firstShape.action);
            }
            console.log("Debug Prompt - Eye Color:", firstShape.eyeColor);
            if (firstShape.eyeColor && firstShape.eyeColor !== 'Select Eye Color' && firstShape.eyeColor !== '') {
                descriptiveParts.push(firstShape.eyeColor);
            }
            console.log("Debug Prompt - Clothing:", firstShape.clothing);
            if (firstShape.clothing && firstShape.clothing !== 'Select Clothing' && firstShape.clothing !== '') {
                descriptiveParts.push(firstShape.clothing);
            }
            console.log("Debug Prompt - Hair Style:", firstShape.hairStyle);
            if (firstShape.hairStyle && firstShape.hairStyle !== 'Select Hair Style' && firstShape.hairStyle !== '') {
                descriptiveParts.push(firstShape.hairStyle);
            }
            console.log("Debug Prompt - Hair Color:", firstShape.hairColor);
            if (firstShape.hairColor && firstShape.hairColor !== 'Select Hair Color' && firstShape.hairColor !== '') {
                descriptiveParts.push(firstShape.hairColor);
            }

            let colorDescription = firstShape.color;
            if (firstShape.noColor) {
                colorDescription = ""; // Set to empty string if no color is selected
            }
            // Conditionally add colorDescription to the mainShapeClause
            const mainShapeClause = `${naturalSize} ${colorDescription ? colorDescription + ' ' : ''}${firstShape.label} located ${firstShape.naturalPosition} of the scene`;
            
            let descriptivePhrase = '';
            if (descriptiveParts.length > 0) {
                if (descriptiveParts.length === 1) {
                    descriptivePhrase = descriptiveParts[0];
                } else if (descriptiveParts.length === 2) {
                    descriptivePhrase = `${descriptiveParts[0]} and ${descriptiveParts[1]}`;
                } else {
                    descriptivePhrase = descriptiveParts.slice(0, -1).join(', ') + `, and ${descriptiveParts[descriptiveParts.length - 1]}`;
                }
                phrase = `${mainShapeClause} and ${descriptivePhrase}`;
            } else {
                phrase = mainShapeClause;
            }
            // Add prefix and suffix for single shapes
            if (firstShape.promptPrefix) {
                phrase = `${firstShape.promptPrefix} ${phrase}`;
            }
            if (firstShape.promptSuffix) {
                phrase = `${phrase} ${firstShape.promptSuffix}`;
            }
        } else {
            const count = shapesInGroup.length;
            const commonSize = getNaturalSizeDescription(firstShape.size.width, firstShape.size.height, canvasWidth, canvasHeight);
            
            let commonColorDescription = firstShape.color;
            if (firstShape.noColor) {
                commonColorDescription = ""; // Set to empty string if no color is selected
            }
            const commonLabel = firstShape.label;

            const pluralLabel = commonLabel.endsWith('s') ? commonLabel : `${commonLabel}s`;

            let quantityPhrase;
            if (count === 2) quantityPhrase = 'two';
            else if (count <= 5) quantityPhrase = 'a few';
            else if (count <= 10) quantityPhrase = 'several';
            else quantityPhrase = 'multiple';

            const uniquePositions = new Set(shapesInGroup.map(s => s.naturalPosition));
            let collectivePosition;
            if (uniquePositions.size === 1) {
                collectivePosition = `located ${uniquePositions.values().next().value} of the scene`;
            } else {
                collectivePosition = `scattered across various positions of the scene`;
            }

            const uniqueZIndexes = new Set(shapesInGroup.map(s => s.zIndexDescription).filter(Boolean));
            let collectiveZIndex = '';
            if (uniqueZIndexes.size === 1 && uniqueZIndexes.values().next().value) {
                collectiveZIndex = `, ${uniqueZIndexes.values().next().value}`;
            } else if (uniqueZIndexes.size > 1) {
                collectiveZIndex = `, at various depths`;
            }

            // Conditionally add commonColorDescription to the phrase
            phrase = `${quantityPhrase} ${commonSize} ${commonColorDescription ? commonColorDescription + ' ' : ''}${pluralLabel} ${collectivePosition}${collectiveZIndex}`;
        }
        shapePhrases.push(phrase);
    }

    if (shapePhrases.length > 0) {
        let elementsDescription = "";
        if (shapePhrases.length === 1) {
            elementsDescription = shapePhrases[0];
        } else if (shapePhrases.length === 2) {
            elementsDescription = `${shapePhrases[0]} and ${shapePhrases[1]}`;
        } else {
            elementsDescription = shapePhrases.slice(0, -1).join(', ') + `, and ${shapePhrases[shapePhrases.length - 1]}`;
        }
        prompt += ` Featuring ${elementsDescription}.`;
    }

    prompt += "\n\nEnsure all elements are accurately positioned, sized, and layered as described.";
    promptDisplay.value = prompt;
}

function handleCopyPrompt() {
    const fullPrompt = promptDisplay.value;
    // Remove the last line "Ensure all elements are accurately positioned, sized, and layered as described."
    const promptToCopy = fullPrompt.replace(/\n\nEnsure all elements are accurately positioned, sized, and layered as described\./, '');
    
    // Copy to clipboard
    navigator.clipboard.writeText(promptToCopy).then(() => {
        alert('Prompt copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy prompt:', err);
        alert('Failed to copy prompt. Please copy manually.');
    });
}

function getNaturalSizeDescription(width, height, canvasWidth, canvasHeight) {
    const shapeArea = width * height;
    const canvasArea = canvasWidth * canvasHeight;
    const areaRatio = shapeArea / canvasArea;

    if (areaRatio < 0.005) {
        return "a tiny";
    } else if (areaRatio < 0.02) {
        return "a small";
    } else if (areaRatio < 0.08) {
        return "a medium-sized";
    } else if (areaRatio < 0.25) {
        return "a large";
    } else {
        return "a very large";
    }
}

function handleZIndexChange(action) {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        action(selectedGroup);
        updateAllButtonStates();
    }
}

function handleDeleteShape() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    
    if (activeTextEditorForeignObject && selectedGroup && activeTextEditorForeignObject.parentNode === selectedGroup) {
        const textElement = selectedGroup._labelText;
        if (textElement) {
            SvgManager.updateShapeText(selectedGroup, '\u00A0');
        }
        activeTextEditorForeignObject.remove();
        activeTextEditorForeignObject = null;
        console.log("Text cleared for selected shape.");
    } else if (selectedGroup) {
        const success = SvgManager.deleteSelectedShape();
        if (success) {
            console.log("Shape deleted.");
            historyManager.pushState(SvgManager.getCanvasStateAsData());
        }
    }
    updateAllButtonStates();
}

function handleColorChange(e) {
    const newColor = e.target.value;
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        noFillColorCheckbox.checked = false; // Uncheck "no fill color"
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        SvgManager.updateShapeColor(selectedGroup, newColor, false);
        handleExportPrompt();
    }
}

function handleResetCanvas() {
    if (confirm("Are you sure you want to clear the canvas? All shapes will be deleted.")) {
        SvgManager.clearCanvas();
        promptDisplay.value = '';
        
        historyManager.clear();
        historyManager.pushState(SvgManager.getCanvasStateAsData());
        
        updateAllButtonStates();
    }
}

export function updateAllButtonStates() {
    const selected = SvgManager.getSelectedShapeGroup();
    const isFreeformSelected = selected && selected.getAttribute('data-shape-type') === 'freeform';
    
    deleteShapeBtn.disabled = !selected;

    undoBtn.disabled = !historyManager.canUndo();
    redoBtn.disabled = !historyManager.canRedo();

    colorSelect.disabled = !selected;
    if (selected) {
        const isNoColorActive = selected.getAttribute('data-no-color') === 'true';
        if (isNoColorActive) {
            colorSelect.value = '#F5DEB3';
            colorSelect.disabled = true;
            noFillColorCheckbox.checked = true;
        } else {
            colorSelect.value = selected.getAttribute('data-color');
            colorSelect.disabled = false;
            noFillColorCheckbox.checked = false;
        }
    } else {
        colorSelect.disabled = true;
        colorSelect.value = '#FF0000';
        noFillColorCheckbox.checked = false;
    }

    if (freeformToolsDrawer) {
        if (shapeTypeDropdownValue === 'freeform' || isFreeformSelected) {
            freeformToolsDrawer.style.display = 'block';
        } else {
            freeformToolsDrawer.style.display = 'none';
        }
    }

    const isSelected = !!selected;
    bringToFrontBtn.disabled = !isSelected || !selected.nextSibling;
    sendToBackBtn.disabled = !isSelected || !selected.previousSibling;
    bringForwardBtn.disabled = !isSelected || !selected.nextSibling;
    sendBackwardBtn.disabled = !isSelected || !selected.previousSibling;

    if (selected) {
        selected.style.pointerEvents = 'all';
    }

    const toggleEditModeBtn = document.getElementById('toggle-edit-mode-btn');
    if (toggleEditModeBtn) {
        if (shapeTypeDropdownValue === 'freeform') {
            toggleEditModeBtn.disabled = false;
            toggleEditModeBtn.textContent = "Stop Drawing";
        } else {
            toggleEditModeBtn.disabled = true;
            toggleEditModeBtn.textContent = "Toggle Edit Mode";
        }
    }

    const addPointBtn = document.getElementById('add-point-btn');
    if (addPointBtn) {
        addPointBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && isDrawingFreeform);
    }
    
    const closePathBtn = document.getElementById('close-path-btn');
    if (closePathBtn) {
        closePathBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && currentFreeformGroup && currentFreeformPathData.length > 1);
    }

    const deletePointBtn = document.getElementById('delete-point-btn');
    const convertToBezierBtn = document.getElementById('convert-to-bezier-btn');
    if (deletePointBtn) {
        deletePointBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && !isDrawingFreeform && selected && selectedFreeformPointIndex !== -1);
    }
    if (convertToBezierBtn) {
        convertToBezierBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && !isDrawingFreeform && selected);
    }
}

document.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('shape-label')) {
        e.stopPropagation();
        const textElement = e.target;
        const group = textElement.parentNode;

        const currentLabel = textElement.textContent;
        const foreignObject = document.createElementNS(SvgManager.SVG_NS, 'foreignObject');
        const input = document.createElement('input');

        const textBBox = textElement.getBBox();
        
        foreignObject.setAttribute('x', textBBox.x);
        foreignObject.setAttribute('y', textBBox.y);
        foreignObject.setAttribute('width', textBBox.width + 20);
        foreignObject.setAttribute('height', textBBox.height + 10);

        input.type = 'text';
        input.value = currentLabel;
        Object.assign(input.style, {
            width: '100%',
            height: '100%',
            border: '1px solid #007bff',
            borderRadius: '3px',
            textAlign: 'center',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            padding: '2px'
        });

        foreignObject.appendChild(input);
        group.appendChild(foreignObject);

        input.focus();

        input.addEventListener('blur', () => {
            const newLabel = input.value.trim();
            SvgManager.updateShapeText(group, newLabel);
            foreignObject.remove();
            activeTextEditorForeignObject = null;
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
            }
        });

        activeTextEditorForeignObject = foreignObject;
    } else if (e.target.closest('.shape-group[data-shape-type="freeform"]')) {
        e.stopPropagation();
        const freeformGroup = e.target.closest('.shape-group[data-shape-type="freeform"]');
        
        const shapeTypeDropdown = document.getElementById('shape-type-dropdown');
        const freeformOption = shapeTypeDropdown.querySelector('.dropdown-option[data-value="freeform"]');
        if (freeformOption) {
            freeformOption.click(); 
        }

        isDrawingFreeform = false;
        currentFreeformGroup = freeformGroup;
        currentFreeformPathElement = freeformGroup._shapeBody;

        currentFreeformPathData = freeformGroup._pathData || SvgManager.getFreeformPathData(currentFreeformPathElement);

        SvgManager.setSelectedShapeGroup(currentFreeformGroup);
        DragAndResize.enableDragAndResize(currentFreeformGroup);
        freeformToolsDrawer.style.display = 'block';
        updateAllButtonStates();
        console.log("Freeform shape double-clicked. Entering edit mode.");
    }
});

function handleExportPng() {
    const svgCanvas = SvgManager.getSvgCanvas();
    const selectedShape = SvgManager.getSelectedShapeGroup();

    // Temporarily remove selection and handles for a clean export
    const handlesToRestore = [];
    const allShapeGroups = svgCanvas.querySelectorAll('.shape-group');
    allShapeGroups.forEach(group => {
        const handles = group._handles;
        if (handles && handles.length > 0) {
            handles.forEach(handle => {
                if (handle.parentNode === group) {
                    group.removeChild(handle);
                    handlesToRestore.push({ group: group, handle: handle });
                }
            });
        }
        group.classList.remove('selected');
    });

    const svgString = new XMLSerializer().serializeToString(svgCanvas);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = svgCanvas.width.baseVal.value;
        canvas.height = svgCanvas.height.baseVal.value;
        const ctx = canvas.getContext('2d');

        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Get the data URL of the canvas as a PNG
        const pngUrl = canvas.toDataURL('image/png');

        // Create a link to download the PNG
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = 'shap_prompteur_design.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up the object URL
        URL.revokeObjectURL(url);

        // Restore handles and selection
        handlesToRestore.forEach(item => {
            item.group.appendChild(item.handle);
        });
        if (selectedShape) {
            selectedShape.classList.add('selected');
        }
    };

    img.onerror = (e) => {
        console.error("Error loading SVG image for PNG conversion:", e);
        alert("Failed to convert SVG to PNG. Please try again.");

        // Restore handles and selection even on error
        handlesToRestore.forEach(item => {
            item.group.appendChild(item.handle);
        });
        if (selectedShape) {
            selectedShape.classList.add('selected');
        }
    };

    img.src = url;
}

export function setIdCardIconClickListener(idCardIcon, shapeGroup) {
    idCardIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const objectIdCard = document.getElementById('object-id-card');
        if (objectIdCard.style.display === 'block' && SvgManager.getSelectedShapeGroup() === shapeGroup) {
            objectIdCard.style.display = 'none';
        } else {
            SvgManager.setSelectedShapeGroup(shapeGroup);
            handleIdCardIconClick(shapeGroup);
        }
    });
}

function handleIdCardIconClick(shapeGroup) {
    const objectIdCard = document.getElementById('object-id-card');
    const objectIdCardHeader = objectIdCard.querySelector('.panel-header');

    objectIdCard.style.display = 'block';

    const shapeLabel = shapeGroup._labelText ? shapeGroup._labelText.textContent.trim() : 'Shape';
    objectIdCardHeader.textContent = shapeLabel;

    const currentEmotion = shapeGroup.getAttribute('data-emotion');
    const currentAction = shapeGroup.getAttribute('data-action');
    const currentEyeColor = shapeGroup.getAttribute('data-eye-color');
    const currentClothing = shapeGroup.getAttribute('data-clothing');
    const currentHairStyle = shapeGroup.getAttribute('data-hair-style');
    const currentHairColor = shapeGroup.getAttribute('data-hair-color');

    emotionDropdownInstance.setSelectedValue(currentEmotion);
    actionDropdownInstance.setSelectedValue(currentAction);
    eyeColorDropdownInstance.setSelectedValue(currentEyeColor);
    clothingDropdownInstance.setSelectedValue(currentClothing);
    hairStyleDropdownInstance.setSelectedValue(currentHairStyle);
    hairColorDropdownInstance.setSelectedValue(currentHairColor);

    // Populate custom prompt textareas
    promptPrefixTextarea.value = shapeGroup.getAttribute('data-prompt-prefix') || '';
    promptSuffixTextarea.value = shapeGroup.getAttribute('data-prompt-suffix') || '';
}

function handleSaveIdCardAttributes() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (!selectedGroup) {
        alert("Please select a shape first.");
        return;
    }

    historyManager.pushState(SvgManager.getCanvasStateAsData());

    const emotionDropdown = document.getElementById('emotion-dropdown');
    const actionDropdown = document.getElementById('action-dropdown');
    const eyeColorDropdown = document.getElementById('eye-color-dropdown');
    const clothingDropdown = document.getElementById('clothing-dropdown');
    const hairStyleDropdown = document.getElementById('hair-style-dropdown');
    const hairColorDropdown = document.getElementById('hair-color-dropdown');

    selectedGroup.setAttribute('data-emotion', emotionDropdown.querySelector('.dropdown-selected-value').getAttribute('data-value') || '');
    selectedGroup.setAttribute('data-action', actionDropdown.querySelector('.dropdown-selected-value').getAttribute('data-value') || '');
    selectedGroup.setAttribute('data-eye-color', eyeColorDropdown.querySelector('.dropdown-selected-value').getAttribute('data-value') || '');
    selectedGroup.setAttribute('data-clothing', clothingDropdown.querySelector('.dropdown-selected-value').getAttribute('data-value') || '');
    selectedGroup.setAttribute('data-hair-style', hairStyleDropdown.querySelector('.dropdown-selected-value').getAttribute('data-value') || '');
    selectedGroup.setAttribute('data-hair-color', hairColorDropdown.querySelector('.dropdown-selected-value').getAttribute('data-value') || '');
    selectedGroup.setAttribute('data-prompt-prefix', promptPrefixTextarea.value.trim()); // Save prefix text
    selectedGroup.setAttribute('data-prompt-suffix', promptSuffixTextarea.value.trim()); // Save suffix text

    handleExportPrompt();
    alert("Attributes saved successfully!");
}

function handleSaveSvg() {
    const svgCanvas = SvgManager.getSvgCanvas();
    const selectedShape = SvgManager.getSelectedShapeGroup();

    const handlesToRestore = [];
    const allShapeGroups = svgCanvas.querySelectorAll('.shape-group');
    allShapeGroups.forEach(group => {
        const handles = group._handles;
        if (handles && handles.length > 0) {
            handles.forEach(handle => {
                if (handle.parentNode === group) {
                    group.removeChild(handle);
                    handlesToRestore.push({ group: group, handle: handle });
                }
            });
        }
    });

    allShapeGroups.forEach(group => {
        group.classList.remove('selected');
    });

    const svgString = new XMLSerializer().serializeToString(svgCanvas);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'shap_prompteur_design.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    handlesToRestore.forEach(item => {
        item.group.appendChild(item.handle);
    });

    if (selectedShape) {
        selectedShape.classList.add('selected');
    }
}
