// js/eventHandlers.js

import * as SvgManager from './svgManager.js';
import * as DragAndResize from './dragAndResize.js';
import { getClosestColorName } from './colorUtils.js';
import * as BackgroundManager from './backgroundManager.js';

let colorSelect, labelText, createShapeBtn, deleteShapeBtn, clearCanvasBtn, exportPromptBtn, promptDisplay, exportPngBtn, saveSvgBtn;
let bringToFrontBtn, sendToBackBtn, bringForwardBtn, sendBackwardBtn;
let applyBackgroundBtn; // No longer directly referencing background select elements
let strokeColorInput, applyStrokeToAllBtn; // New variables for stroke color input and button

let shapeTypeDropdownValue = 'rect'; // Store the selected shape type
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

// Function to handle "Apply Background" button click
const handleApplyBackground = () => {
    // Value is already updated by custom dropdown's onSelectCallback
    handleExportPrompt(); // Re-generate prompt with new background
};

export function setupEventListeners() {
    colorSelect = document.getElementById('shape-color');
    labelText = document.getElementById('shape-label');
    createShapeBtn = document.getElementById('create-shape');
    deleteShapeBtn = document.getElementById('delete-shape');
    clearCanvasBtn = document.getElementById('clear-canvas');
    exportPromptBtn = document.getElementById('export-prompt');
    promptDisplay = document.getElementById('prompt-display');
    exportPngBtn = document.getElementById('export-png');
    saveSvgBtn = document.getElementById('save-svg');
    bringToFrontBtn = document.getElementById('bring-to-front-btn');
    sendToBackBtn = document.getElementById('send-to-back-btn');
    bringForwardBtn = document.getElementById('bring-forward-btn');
    sendBackwardBtn = document.getElementById('send-backward-btn');
    const svgCanvas = SvgManager.getSvgCanvas();
    freeformToolsDrawer = document.getElementById('freeform-tools-drawer'); // Initialize the drawer variable
    strokeColorInput = document.getElementById('stroke-color'); // Initialize stroke color input
    applyStrokeToAllBtn = document.getElementById('apply-stroke-to-all'); // Initialize apply stroke button

    createShapeBtn.addEventListener('click', handleAddShape);
    deleteShapeBtn.addEventListener('click', handleDeleteShape);
    clearCanvasBtn.addEventListener('click', handleResetCanvas);
    exportPromptBtn.addEventListener('click', handleExportPrompt);
    exportPngBtn.addEventListener('click', handleExportPng);
    saveSvgBtn.addEventListener('click', handleSaveSvg);
    bringToFrontBtn.addEventListener('click', () => handleZIndexChange(SvgManager.bringToFront));
    sendToBackBtn.addEventListener('click', () => handleZIndexChange(SvgManager.sendToBack));
    bringForwardBtn.addEventListener('click', () => handleZIndexChange(SvgManager.bringForward));
    sendBackwardBtn.addEventListener('click', () => handleZIndexChange(SvgManager.sendBackward));

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
            DragAndResize.endDragOrResize();
        }
    });
    
    svgCanvas.addEventListener('mouseleave', (e) => {
        if (isDrawingFreeform) { // If currently drawing freeform, treat as mouse up
            handleFreeformMouseUp(e);
        } else { // Otherwise, allow general drag/resize (for all shapes, including freeform when not drawing)
            DragAndResize.endDragOrResize();
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

        // Deselect if currently selected shape AND click was not on a shape group,
        // AND not on any control panel/dropdown, AND not on the SVG canvas itself (unless in freeform draw mode)
        if (SvgManager.getSelectedShapeGroup() && 
            !clickedOnShapeGroup && 
            !clickedOnControlsSidebar && 
            !clickedOnRightSidebar && 
            !clickedOnPromptArea &&
            !clickedOnCustomDropdown &&
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
    const observer = new MutationObserver(() => {
        updateAllButtonStates();
    });
    observer.observe(svgCanvas, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // Initialisation de l'état des boutons
    updateAllButtonStates();

    // Event listener for color picker
    colorSelect.addEventListener('input', handleColorChange);

    applyBackgroundBtn = document.getElementById('apply-background-btn');
    applyBackgroundBtn.addEventListener('click', handleApplyBackground);

    strokeColorInput = document.getElementById('stroke-color');
    applyStrokeToAllBtn = document.getElementById('apply-stroke-to-all');
    strokeColorInput.addEventListener('input', handleStrokeColorChange);
    applyStrokeToAllBtn.addEventListener('click', handleApplyStrokeToAll);


    // Camera Angle Controls
    const cameraAngleButtonsContainer = document.getElementById('camera-angle-buttons');
    populateCameraAngles(cameraAngleButtonsContainer);

    // Setup custom dropdowns
    // Shape Type
    const shapeTypeDropdown = setupCustomDropdown('shape-type-dropdown', [
        {name: 'Rectangle', value: 'rect'},
        {name: 'Circle', value: 'circle'},
        {name: 'Ellipse', value: 'ellipse'},
        {name: 'Triangle', value: 'polygon'},
        {name: 'Freeform', value: 'freeform'} // Added Freeform option here as well
    ], (selectedObject) => {
        shapeTypeDropdownValue = selectedObject.value;
        if (selectedObject.value === 'freeform') {
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
        } else {
            // Clear freeform specific state when switching to other shape types
            isDrawingFreeform = false;
            currentFreeformGroup = null;
            currentFreeformPathData = [];
            currentFreeformPathElement = null;
            SvgManager.clearFreeformPointVisuals();
        }
        updateAllButtonStates(); // Update button states based on new mode
    });
    shapeTypeDropdownValue = shapeTypeDropdown.getSelectedValue();
    // The onSelect logic is now passed directly into setupCustomDropdown

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
                handleExportPrompt(); // Re-generate prompt with new background
            } else {
                selectedBackgroundIdea = null;
                selectedBackgroundGradientColors = null;
                SvgManager.setCanvasBackgroundGradient([]); // Clear gradient if no ideas
                handleExportPrompt();
            }
        }
    ); // Correctly closing the setupCustomDropdown call

    // Stroke color functions
    function handleStrokeColorChange(e) {
    const newColor = e.target.value;
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        SvgManager.updateShapeStrokeColor(selectedGroup, newColor);
        handleExportPrompt();
    }
}

function handleApplyStrokeToAll() {
    const strokeColor = strokeColorInput.value;
    const svgCanvas = SvgManager.getSvgCanvas();
    const allShapeGroups = svgCanvas.querySelectorAll('.shape-group');
    allShapeGroups.forEach(group => {
        SvgManager.updateShapeStrokeColor(group, strokeColor);
    });
    handleExportPrompt();
}
    // Initialize backgroundCategoryDropdownValue after setup
    backgroundCategoryDropdownValue = backgroundCategoryDropdown.getSelectedValue();

    // Initial population for background idea dropdown
    // This needs to be called after backgroundCategoryDropdownValue is initialized
    const initialBackgroundIdeas = BackgroundManager.getIdeasForCategory(backgroundCategoryDropdownValue);
    backgroundIdeaDropdownInstance = setupCustomDropdown('background-idea-dropdown', initialBackgroundIdeas, (selectedIdeaObject) => {
        selectedBackgroundIdea = selectedIdeaObject.name; // Update selectedBackgroundIdea with the name
        selectedBackgroundGradientColors = selectedIdeaObject.gradient_colors; // Store colors
        SvgManager.setCanvasBackgroundGradient(selectedBackgroundGradientColors); // Apply gradient
        handleExportPrompt();
    });
    // Set initial values based on the first option after setup
    if (initialBackgroundIdeas.length > 0) {
        selectedBackgroundIdea = initialBackgroundIdeas[0].name;
        selectedBackgroundGradientColors = initialBackgroundIdeas[0].gradient_colors;
        SvgManager.setCanvasBackgroundGradient(selectedBackgroundGradientColors); // Apply initial gradient
    }

    // Lighting & Mood
    const lightingMoodDropdown = setupCustomDropdown('lighting-mood-dropdown',
        BackgroundManager.getLightingAndMoods().map(mood => ({name: mood.name, value: mood.prompt_phrase})),
        (selectedObject) => {
            selectedLightingMood = selectedObject.value;
            handleExportPrompt();
        }
    );
    selectedLightingMood = lightingMoodDropdown.getSelectedValue();

    // Art Style/Medium
    const artStyleDropdown = setupCustomDropdown('art-style-dropdown',
        BackgroundManager.getArtStyles().map(style => ({name: style.name, value: style.prompt_phrase})),
        (selectedObject) => {
            selectedArtStyle = selectedObject.value;
            handleExportPrompt();
        }
    );
    selectedArtStyle = artStyleDropdown.getSelectedValue();


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
        if (e.key === 'Delete' || e.key === 'Backspace') { // 'Delete' key or 'Backspace'
            handleDeleteShape();
        } else if (e.ctrlKey && e.key === 'c') { // Ctrl+C for copy
            handleCopyShape();
        } else if (e.ctrlKey && e.key === 'v') { // Ctrl+V for paste
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
            // If a freeform shape is selected and we are in edit mode (not drawing)
            // Re-enter drawing mode to add points to the selected path
            isDrawingFreeform = true;
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
    // This is a complex feature requiring adding Bezier control points and
    // corresponding UI for manipulating them.
    console.log("Convert to Bezier button clicked: This feature is not yet fully implemented.");
    alert("Bezier curve conversion is a complex feature and is not yet implemented.");
}

function handleToggleEditModeBtn() {
    // This button should toggle between "drawing" (adding points) and "editing" (moving points)
    if (shapeTypeDropdownValue === 'freeform') {
        isDrawingFreeform = !isDrawingFreeform;

        if (isDrawingFreeform) {
            // Entering drawing mode: clear selection, start fresh
            currentFreeformGroup = null;
            currentFreeformPathData = [];
            currentFreeformPathElement = null;
            SvgManager.clearFreeformPointVisuals();
            SvgManager.setSelectedShapeGroup(null);
            console.log("Freeform drawing mode activated (click to add points).");
        } else {
            // Exiting drawing mode (i.e., 'Stop Drawing' was clicked)
            // This button now acts as a 'Done Editing' button in this context.
            if (currentFreeformGroup && currentFreeformPathData.length > 1 && currentFreeformPathData[currentFreeformPathData.length - 1].cmd !== 'Z') {
                console.log("Freeform drawing stopped.");
                // The path is already finalized by handleFreeformMouseUp or handleClosePathBtn
            }
            
            // Hide freeform tools and deselect shape
            freeformToolsDrawer.style.display = 'none';
            SvgManager.setSelectedShapeGroup(null);
            currentFreeformGroup = null; // Clear state
            currentFreeformPathElement = null;
            currentFreeformPathData = [];
            SvgManager.clearFreeformPointVisuals(); // Ensure visuals are cleared
            
            console.log("Exited freeform editing mode via 'Toggle Edit Mode' button.");
        }
        updateAllButtonStates();
    }
}

function handleClosePathBtn() {
    if (currentFreeformGroup && currentFreeformPathData.length > 1) {
        // Add a 'Z' command to close the path only if not already closed
        if (currentFreeformPathData[currentFreeformPathData.length - 1].cmd !== 'Z') {
            currentFreeformPathData.push({ cmd: 'Z' });
            SvgManager.updateFreeformPath(currentFreeformPathElement, currentFreeformPathData);
        }
        isDrawingFreeform = false; // End drawing for this path
        SvgManager.clearFreeformPointVisuals(); // Clear point visuals after closing
        // Keep currentFreeformGroup and currentFreeformPathElement for selection/editing
        SvgManager.setSelectedShapeGroup(currentFreeformGroup); // Ensure the shape is selected
        DragAndResize.enableDragAndResize(currentFreeformGroup); // Ensure it's resizable
        updateAllButtonStates();
        console.log("Path closed and freeform drawing ended. Shape is now selectable and resizable.");
    } else {
        console.log("Cannot close path: no active freeform path or not enough points.");
    }
}

function handleFreeformMouseDown(e) {
    if (e.button !== 0) return; // Only left click

    const svgCanvas = SvgManager.getSvgCanvas();
    const svgRect = svgCanvas.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    // If in drawing mode (isDrawingFreeform is true)
    if (isDrawingFreeform && shapeTypeDropdownValue === 'freeform') {
        if (!currentFreeformGroup) {
            // Start a new freeform shape
            currentFreeformPathData = [{ cmd: 'M', x: x, y: y }];
            const color = colorSelect.value;
            const label = labelText.value.trim() || `Freeform ${Date.now()}`;
            currentFreeformGroup = SvgManager.createFreeformPath(currentFreeformPathData, color, label);
            currentFreeformPathElement = currentFreeformGroup._shapeBody; // The path element itself
            SvgManager.setSelectedShapeGroup(currentFreeformGroup); // Select the new group
            DragAndResize.enableDragAndResize(currentFreeformGroup); // Enable drag/resize for the new freeform shape
            SvgManager.addFreeformPointVisual(currentFreeformGroup, { x: x, y: y }, 0); // Add visual point for the first point
        } else {
            // Continue drawing if a freeform shape is active and not closed
            const lastCommand = currentFreeformPathData[currentFreeformPathData.length - 1];
            if (lastCommand && lastCommand.cmd !== 'Z') { // Only add if path is not closed
                currentFreeformPathData.push({ cmd: 'L', x: x, y: y });
                SvgManager.updateFreeformPath(currentFreeformPathElement, currentFreeformPathData);
                SvgManager.addFreeformPointVisual(currentFreeformGroup, { x: x, y: y }, currentFreeformPathData.length - 1); // Add visual point for subsequent points
            }
        }
    } else {
        // If not in drawing mode, allow normal selection/deselection
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

    // For now, we'll keep it simple for point-by-point drawing.
    // If we were drawing a continuous line, we'd update the last segment here.
    // This could be used for rubber-banding effect for the current segment.
    // For now, just update the path if it's the first point (M) or last point (L) of a segment.
    if (currentFreeformPathData.length === 1) { // Only the 'M' command exists
        // This is primarily for visual feedback during drag-to-draw, not point-by-point
        // For point-by-point, mousemove doesn't typically modify the path data directly.
    } else {
        // If the last command is 'L', we could update its coordinates to provide rubber-banding
        // This requires more sophisticated path data management (e.g., a temporary last point).
        // For now, we'll skip live update on mousemove for simplicity in point-by-point.
    }
}

function handleFreeformMouseUp(e) {
    // For point-by-point drawing, mouse up just signifies end of interaction for that point
    // We don't reset isDrawingFreeform here if we want to add multiple points by clicking.
    // isDrawingFreeform will be reset when a different tool is selected or drawing is finalized.
    // If we were doing a drag-to-draw continuous path, this is where we'd finalize the segment.
}

function handleCopyShape() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        copiedShapeData = SvgManager.getShapeData(selectedGroup);
        console.log('Shape copied:', copiedShapeData);
    }
}

