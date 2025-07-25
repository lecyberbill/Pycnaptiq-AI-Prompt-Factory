// js/dragAndResize.js

import * as SvgManager from './svgManager.js';
import { updateAllButtonStates } from './eventHandlers.js';

let isDragging = false;
let isResizing = false;
let dragOffset = { x: 0, y: 0 };
let resizeStartMouse = { x: 0, y: 0 };
let resizeHandle = null;

let currentGroup = null;
let initialGroupTranslate = { x: 0, y: 0 }; // Initial translation of the group
let initialGroupScale = { x: 1, y: 1 }; // Initial scale of the group

export function enableDragAndResize(group) {
    group.addEventListener('mousedown', startDragOrResize);
}

function startDragOrResize(e) {
    e.stopPropagation();

    // Ensure currentGroup is the actual shape-group, even if a child (like shape-body or label) is clicked
    currentGroup = e.target.closest('.shape-group');
    if (!currentGroup) return; // Should not happen if event listener is on the group

    SvgManager.setSelectedShapeGroup(currentGroup); // Marque le groupe comme sélectionné
    updateAllButtonStates(); // Update button states immediately after selection

    const svgCanvas = SvgManager.getSvgCanvas();
    const svgRect = svgCanvas.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Récupère la transformation de translation et de scale existante du groupe
    // ou crée-les si elles n'existent pas.
    let translateTransform = getOrCreateTransform(currentGroup, SVGTransform.SVG_TRANSFORM_TRANSLATE, 0);
    let scaleTransform = getOrCreateTransform(currentGroup, SVGTransform.SVG_TRANSFORM_SCALE, 1);

    initialGroupTranslate.x = translateTransform.matrix.e;
    initialGroupTranslate.y = translateTransform.matrix.f;
    initialGroupScale.x = scaleTransform.matrix.a;
    initialGroupScale.y = scaleTransform.matrix.d;

    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        isDragging = false;
        resizeHandle = e.target;
        resizeStartMouse = { x: mouseX, y: mouseY };

    } else if (e.target.classList.contains('shape-body') || e.target.classList.contains('shape-label')) {
        isDragging = true;
        isResizing = false;
        
        // dragOffset est la différence entre la position de la souris et la position actuelle du groupe
        dragOffset = {
            x: mouseX - initialGroupTranslate.x,
            y: mouseY - initialGroupTranslate.y
        };
    }
}

export function doDragOrResize(e) {
    if (!currentGroup) return;

    const svgCanvas = SvgManager.getSvgCanvas();
    const svgRect = svgCanvas.getBoundingClientRect();
    const canvasX = e.clientX - svgRect.left;
    const canvasY = e.clientY - svgRect.top;

    let translateTransform = getOrCreateTransform(currentGroup, SVGTransform.SVG_TRANSFORM_TRANSLATE, 0);
    let scaleTransform = getOrCreateTransform(currentGroup, SVGTransform.SVG_TRANSFORM_SCALE, 1);

    if (isDragging) {
        translateTransform.setTranslate(canvasX - dragOffset.x, canvasY - dragOffset.y);
    } else if (isResizing && resizeHandle) {
        const dx = canvasX - resizeStartMouse.x;
        const dy = canvasY - resizeStartMouse.y;

        const shapeBody = currentGroup._shapeBody;
        const shapeBBox = shapeBody.getBBox();
        if (shapeBBox.width === 0 || shapeBBox.height === 0) return;

        let newScaleX = initialGroupScale.x;
        let newScaleY = initialGroupScale.y;
        const handle = parseInt(resizeHandle.getAttribute('data-handle'));
        // const shapeType = currentGroup.getAttribute('data-shape-type'); // Not needed for non-proportional resize

        // Calculate new scale based on mouse movement for X-axis
        switch (handle) {
            case 0: // Top-Left
            case 3: // Bottom-Left
                newScaleX = initialGroupScale.x - dx / shapeBBox.width;
                break;
            case 1: // Top-Right
            case 2: // Bottom-Right
            default:
                newScaleX = initialGroupScale.x + dx / shapeBBox.width;
                break;
        }

        // Calculate new scale based on mouse movement for Y-axis
        switch (handle) {
            case 0: // Top-Left
            case 1: // Top-Right
                newScaleY = initialGroupScale.y - dy / shapeBBox.height;
                break;
            case 2: // Bottom-Right
            case 3: // Bottom-Left
            default:
                newScaleY = initialGroupScale.y + dy / shapeBBox.height;
                break;
        }

        // Prevent shape from becoming too small
        const minWidth = 10;
        const minHeight = 10;
        if (newScaleX * shapeBBox.width < minWidth) {
            newScaleX = minWidth / shapeBBox.width;
        }
        if (newScaleY * shapeBBox.height < minHeight) {
            newScaleY = minHeight / shapeBBox.height;
        }

        const dScaleX = newScaleX - initialGroupScale.x;
        const dScaleY = newScaleY - initialGroupScale.y;

        let newTranslateX, newTranslateY;
        const shapeX = shapeBBox.x;
        const shapeY = shapeBBox.y;
        const shapeW = shapeBBox.width;
        const shapeH = shapeBBox.height;

        // Adjust translation to keep the resize anchor point fixed
        switch (handle) {
            case 0: // Top-Left -> anchor is Bottom-Right
                newTranslateX = initialGroupTranslate.x - dScaleX * (shapeX + shapeW);
                newTranslateY = initialGroupTranslate.y - dScaleY * (shapeY + shapeH);
                break;
            case 1: // Top-Right -> anchor is Bottom-Left
                newTranslateX = initialGroupTranslate.x - dScaleX * shapeX;
                newTranslateY = initialGroupTranslate.y - dScaleY * (shapeY + shapeH);
                break;
            case 2: // Bottom-Right -> anchor is Top-Left
                newTranslateX = initialGroupTranslate.x - dScaleX * shapeX;
                newTranslateY = initialGroupTranslate.y - dScaleY * shapeY;
                break;
            case 3: // Bottom-Left -> anchor is Top-Right
                newTranslateX = initialGroupTranslate.x - dScaleX * (shapeX + shapeW);
                newTranslateY = initialGroupTranslate.y - dScaleY * shapeY;
                break;
        }

        scaleTransform.setScale(newScaleX, newScaleY);
        translateTransform.setTranslate(newTranslateX, newTranslateY);
    }
    SvgManager.updateShapeAppearance(currentGroup);
}

export function endDragOrResize() {
    isDragging = false;
    isResizing = false;
    currentGroup = null;
    resizeHandle = null;
    // The shape should remain selected after drag/resize.
    // Deselection is handled by clicking on the canvas background.
}


// Helper function to get or create a specific transform type
function getOrCreateTransform(group, type, index) {
    let transformList = group.transform.baseVal;
    let foundTransform = null;

    // Try to find an existing transform of the specified type
    for (let i = 0; i < transformList.numberOfItems; i++) {
        if (transformList.getItem(i).type === type) {
            foundTransform = transformList.getItem(i);
            // Move it to the desired index if it's not already there
            if (i !== index) {
                transformList.removeItem(i);
                transformList.insertItemBefore(foundTransform, index);
            }
            return foundTransform;
        }
    }

    // If not found, create a new one and insert it at the specified index
    const svgCanvas = SvgManager.getSvgCanvas();
    let newTransform = svgCanvas.createSVGTransform();
    if (type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
        newTransform.setTranslate(0, 0);
    } else if (type === SVGTransform.SVG_TRANSFORM_SCALE) {
        newTransform.setScale(1, 1);
    }
    transformList.insertItemBefore(newTransform, index);
    return newTransform;
}