function handlePasteShape() {
    if (copiedShapeData) {
        const newX = copiedShapeData.x + 20; // Offset pasted shape
        const newY = copiedShapeData.y + 20; // Offset pasted shape
        
        const newGroup = SvgManager.createShapeGroup(
            copiedShapeData.type,
            copiedShapeData.color,
            copiedShapeData.label,
            newX,
            newY,
            copiedShapeData.width,
            copiedShapeData.height
        );
        if (newGroup) {
            DragAndResize.enableDragAndResize(newGroup);
            SvgManager.setSelectedShapeGroup(newGroup);
            updateAllButtonStates();
            console.log('Shape pasted:', newGroup);
        }
    }
}

function handleDoneEditingFreeform() {
    isDrawingFreeform = false; // Exit drawing/editing mode
    freeformToolsDrawer.style.display = 'none'; // Hide the freeform tools
    SvgManager.setSelectedShapeGroup(null); // Deselect the freeform shape
    updateAllButtonStates();
    console.log("Exited freeform editing mode.");
}

function resetSelectedFreeformPoint() {
    if (selectedFreeformPointVisual) {
        selectedFreeformPointVisual.classList.remove('selected-point');
    }
    selectedFreeformPointVisual = null;
    selectedFreeformPointIndex = -1;
    updateAllButtonStates(); // Update button states after resetting selection
}

function handleFreeformPointClick(e) {
    const newSelectedPointVisual = e.detail.pointVisual;
    const newSelectedPointIndex = e.detail.pointIndex;

    // Deselect previously selected point if different
    if (selectedFreeformPointVisual && selectedFreeformPointVisual !== newSelectedPointVisual) {
        selectedFreeformPointVisual.classList.remove('selected-point');
    }

    if (selectedFreeformPointVisual === newSelectedPointVisual) {
        // Deselect if clicking the same point again
        selectedFreeformPointVisual.classList.remove('selected-point');
        selectedFreeformPointVisual = null;
        selectedFreeformPointIndex = -1;
    } else {
        newSelectedPointVisual.classList.add('selected-point');
        selectedFreeformPointVisual = newSelectedPointVisual;
        selectedFreeformPointIndex = newSelectedPointIndex;
    }
    updateAllButtonStates(); // Update button states based on point selection
}

// Function to setup a custom dropdown
// Returns an object with methods to control the dropdown
    // Function to setup a custom dropdown
    // Returns an object with methods to control the dropdown
    function setupCustomDropdown(dropdownId, optionsData, onSelectCallback = null) {
        const dropdown = document.getElementById(dropdownId);
        const selectedValueDisplay = dropdown.querySelector('.dropdown-selected-value');
        const optionsContainer = dropdown.querySelector('.dropdown-options');

        let currentSelectedValue = null; // This will store the 'value' attribute of the selected option
        let currentSelectedObject = null; // This will store the entire optionData object of the selected option

        // Function to populate/update options
        const updateOptions = (newOptionsData, initialValue = null) => { // Added initialValue parameter
            optionsContainer.innerHTML = ''; // Clear existing options
            let foundInitial = false; // Flag to check if initialValue was found and set

            newOptionsData.forEach(optionData => {
                const optionElement = document.createElement('div');
                optionElement.classList.add('dropdown-option');
                optionElement.textContent = optionData.name;
                optionElement.setAttribute('data-value', optionData.value || optionData.name); 
                optionElement.addEventListener('click', () => {
                    selectedValueDisplay.textContent = optionData.name;
                    selectedValueDisplay.setAttribute('data-value', optionData.value || optionData.name);
                    currentSelectedValue = optionData.value || optionData.name;
                    currentSelectedObject = optionData;
                    dropdown.classList.remove('open');
                    if (onSelectCallback) {
                        onSelectCallback(currentSelectedObject);
                    }
                });
                optionsContainer.appendChild(optionElement);

                // Check if this option matches the initialValue
                if (initialValue !== null && (optionData.value === initialValue || optionData.name === initialValue)) {
                    selectedValueDisplay.textContent = optionData.name;
                    selectedValueDisplay.setAttribute('data-value', optionData.value || optionData.name);
                    currentSelectedValue = optionData.value || optionData.name;
                    currentSelectedObject = optionData;
                    foundInitial = true;
                }
            });

            // If no initialValue was provided or found, default to the first option
            if (!foundInitial && newOptionsData.length > 0) {
                selectedValueDisplay.textContent = newOptionsData[0].name;
                selectedValueDisplay.setAttribute('data-value', newOptionsData[0].value || newOptionsData[0].name);
                currentSelectedValue = newOptionsData[0].value || newOptionsData[0].name;
                currentSelectedObject = newOptionsData[0];
            } else if (newOptionsData.length === 0) { // If no options at all
                selectedValueDisplay.textContent = '';
                selectedValueDisplay.setAttribute('data-value', '');
                currentSelectedValue = null;
                currentSelectedObject = null;
            }
        };

        // Get the initial value from the HTML's selected display element
        const initialHtmlValue = selectedValueDisplay.getAttribute('data-value');
        
        // Initial population, passing the value from HTML
        updateOptions(optionsData, initialHtmlValue);

        // Toggle dropdown on click
        selectedValueDisplay.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent document click listener from closing it immediately
            document.querySelectorAll('.custom-dropdown.open').forEach(openDropdown => {
                if (openDropdown !== dropdown) { // Close other open dropdowns
                    openDropdown.classList.remove('open');
                }
            });
            dropdown.classList.toggle('open');
        });

        // Return control object
        return {
            getSelectedValue: () => currentSelectedValue,
            getSelectedObject: () => currentSelectedObject, // New method to get the full selected object
            updateOptions: updateOptions
        };
    }

function populateCameraAngles(container) {
    const angles = BackgroundManager.getCameraAngles();
    container.innerHTML = ''; // Clear existing buttons
    angles.forEach(angle => {
        const button = document.createElement('button');
        button.textContent = angle.name;
        button.classList.add('camera-angle-btn');
        button.setAttribute('data-prompt-phrase', angle.prompt_phrase);
        button.addEventListener('click', () => {
            // Remove 'selected' class from all buttons
            document.querySelectorAll('.camera-angle-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            // Add 'selected' class to the clicked button
            button.classList.add('selected');
            selectedCameraAngle = angle.prompt_phrase;
            handleExportPrompt(); // Re-generate prompt with new camera angle
        });
        container.appendChild(button);
    });

    // Select the first angle by default
    if (angles.length > 0) {
        container.querySelector('.camera-angle-btn').classList.add('selected');
        selectedCameraAngle = angles[0].prompt_phrase;
    }
}

function handleAddShape() {
    const shapeType = shapeTypeDropdownValue; // Get value from custom dropdown
    const color = colorSelect.value;
    const label = labelText.value.trim() || `Shape ${Date.now()}`;
    const strokeColor = strokeColorInput.value; // Get stroke color
    const strokeWidth = 2; // Default stroke width

    if (shapeType === 'freeform') {
        // Automatically place the first point and activate drawing mode
        isDrawingFreeform = true;
        currentFreeformGroup = null; // Ensure a new path starts
        currentFreeformPathData = [];
        currentFreeformPathElement = null;
        SvgManager.clearFreeformPointVisuals(); // Clear any old point visuals
        SvgManager.setSelectedShapeGroup(null); // Deselect any existing shape

        const svgCanvas = SvgManager.getSvgCanvas();
        const initialX = svgCanvas.clientWidth / 2; // Center X
        const initialY = svgCanvas.clientHeight / 2; // Center Y

        currentFreeformPathData = [{ cmd: 'M', x: initialX, y: initialY }];
        currentFreeformGroup = SvgManager.createFreeformPath(currentFreeformPathData, color, label, strokeColor, strokeWidth);
        currentFreeformPathElement = currentFreeformGroup._shapeBody;
        SvgManager.setSelectedShapeGroup(currentFreeformGroup);
        DragAndResize.enableDragAndResize(currentFreeformGroup); // Enable drag/resize for the new freeform shape
        SvgManager.addFreeformPointVisual(currentFreeformGroup, { x: initialX, y: initialY }, 0); // Add visual point for the first point

        updateAllButtonStates();
        console.log("Freeform drawing mode activated. First point placed automatically. Click on canvas to add more points.");
    } else {
        const initialX = 50;
        const initialY = 50;
        const initialWidth = 100;
        const initialHeight = 100;

        const newGroup = SvgManager.createShapeGroup(shapeType, color, label, initialX, initialY, initialWidth, initialHeight, strokeColor, strokeWidth);
        if (newGroup) {
            DragAndResize.enableDragAndResize(newGroup); // Enable drag/resize for non-freeform shapes
            labelText.value = '';
            SvgManager.setSelectedShapeGroup(newGroup); // Select the new shape
            updateAllButtonStates();
        }
    }
    handleExportPrompt(); // Call after shape is added/mode is set
}

function handleExportPrompt() {
    const svgCanvas = SvgManager.getSvgCanvas();
    const groups = Array.from(svgCanvas.querySelectorAll('.shape-group'));
    const canvasDimensions = SvgManager.getCanvasDimensions();

    const canvasWidth = canvasDimensions.width;
    const canvasHeight = canvasDimensions.height;

    // Group shapes by type and color
    const groupedShapes = {}; // Key: "type_color", Value: Array of shape data

    console.log("handleExportPrompt: Found groups:", groups.length); // DIAGNOSTIC
    groups.forEach((group, index) => {
        const shapeDataFromManager = SvgManager.getShapeData(group);
        if (!shapeDataFromManager) {
            console.warn("Could not get shape data for group:", group);
            return; // Skip this group if data is not available
        }

        const label = shapeDataFromManager.label;
        const shapeType = shapeDataFromManager.type;
        const hexColor = shapeDataFromManager.color; // This is already the hex color
        console.log(`Processing group ${index}: Label='${label}', Type='${shapeType}', Color='${hexColor}'`); // DIAGNOSTIC
        const naturalColorName = getClosestColorName(hexColor);

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

        // Z-index description (simplified for individual processing, will be re-evaluated for groups)
        let zIndexDescription = '';
        if (groups.length > 1) { // Only add z-index info if there's more than one shape
            if (index === groups.length - 1) { // Last element in DOM is on top
                zIndexDescription = 'in the foreground';
            } else if (index === 0) { // First element in DOM is at the back
                zIndexDescription = 'in the background';
            }
        }

        const shapeData = {
            label: label,
            type: shapeType,
            color: naturalColorName,
            naturalPosition: naturalPosition,
            zIndexDescription: zIndexDescription,
            size: { width: Math.round(renderedWidth), height: Math.round(renderedHeight) },
            originalGroupIndex: index // Keep original index for sorting if needed
        };

        const key = `${shapeType}_${naturalColorName}`;
        if (!groupedShapes[key]) {
            groupedShapes[key] = [];
        }
        groupedShapes[key].push(shapeData);
    });

    let prompt_parts = [];

    // 1. Camera Angle
    if (selectedCameraAngle) {
        prompt_parts.push(selectedCameraAngle);
    }

    // 2. Art Style
    if (selectedArtStyle) {
        prompt_parts.push(`${selectedArtStyle} style`);
    }

    // 3. Scene/Background introduction
    let background_phrase;
    if (selectedBackgroundIdea) {
        background_phrase = `a scene on a background of ${selectedBackgroundIdea}`;
    } else {
        background_phrase = `a scene with a neutral background`;
    }
    prompt_parts.push(background_phrase);

    // Join the initial parts
    let intro_sentence = "Generate " + prompt_parts.join(", ") + ".";

    // 4. Lighting and Mood (as a separate sentence if present)
    if (selectedLightingMood) {
        intro_sentence += ` The lighting is ${selectedLightingMood}.`;
    }

    let prompt = intro_sentence;

    const shapePhrases = [];
    for (const key in groupedShapes) {
        const shapesInGroup = groupedShapes[key];
        const firstShape = shapesInGroup[0]; // Use first shape for common properties

        let phrase;
        if (shapesInGroup.length === 1) {
            // Single instance, generate individual phrase
            const naturalSize = getNaturalSizeDescription(firstShape.size.width, firstShape.size.height, canvasWidth, canvasHeight);
            phrase = `${naturalSize} ${firstShape.color} colored ${firstShape.label} located ${firstShape.naturalPosition} of the scene`;
            if (firstShape.zIndexDescription) {
                phrase += `, ${firstShape.zIndexDescription}`;
            }
        } else {
            // Multiple instances, generate collective phrase
            const count = shapesInGroup.length;
            const commonSize = getNaturalSizeDescription(firstShape.size.width, firstShape.size.height, canvasWidth, canvasHeight); // Assuming similar sizes
            const commonColor = firstShape.color;
            const commonLabel = firstShape.label; // Use label for collective description

            // Pluralize the label (simple 's' rule, can be improved for irregular plurals)
            const pluralLabel = commonLabel.endsWith('s') ? commonLabel : `${commonLabel}s`;

            // Determine quantity phrase
            let quantityPhrase;
            if (count === 2) quantityPhrase = 'two';
            else if (count <= 5) quantityPhrase = 'a few';
            else if (count <= 10) quantityPhrase = 'several';
            else quantityPhrase = 'multiple';

            // Determine collective position
            const uniquePositions = new Set(shapesInGroup.map(s => s.naturalPosition));
            let collectivePosition;
            if (uniquePositions.size === 1) {
                collectivePosition = `located ${uniquePositions.values().next().value} of the scene`;
            } else {
                collectivePosition = `scattered across various positions of the scene`;
            }

            // Determine collective z-index
            const uniqueZIndexes = new Set(shapesInGroup.map(s => s.zIndexDescription).filter(Boolean));
            let collectiveZIndex = '';
            if (uniqueZIndexes.size === 1 && uniqueZIndexes.values().next().value) {
                collectiveZIndex = `, ${uniqueZIndexes.values().next().value}`;
            } else if (uniqueZIndexes.size > 1) {
                collectiveZIndex = `, at various depths`; // More general if mixed
            }

            // Construct collective phrase
            phrase = `${quantityPhrase} ${commonSize} ${commonColor} colored ${pluralLabel} ${collectivePosition}${collectiveZIndex}`;
        }
        shapePhrases.push(phrase);
    }

    // Add shape phrases to the prompt in a more natural way
    if (shapePhrases.length > 0) {
        // Join phrases with commas and "and" for the last one
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

function getNaturalSizeDescription(width, height, canvasWidth, canvasHeight) {
    const shapeArea = width * height;
    const canvasArea = canvasWidth * canvasHeight;
    const areaRatio = shapeArea / canvasArea;

    if (areaRatio < 0.005) { // 0.5% of canvas area
        return "a tiny";
    } else if (areaRatio < 0.02) { // 2%
        return "a small";
    } else if (areaRatio < 0.08) { // 8%
        return "a medium-sized";
    } else if (areaRatio < 0.25) { // 25%
        return "a large";
    } else {
        return "a very large";
    }
}

function handleZIndexChange(action) {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        action(selectedGroup);
        updateAllButtonStates();
    }
}

function handleDeleteShape() {
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    
    if (activeTextEditorForeignObject && selectedGroup && activeTextEditorForeignObject.parentNode === selectedGroup) {
        // If text editor is active within the selected shape group, clear text
            const textElement = selectedGroup._labelText; // Assuming _labelText is stored on the group
            if (textElement) {
                SvgManager.updateShapeText(selectedGroup, '\u00A0'); // Set text to a non-breaking space to keep it clickable
            }
        activeTextEditorForeignObject.remove(); // Remove the foreignObject
        activeTextEditorForeignObject = null; // Clear the global variable
        console.log("Text cleared for selected shape.");
    } else if (selectedGroup) {
        // Otherwise, delete the entire shape
        const success = SvgManager.deleteSelectedShape();
        if (success) {
            console.log("Shape deleted.");
        }
    }
    updateAllButtonStates();
}

function handleColorChange(e) {
    const newColor = e.target.value;
    const selectedGroup = SvgManager.getSelectedShapeGroup();
    if (selectedGroup) {
        SvgManager.updateShapeColor(selectedGroup, newColor);
        handleExportPrompt(); // Re-generate prompt with new color
    }
}

function handleResetCanvas() {
    if (confirm("Are you sure you want to clear the canvas? All shapes will be deleted.")) {
        SvgManager.clearCanvas();
        updateAllButtonStates();
        promptDisplay.value = ''; // Also clear the generated prompt
    }
}

export function updateAllButtonStates() {
    const selected = SvgManager.getSelectedShapeGroup();
    const isFreeformSelected = selected && selected.getAttribute('data-shape-type') === 'freeform';
    
    // Delete button
    deleteShapeBtn.disabled = !selected;
    console.log('updateAllButtonStates: selected =', selected, 'deleteShapeBtn.disabled =', deleteShapeBtn.disabled);

    // Color picker
    colorSelect.disabled = !selected;
    if (selected) {
        colorSelect.value = selected.getAttribute('data-color');
    }

    // Control visibility of freeformToolsDrawer
    if (freeformToolsDrawer) {
        if (shapeTypeDropdownValue === 'freeform' || isFreeformSelected) {
            freeformToolsDrawer.style.display = 'block';
        } else {
            freeformToolsDrawer.style.display = 'none';
        }
    }


    // Z-index buttons
    const isSelected = !!selected;
    bringToFrontBtn.disabled = !isSelected || !selected.nextSibling;
    sendToBackBtn.disabled = !isSelected || !selected.previousSibling;
    bringForwardBtn.disabled = !isSelected || !selected.nextSibling;
    sendBackwardBtn.disabled = !isSelected || !selected.previousSibling;

    // Ensure the main shape group has a pointer-events setting that allows events to be captured.
    if (selected) {
        selected.style.pointerEvents = 'all';
    }

    // Update Toggle Edit Mode button text
    const toggleEditModeBtn = document.getElementById('toggle-edit-mode-btn');
    if (toggleEditModeBtn) {
        if (shapeTypeDropdownValue === 'freeform') {
            toggleEditModeBtn.disabled = false;
            toggleEditModeBtn.textContent = isDrawingFreeform ? "Stop Drawing" : "Edit Points";
        } else {
            toggleEditModeBtn.disabled = true;
            toggleEditModeBtn.textContent = "Toggle Edit Mode"; // Default text when not in freeform
        }
    }

    // Disable Add Point button if not in drawing mode or not freeform selected
    const addPointBtn = document.getElementById('add-point-btn');
    if (addPointBtn) {
        addPointBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && isDrawingFreeform);
    }
    
    // Disable Close Path button unless a freeform path is active and has enough points
    const closePathBtn = document.getElementById('close-path-btn');
    if (closePathBtn) {
        closePathBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && currentFreeformGroup && currentFreeformPathData.length > 1);
    }

    // Disable Delete Point and Convert to Bezier unless in editing mode and a freeform shape is selected
    const deletePointBtn = document.getElementById('delete-point-btn');
    const convertToBezierBtn = document.getElementById('convert-to-bezier-btn');
    if (deletePointBtn) {
        // Enable delete point only if freeform is selected, not drawing, and a specific point is selected
        deletePointBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && !isDrawingFreeform && selected && selectedFreeformPointIndex !== -1);
    }
    if (convertToBezierBtn) {
        convertToBezierBtn.disabled = !(shapeTypeDropdownValue === 'freeform' && !isDrawingFreeform && selected);
    }
}

// Pour l'édition du texte au double-clic
document.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('shape-label')) {
        e.stopPropagation();
        const textElement = e.target;
        const group = textElement.parentNode; // Le groupe est le parent du texte

        const currentLabel = textElement.textContent;
        const foreignObject = document.createElementNS(SvgManager.SVG_NS, 'foreignObject');
        const input = document.createElement('input');

        const textBBox = textElement.getBBox();
        
        // Positionner le foreignObject par rapport à la bbox du texte DANS le système de coordonnées du groupe
        foreignObject.setAttribute('x', textBBox.x);
        foreignObject.setAttribute('y', textBBox.y);
        foreignObject.setAttribute('width', textBBox.width + 20); // Un peu de marge
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
            activeTextEditorForeignObject = null; // Clear the global variable
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        input.addEventListener('keydown', (e) => {
            // Stop propagation for Delete and Backspace keys when input is active
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
            }
        });

        activeTextEditorForeignObject = foreignObject; // Set the global variable
    } else if (e.target.closest('.shape-group[data-shape-type="freeform"]')) {
        e.stopPropagation(); // Prevent other dblclick handlers
        const freeformGroup = e.target.closest('.shape-group[data-shape-type="freeform"]');
        
        // Set dropdown value to freeform
        const shapeTypeDropdown = document.getElementById('shape-type-dropdown');
        const freeformOption = shapeTypeDropdown.querySelector('.dropdown-option[data-value="freeform"]');
        if (freeformOption) {
            // Manually trigger the click to update the dropdown's state and trigger its callback
            freeformOption.click(); 
        }

        isDrawingFreeform = false; // Enter edit mode, not drawing mode
        currentFreeformGroup = freeformGroup;
        currentFreeformPathElement = freeformGroup._shapeBody;

        // Populate currentFreeformPathData from the selected shape's path data
        // Assuming SvgManager has a function to get path data from an SVGPathElement
        currentFreeformPathData = SvgManager.getFreeformPathData(currentFreeformPathElement);

        SvgManager.setSelectedShapeGroup(currentFreeformGroup); // Select the shape to show points
        DragAndResize.enableDragAndResize(currentFreeformGroup); // Ensure it's resizable
        freeformToolsDrawer.style.display = 'block'; // Show the freeform tools
        updateAllButtonStates();
        console.log("Freeform shape double-clicked. Entering edit mode.");
    }
});

function handleExportPng() {
    const svgCanvas = SvgManager.getSvgCanvas();
    const selectedShape = SvgManager.getSelectedShapeGroup();

    // Store original display states and remove handles
    const handlesToRestore = [];
    const allShapeGroups = svgCanvas.querySelectorAll('.shape-group');
    allShapeGroups.forEach(group => {
        const handles = group._handles;
        if (handles && handles.length > 0) {
            handles.forEach(handle => {
                // Check if the handle is actually a child of the group before removing
                if (handle.parentNode === group) {
                    group.removeChild(handle);
                    handlesToRestore.push({ group: group, handle: handle });
                }
            });
        }
    });

    // Temporarily remove 'selected' class from all shape groups to hide selection outline
    allShapeGroups.forEach(group => {
        group.classList.remove('selected');
    });

    const svgString = new XMLSerializer().serializeToString(svgCanvas);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const DOMURL = self.URL || self.webkitURL || self;
    const url = DOMURL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = svgCanvas.clientWidth;
        canvas.height = svgCanvas.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = 'shap_prompteur_design.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Restore handles
        handlesToRestore.forEach(item => {
            item.group.appendChild(item.handle);
        });

        // Re-add 'selected' class to the previously selected shape
        if (selectedShape) {
            selectedShape.classList.add('selected');
        }
    };
    img.src = url;
}

function handleSaveSvg() {
    const svgCanvas = SvgManager.getSvgCanvas();
    const selectedShape = SvgManager.getSelectedShapeGroup();

    // Store original display states and remove handles
    const handlesToRestore = [];
    const allShapeGroups = svgCanvas.querySelectorAll('.shape-group');
    allShapeGroups.forEach(group => {
        const handles = group._handles;
        if (handles && handles.length > 0) {
            handles.forEach(handle => {
                // Check if the handle is actually a child of the group before removing
                if (handle.parentNode === group) {
                    group.removeChild(handle);
                    handlesToRestore.push({ group: group, handle: handle });
                }
            });
        }
    });

    // Temporarily remove 'selected' class from all shape groups to hide selection outline
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

    // Restore handles
    handlesToRestore.forEach(item => {
        item.group.appendChild(item.handle);
    });

    // Re-add 'selected' class to the previously selected shape
    if (selectedShape) {
        selectedShape.classList.add('selected');
    }
}
