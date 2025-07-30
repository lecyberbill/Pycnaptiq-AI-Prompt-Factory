// js/svgManager.js

export const SVG_NS = "http://www.w3.org/2000/svg";
import * as DragAndResize from './dragAndResize.js'; // Import DragAndResize
import { setIdCardIconClickListener } from './eventHandlers.js'; // Import the new function

let svgCanvas;
let selectedShapeGroup = null; // Groupe SVG actuellement sélectionné
let currentGradient = null; // Variable interne pour suivre l'état du fond

export function initSvgManager(canvasId) {
    svgCanvas = document.getElementById(canvasId);
}

/**
 * Serializes the current state of the SVG canvas into a data array.
 * Each shape's properties, including position, size, color, and type,
 * are extracted and stored in a plain JavaScript object.
 * For freeform shapes, path data is also included.
 * @returns {Array<object>} An array of data objects, each representing a shape.
 */
export function getCanvasStateAsData() {
    // The state now includes shapes and background
    const currentState = {
        shapes: [],
        background: {
            gradient: currentGradient
        }
    };
    const shapeGroups = svgCanvas.querySelectorAll('.shape-group');

    shapeGroups.forEach(group => {
        const shapeType = group.getAttribute('data-shape-type');
        const color = group.getAttribute('data-color');
        const label = group.getAttribute('data-label');
        const strokeColor = group.getAttribute('data-stroke-color');
        const strokeWidth = group.getAttribute('data-stroke-width');
        const id = group.getAttribute('id');
        const noColor = group.getAttribute('data-no-color') === 'true'; // Retrieve noColor state
        const promptPrefix = group.getAttribute('data-prompt-prefix') || ''; // Retrieve prompt prefix
        const promptSuffix = group.getAttribute('data-prompt-suffix') || ''; // Retrieve prompt suffix

        let shapeData = {
            id: id,
            type: shapeType,
            color: color,
            label: label,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            noColor: noColor, // Include noColor in serialized data
            promptPrefix: promptPrefix, // Include promptPrefix in serialized data
            promptSuffix: promptSuffix // Include promptSuffix in serialized data
        };

        // Get current transform values from the group
        let currentX = 0;
        let currentY = 0;
        let currentScaleX = 1;
        let currentScaleY = 1;

        const transformList = group.transform.baseVal;
        for (let i = 0; i < transformList.numberOfItems; i++) {
            const transform = transformList.getItem(i);
            if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                currentX = transform.matrix.e;
                currentY = transform.matrix.f;
            } else if (transform.type === SVGTransform.SVG_TRANSFORM_SCALE) {
                currentScaleX = transform.matrix.a;
                currentScaleY = transform.matrix.d;
            }
        }

        shapeData.transform = { 
            translateX: currentX, 
            translateY: currentY, 
            scaleX: currentScaleX, 
            scaleY: currentScaleY 
        };

        if (shapeType === 'freeform') {
            shapeData.pathData = group._pathData;
        } else {
            const shapeBody = group.querySelector('.shape-body');
            let initialWidth, initialHeight;

            if (shapeType === 'rect') {
                initialWidth = parseFloat(shapeBody.getAttribute('width'));
                initialHeight = parseFloat(shapeBody.getAttribute('height'));
            } else if (shapeType === 'circle') {
                const r = parseFloat(shapeBody.getAttribute('r'));
                initialWidth = r * 2;
                initialHeight = r * 2;
            } else if (shapeType === 'polygon') {
                const bbox = shapeBody.getBBox();
                initialWidth = bbox.width;
                initialHeight = bbox.height;
                shapeData.points = shapeBody.getAttribute('points');
            }
            shapeData.width = initialWidth;
            shapeData.height = initialHeight;
        }
        currentState.shapes.push(shapeData);
    });
    return currentState;
}

/**
 * Restores a given state to the SVG canvas by re-creating shapes from data.
 * @param {object} state - A state object containing shapes and background info.
 */
export function restoreCanvasState(state) {
    // 1. Clear the canvas, but preserve the pose container
    const children = Array.from(svgCanvas.childNodes);
    children.forEach(child => {
        if (child.id !== 'pose-container') {
            svgCanvas.removeChild(child);
        }
    });
    selectedShapeGroup = null;

    // 2. Restore the background from the state object
    if (state.background && state.background.gradient) {
        // This will set the internal variable AND draw the background
        setCanvasBackgroundGradient(state.background.gradient);
    } else {
        // Explicitly clear the internal variable if the state has no background
        currentGradient = null;
    }

    // 3. Recreate shapes from the state data
    state.shapes.forEach(shapeData => {
        let newGroup;
        const { transform } = shapeData;

        if (shapeData.type === 'freeform') {
            newGroup = createFreeformPath(
                shapeData.pathData,
                shapeData.color,
                shapeData.label,
                shapeData.strokeColor,
                shapeData.strokeWidth,
                shapeData.id,
                shapeData.noColor, // Pass noColor state
                shapeData.promptPrefix, // Pass promptPrefix state
                shapeData.promptSuffix // Pass promptSuffix state
            );
        } else {
            newGroup = createShapeGroup(
                shapeData.type,
                shapeData.color,
                shapeData.label,
                transform.translateX, // Use translateX for initial position
                transform.translateY, // Use translateY for initial position
                shapeData.width,
                shapeData.height,
                shapeData.strokeColor,
                shapeData.strokeWidth,
                shapeData.id,
                shapeData.noColor, // Pass noColor state
                shapeData.promptPrefix, // Pass promptPrefix state
                shapeData.promptSuffix // Pass promptSuffix state
            );
            if (newGroup && shapeData.type === 'polygon' && shapeData.points) {
                newGroup.querySelector('.shape-body').setAttribute('points', shapeData.points);
            }
        }
        
        // After creation, apply the scale part of the transform.
        // The translate part is already set during creation.
        if (newGroup && transform) {
            newGroup.setAttribute('transform', `translate(${transform.translateX},${transform.translateY}) scale(${transform.scaleX},${transform.scaleY})`);
        }
        if (newGroup) {
            // Re-enable drag and resize for the newly created group
            DragAndResize.enableDragAndResize(newGroup);
            // Force update appearance for proper handle/text positioning after initial creation and potential transform application
            updateShapeAppearance(newGroup);
        }
    });

    // No need to call updateShapeAppearance for all shapes here, as it's called within createShapeGroup/createFreeformPath
    // and explicitly after applying transform in this function.
}

export function createShapeGroup(shapeType, color, label, initialX, initialY, initialWidth, initialHeight, strokeColor = '#000000', strokeWidth = 2, existingId = null, noColor = false, promptPrefix = '', promptSuffix = '') {
    let element;
    let text;

    // Use existing ID or generate a new one
    const groupId = existingId || `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    switch (shapeType) {
        case 'rect':
            element = document.createElementNS(SVG_NS, 'rect');
            element.setAttribute('x', 0); // Position relative to group's origin
            element.setAttribute('y', 0); // Position relative to group's origin
            element.setAttribute('width', initialWidth);
            element.setAttribute('height', initialHeight);
            break;
        case 'circle':
            element = document.createElementNS(SVG_NS, 'circle');
            const radius = Math.min(initialWidth, initialHeight) / 2; // Use smaller dimension for radius
            element.setAttribute('cx', radius); // Position relative to group's origin
            element.setAttribute('cy', radius); // Position relative to group's origin
            element.setAttribute('r', radius);
            break;
        case 'polygon': // Equilateral triangle
            element = document.createElementNS(SVG_NS, 'polygon');
            const side = Math.min(initialWidth, initialHeight); // Use smaller dimension as side length
            const h = (Math.sqrt(3) / 2) * side; // Height of equilateral triangle
            // Points are now relative to (0,0) of the group
            const points = [
                `0,${h}`,
                `${side / 2},0`,
                `${side},${h}`
            ].join(' ');
            element.setAttribute('points', points);
            break;
        default:
            return null;
    }

    // For other shapes, continue with existing logic
    element.setAttribute('fill', color);
    element.setAttribute('stroke', strokeColor); // Set stroke color
    element.setAttribute('stroke-width', strokeWidth); // Set stroke width
    element.setAttribute('class', 'shape-body');

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('id', groupId); // Set the unique ID
    group.setAttribute('data-label', label);
    group.setAttribute('data-shape-type', shapeType);
    group.setAttribute('data-color', color);
    group.setAttribute('data-stroke-color', strokeColor); // Store stroke color
    group.setAttribute('data-stroke-width', strokeWidth); // Store stroke width
    group.setAttribute('data-emotion', ''); // Initialize emotion data attribute
    group.setAttribute('data-action', ''); // Initialize action data attribute
    group.setAttribute('data-eye-color', ''); // Initialize eye color data attribute
    group.setAttribute('data-clothing', ''); // Initialize clothing data attribute
    group.setAttribute('data-hair-style', ''); // Initialize hair style data attribute
    group.setAttribute('data-hair-color', ''); // Initialize hair color data attribute
    group.setAttribute('data-no-color', noColor.toString()); // Store noColor state
    group.setAttribute('data-prompt-prefix', promptPrefix); // Store promptPrefix
    group.setAttribute('data-prompt-suffix', promptSuffix); // Store promptSuffix
    group.setAttribute('class', 'shape-group');
    // Apply initial position as a translate transform to the group
    group.setAttribute('transform', `translate(${initialX},${initialY})`);

    text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('fill', 'black');
    text.setAttribute('font-size', '12');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('alignment-baseline', 'middle');
    text.textContent = label;
    text.classList.add('shape-label');

    group.appendChild(element);
    group.appendChild(text);

    // Ajouter des poignées de redimensionnement au groupe
    const handles = [];
    for (let i = 0; i < 4; i++) {
        const handle = document.createElementNS(SVG_NS, 'rect');
        handle.setAttribute('width', 8);
        handle.setAttribute('height', 8);
        handle.setAttribute('rx', 4); // For rounded corners to make it circular
        handle.setAttribute('ry', 4); // For rounded corners to make it circular
        handle.setAttribute('fill', 'blue');
        handle.setAttribute('stroke', 'white');
        handle.setAttribute('stroke-width', 1);
        handle.setAttribute('class', 'resize-handle');
        handle.setAttribute('data-handle', i); // 0: TL, 1: TR, 2: BR, 3: BL
        group.appendChild(handle);
        handles.push(handle);
    }
    group._handles = handles; // Stocke les poignées pour un accès facile
    group._shapeBody = element; // Stocke la forme pour un accès facile
    group._labelText = text; // Stocke le texte pour un accès facile

    // Add the yellow "ID card" icon
    const idCardIcon = document.createElementNS(SVG_NS, 'rect');
    idCardIcon.setAttribute('width', 16);
    idCardIcon.setAttribute('height', 16);
    idCardIcon.setAttribute('fill', 'yellow');
    idCardIcon.setAttribute('class', 'id-card-icon');
    idCardIcon.setAttribute('visibility', 'hidden'); // Hidden by default
    group.appendChild(idCardIcon);
    group._idCardIcon = idCardIcon; // Store reference
    setIdCardIconClickListener(idCardIcon, group); // Attach click listener

    svgCanvas.appendChild(group);
    updateShapeAppearance(group); // Met à jour la position des poignées et du texte

    return group;
}

export function createFreeformPath(pathData, color, label, strokeColor = '#000000', strokeWidth = 2, existingId = null, noColor = false, promptPrefix = '', promptSuffix = '') {
    // Use existing ID or generate a new one
    const groupId = existingId || `freeform-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('id', groupId); // Set the unique ID
    group.setAttribute('data-label', label);
    group.setAttribute('data-shape-type', 'freeform');
    group.setAttribute('data-color', color);
    group.setAttribute('data-stroke-color', strokeColor); // Store stroke color
    group.setAttribute('data-stroke-width', strokeWidth); // Store stroke width
    group.setAttribute('data-emotion', ''); // Initialize emotion data attribute
    group.setAttribute('data-action', ''); // Initialize action data attribute
    group.setAttribute('data-eye-color', ''); // Initialize eye color data attribute
    group.setAttribute('data-clothing', ''); // Initialize clothing data attribute
    group.setAttribute('data-hair-style', ''); // Initialize hair style data attribute
    group.setAttribute('data-hair-color', ''); // Initialize hair color data attribute
    group.setAttribute('data-no-color', noColor.toString()); // Store noColor state
    group.setAttribute('data-prompt-prefix', promptPrefix); // Store promptPrefix
    group.setAttribute('data-prompt-suffix', promptSuffix); // Store promptSuffix
    group.setAttribute('class', 'shape-group');

    const pathElement = document.createElementNS(SVG_NS, 'path');
    pathElement.setAttribute('fill', 'none'); // Freeform paths are typically not filled by default
    pathElement.setAttribute('stroke', color);
    pathElement.setAttribute('stroke-width', 2);
    pathElement.setAttribute('class', 'shape-body');
    pathElement.setAttribute('d', pathToD(pathData)); // Convert path data array to 'd' attribute string

    const textElement = document.createElementNS(SVG_NS, 'text');
    textElement.setAttribute('fill', 'black');
    textElement.setAttribute('font-size', '12');
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('alignment-baseline', 'middle');
    textElement.textContent = label;
    textElement.classList.add('shape-label');

    group.appendChild(pathElement);
    group.appendChild(textElement);

    group._shapeBody = pathElement;
    group._labelText = textElement;
    group._pathData = pathData; // Store path data directly on the group

    // Freeform paths won't have resize handles initially, their handles are control points
    group._handles = []; // Initialize empty handles array

    // Add the yellow "ID card" icon
    const idCardIcon = document.createElementNS(SVG_NS, 'rect');
    idCardIcon.setAttribute('width', 16);
    idCardIcon.setAttribute('height', 16);
    idCardIcon.setAttribute('fill', 'yellow');
    idCardIcon.setAttribute('class', 'id-card-icon');
    idCardIcon.setAttribute('visibility', 'hidden'); // Hidden by default
    group.appendChild(idCardIcon);
    group._idCardIcon = idCardIcon; // Store reference
    setIdCardIconClickListener(idCardIcon, group); // Attach click listener

    svgCanvas.appendChild(group);
    updateShapeAppearance(group); // Update text position

    return group;
}

export function updateFreeformPath(pathElement, pathData) {
    pathElement.setAttribute('d', pathToD(pathData));
    // Update the stored path data on the group
    if (pathElement.parentNode && pathElement.parentNode._pathData) {
        pathElement.parentNode._pathData = pathData;
    }
    // No need to call updateShapeAppearance here, it's for resize handles and text positioning relative to a bbox.
    // For freeform, point visuals will be managed separately.
}

export function addFreeformPointVisual(group, point, index) {
    const pointVisual = document.createElementNS(SVG_NS, 'circle');
    pointVisual.setAttribute('cx', point.x);
    pointVisual.setAttribute('cy', point.y);
    pointVisual.setAttribute('r', 6); // Radius for visibility
    
    // Assign a distinct color based on index for debugging
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'black', 'magenta', 'cyan'];
    pointVisual.setAttribute('fill', colors[index % colors.length]); 
    
    pointVisual.setAttribute('stroke', 'white');
    pointVisual.setAttribute('stroke-width', 1);
    pointVisual.setAttribute('class', 'freeform-point-visual'); // Add a class for styling/selection
    pointVisual.setAttribute('data-point-index', index); // Store index for editing
    group.appendChild(pointVisual);
    return pointVisual; // Return the created point visual
}

function addBezierHandle(group, x, y, pointIndex, handleType) {
    const handle = document.createElementNS(SVG_NS, 'circle');
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    handle.setAttribute('r', 4);
    handle.setAttribute('fill', 'yellow');
    handle.setAttribute('stroke', 'black');
    handle.setAttribute('stroke-width', 1);
    handle.setAttribute('class', 'bezier-handle');
    handle.setAttribute('data-point-index', pointIndex);
    handle.setAttribute('data-handle-type', handleType); // 'c1' or 'c2'
    group.appendChild(handle);
    return handle;
}

function addTangentLine(group, x1, y1, x2, y2) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'grey');
    line.setAttribute('stroke-dasharray', '2,2');
    line.setAttribute('class', 'tangent-line');
    group.appendChild(line);
    return line;
}

// Helper to convert path data array to SVG 'd' attribute string
function pathToD(pathData) {
    if (!pathData) return '';
    return pathData.map(p => {
        switch (p.cmd) {
            case 'M':
            case 'L':
                return `${p.cmd}${p.x},${p.y}`;
            case 'C':
                return `C${p.x1},${p.y1} ${p.x2},${p.y2} ${p.x},${p.y}`;
            case 'Z':
                return 'Z';
            default:
                return '';
        }
    }).join(' ');
}

export function convertToCubicBezier(group, commandIndexToConvert) {
    if (!group || group.getAttribute('data-shape-type') !== 'freeform' || !group._pathData) {
        return;
    }

    let pathData = group._pathData;
    if (commandIndexToConvert <= 0 || commandIndexToConvert >= pathData.length) {
        // Cannot convert M or Z commands directly, or out of bounds.
        // The first point (M) is a starting point, not a segment to convert.
        // The Z command is a closing command, not a segment with control points.
        return;
    }

    const currentCommand = pathData[commandIndexToConvert];
    const previousCommand = pathData[commandIndexToConvert - 1];

    // Ensure the current command is a 'L' (line) command, as we only convert lines to curves.
    // If it's already a 'C' command, no need to convert.
    // If it's 'M' or 'Z', it should have been caught by the initial boundary check.
    if (currentCommand.cmd !== 'L') {
        return;
    }

    // Get the coordinates of the start point of the segment
    let p0_x, p0_y;
    if (previousCommand.cmd === 'M' || previousCommand.cmd === 'L' || previousCommand.cmd === 'C') {
        p0_x = previousCommand.x;
        p0_y = previousCommand.y;
    } else {
        // This case should ideally not be reached with valid path data
        console.warn("Unexpected previous command type:", previousCommand.cmd);
        return;
    }

    // The end point of the segment is defined by the current 'L' command's coordinates
    const p1_x = currentCommand.x;
    const p1_y = currentCommand.y;

    // Calculate control points for a smooth curve
    const cp1x = p0_x + (p1_x - p0_x) / 3;
    const cp1y = p0_y + (p1_y - p0_y) / 3;
    const cp2x = p0_x + 2 * (p1_x - p0_x) / 3;
    const cp2y = p0_y + 2 * (p1_y - p0_y) / 3;

    // Create the new cubic Bezier command
    const newBezierCommand = {
        cmd: 'C',
        x1: cp1x,
        y1: cp1y,
        x2: cp2x,
        y2: cp2y,
        x: p1_x,
        y: p1_y
    };

    // Replace the 'L' command with the new 'C' command in the path data array
    pathData[commandIndexToConvert] = newBezierCommand;

    // Update the SVG path element and refresh the appearance (including handles)
    group._pathData = pathData;
    updateFreeformPath(group._shapeBody, pathData);
    updateShapeAppearance(group);
}

export function getFreeformPathData(pathElement) {
    const dAttribute = pathElement.getAttribute('d');
    if (!dAttribute) return [];

    const pathData = [];
    const commands = dAttribute.match(/[MLCZ][^MLCZ]*/gi);

    if (commands) {
        commands.forEach(cmdStr => {
            const cmd = cmdStr.charAt(0).toUpperCase();
            const coords = cmdStr.substring(1).trim().split(/[ ,]+/).map(parseFloat);

            if (cmd === 'M' || cmd === 'L') {
                if (coords.length === 2) {
                    pathData.push({ cmd: cmd, x: coords[0], y: coords[1] });
                }
            } else if (cmd === 'C') {
                if (coords.length === 6) {
                    pathData.push({ cmd: 'C', x1: coords[0], y1: coords[1], x2: coords[2], y2: coords[3], x: coords[4], y: coords[5] });
                }
            } else if (cmd === 'Z') {
                pathData.push({ cmd: 'Z' });
            }
        });
    }
    return pathData;
}


export function updateShapeAppearance(group) {
    if (!group) return;
    console.log("updateShapeAppearance called for group:", group.id); // Debug log

    const handles = group._handles;
    const text = group._labelText;
    const shapeBody = group._shapeBody;

    if (!shapeBody) { // DEBUG: Check if shapeBody is found
        console.warn("updateShapeAppearance: shapeBody not found for group", group.id);
        return;
    }

    // Get the untransformed bounding box of the shape's body
    const bbox = shapeBody.getBBox();
    if (!bbox) { // DEBUG: Check if bbox is valid
        console.warn("updateShapeAppearance: BBox not found for group", group.id);
        return;
    }

    // The handles and text are children of the group, so their positions are relative to the group's origin.
    // We can directly use the bbox coordinates for positioning.
    const handleOffset = 4; // Half of handle size (8/2)

    // Update handle positions
    if (handles && handles.length === 4) {
        // Top-left handle
        handles[0].setAttribute('x', bbox.x - handleOffset);
        handles[0].setAttribute('y', bbox.y - handleOffset);
        // Top-right handle
        handles[1].setAttribute('x', bbox.x + bbox.width - handleOffset);
        handles[1].setAttribute('y', bbox.y - handleOffset);
        // Bottom-right handle
        handles[2].setAttribute('x', bbox.x + bbox.width - handleOffset);
        handles[2].setAttribute('y', bbox.y + bbox.height - handleOffset);
        // Bottom-left handle
        handles[3].setAttribute('x', bbox.x - handleOffset);
        handles[3].setAttribute('y', bbox.y + bbox.height - handleOffset);
    }

    // Update text position
    if (text) {
        // Center the text within the shape's bounding box
        text.setAttribute('x', bbox.x + bbox.width / 2);
        text.setAttribute('y', bbox.y + bbox.height / 2);
        
        // Remove any existing transform on the text element itself, as its position is now relative to the group.
        // The group's transforms will handle the overall positioning.
        text.transform.baseVal.clear();
    }
    
    // Update ID card icon position and visibility
    const idCardIcon = group._idCardIcon;
    if (idCardIcon) {
        // Position it at the top-right of the bounding box
        idCardIcon.setAttribute('x', bbox.x + bbox.width - idCardIcon.getAttribute('width'));
        idCardIcon.setAttribute('y', bbox.y);
        
        // Make it visible only when the shape is selected
        idCardIcon.setAttribute('visibility', selectedShapeGroup === group ? 'visible' : 'hidden');
    }

    // Ensure the shape group itself can receive mouse events
    // For freeform shapes, pointer-events are managed differently (e.g., on points)
    if (group.getAttribute('data-shape-type') !== 'freeform') {
        group.style.pointerEvents = 'all';
    } else { // For freeform shapes
        group.style.pointerEvents = 'all'; // Allow dragging the entire freeform shape
        if (selectedShapeGroup === group) { // Only visualize points if this freeform shape is currently selected
            // For freeform shapes, visualize points when selected
            clearFreeformPointVisuals(); // Clear existing visuals first
            if (group._pathData) {
                console.log("Visualizing freeform points. Path data length:", group._pathData.length, "Data:", group._pathData); // DIAGNOSTIC LOG
                let lastPoint = null;
                group._pathData.forEach((point, index) => {
                    if (point.cmd === 'M' || point.cmd === 'L' || point.cmd === 'C') { // Visualize M, L and C commands
                        const pointVisual = addFreeformPointVisual(group, point, index); // Get the visual

                        if (point.cmd === 'C') {
                            const handle1 = addBezierHandle(group, point.x1, point.y1, index, 'c1');
                            const handle2 = addBezierHandle(group, point.x2, point.y2, index, 'c2');
                            if(lastPoint) {
                                addTangentLine(group, lastPoint.x, lastPoint.y, point.x1, point.y1);
                            }
                            addTangentLine(group, point.x, point.y, point.x2, point.y2);

                            [handle1, handle2].forEach(handle => {
                                handle.addEventListener('mousedown', (e) => {
                                    e.stopPropagation();
                                    const svgCanvas = getSvgCanvas();
                                    const svgRect = svgCanvas.getBoundingClientRect();
                                    const startX = e.clientX - svgRect.left;
                                    const startY = e.clientY - svgRect.top;

                                    const originalHandleX = parseFloat(handle.getAttribute('cx'));
                                    const originalHandleY = parseFloat(handle.getAttribute('cy'));
                                    const handleType = handle.getAttribute('data-handle-type');
                                    const pointIndex = parseInt(handle.getAttribute('data-point-index'));

                                    const doDrag = (moveEvent) => {
                                        const currentX = moveEvent.clientX - svgRect.left;
                                        const currentY = moveEvent.clientY - svgRect.top;
                                        const dx = currentX - startX;
                                        const dy = currentY - startY;

                                        const newX = originalHandleX + dx;
                                        const newY = originalHandleY + dy;

                                        handle.setAttribute('cx', newX);
                                        handle.setAttribute('cy', newY);

                                        const pathData = group._pathData;
                                        if (pathData && pathData[pointIndex]) {
                                            if (handleType === 'c1') {
                                                pathData[pointIndex].x1 = newX;
                                                pathData[pointIndex].y1 = newY;
                                            } else {
                                                pathData[pointIndex].x2 = newX;
                                                pathData[pointIndex].y2 = newY;
                                            }
                                            updateFreeformPath(group._shapeBody, pathData);
                                            updateShapeAppearance(group);
                                        }
                                    };

                                    const endDrag = () => {
                                        svgCanvas.removeEventListener('mousemove', doDrag);
                                        svgCanvas.removeEventListener('mouseup', endDrag);
                                        svgCanvas.removeEventListener('mouseleave', endDrag);
                                    };

                                    svgCanvas.addEventListener('mousemove', doDrag);
                                    svgCanvas.addEventListener('mouseup', endDrag);
                                    svgCanvas.addEventListener('mouseleave', endDrag);
                                });
                            });
                        }
                        
                        lastPoint = point;

                        // Make points draggable
                        pointVisual.addEventListener('mousedown', (e) => {
                            e.stopPropagation(); // Prevent canvas drag/deselect
                            const svgCanvas = getSvgCanvas();
                            const svgRect = svgCanvas.getBoundingClientRect();
                            const startX = e.clientX - svgRect.left;
                            const startY = e.clientY - svgRect.top;

                            const originalPointX = parseFloat(pointVisual.getAttribute('cx'));
                            const originalPointY = parseFloat(pointVisual.getAttribute('cy'));

                            const doDrag = (moveEvent) => {
                                const currentX = moveEvent.clientX - svgRect.left;
                                const currentY = moveEvent.clientY - svgRect.top;
                                const dx = currentX - startX;
                                const dy = currentY - startY;

                                const newX = originalPointX + dx;
                                const newY = originalPointY + dy;

                                pointVisual.setAttribute('cx', newX);
                                pointVisual.setAttribute('cy', newY);

                                // Update the actual path data
                                const pathData = group._pathData;
                                const pointIndex = parseInt(pointVisual.getAttribute('data-point-index'));
                                
                                if (pathData && pathData[pointIndex]) {
                                    const oldX = pathData[pointIndex].x;
                                    const oldY = pathData[pointIndex].y;
                                    const dx = newX - oldX;
                                    const dy = newY - oldY;

                                    pathData[pointIndex].x = newX;
                                    pathData[pointIndex].y = newY;

                                    // Update control points of adjacent Bezier curves
                                    // If the moved point is the start of a Bezier curve (C command)
                                    if (pathData[pointIndex + 1] && pathData[pointIndex + 1].cmd === 'C') {
                                        pathData[pointIndex + 1].x1 += dx;
                                        pathData[pointIndex + 1].y1 += dy;
                                    }
                                    // If the moved point is the end of a Bezier curve (C command)
                                    if (pathData[pointIndex].cmd === 'C') {
                                        pathData[pointIndex].x2 += dx;
                                        pathData[pointIndex].y2 += dy;
                                    }
                                    
                                    updateFreeformPath(group._shapeBody, pathData);
                                }
                            };

                            const endDrag = () => {
                                svgCanvas.removeEventListener('mousemove', doDrag);
                                svgCanvas.removeEventListener('mouseup', endDrag);
                                svgCanvas.removeEventListener('mouseleave', endDrag);
                                // After drag, re-select the point to ensure its state is correct
                                const customEvent = new CustomEvent('freeformPointClick', {
                                    detail: { pointVisual: pointVisual, pointIndex: index }
                                });
                                svgCanvas.dispatchEvent(customEvent);
                            };

                            svgCanvas.addEventListener('mousemove', doDrag);
                            svgCanvas.addEventListener('mouseup', endDrag);
                            svgCanvas.addEventListener('mouseleave', endDrag);
                        });

                        // Add double-click listener for selection
                        pointVisual.addEventListener('dblclick', (e) => {
                            e.stopPropagation();
                            const customEvent = new CustomEvent('freeformPointClick', {
                                detail: { pointVisual: pointVisual, pointIndex: index }
                            });
                            svgCanvas.dispatchEvent(customEvent);
                        });
                    }
                });
            }
        }
    }
}

export function clearFreeformPointVisuals() {
    if (selectedShapeGroup && selectedShapeGroup.getAttribute('data-shape-type') === 'freeform') {
        const visuals = selectedShapeGroup.querySelectorAll('.freeform-point-visual, .bezier-handle, .tangent-line');
        visuals.forEach(visual => visual.remove());
        // Dispatch an event to notify that freeform point visuals have been cleared
        svgCanvas.dispatchEvent(new CustomEvent('freeformPointsCleared'));
    }
}


export function setSelectedShapeGroup(group) {
    const objectIdCard = document.getElementById('object-id-card'); // Get reference to the floating panel

    if (selectedShapeGroup) {
        selectedShapeGroup.classList.remove('selected');
        // Hide the ID card icon when deselecting
        if (selectedShapeGroup._idCardIcon) {
            selectedShapeGroup._idCardIcon.setAttribute('visibility', 'hidden');
        }
        // Clear freeform point visuals if deselecting a freeform shape
        if (selectedShapeGroup.getAttribute('data-shape-type') === 'freeform') {
            clearFreeformPointVisuals();
        }
        // Hide the floating panel when deselecting any shape
        objectIdCard.style.display = 'none';
    }
    selectedShapeGroup = group;
    if (selectedShapeGroup) {
        selectedShapeGroup.classList.add('selected');
        // Show the ID card icon when selecting
        if (selectedShapeGroup._idCardIcon) {
            selectedShapeGroup._idCardIcon.setAttribute('visibility', 'visible');
            // Ensure its position is updated immediately upon selection
            updateShapeAppearance(selectedShapeGroup);
        }
    }
    return selectedShapeGroup;
}

export function getSelectedShapeGroup() {
    return selectedShapeGroup;
}

export function getShapeData(group) {
    if (!group) return null;

    const shapeBody = group._shapeBody;
    const bbox = shapeBody.getBBox();

    // Get current transform values
    const shapeType = group.getAttribute('data-shape-type');
    let initialWidth, initialHeight;

    // Get current transform values
    let translateX = 0;
    let translateY = 0;
    let scaleX = 1;
    let scaleY = 1;

    const transformList = group.transform.baseVal;
    for (let i = 0; i < transformList.numberOfItems; i++) {
        const transform = transformList.getItem(i);
        if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
            translateX = transform.matrix.e;
            translateY = transform.matrix.f;
        } else if (transform.type === SVGTransform.SVG_TRANSFORM_SCALE) {
            scaleX = transform.matrix.a;
            scaleY = transform.matrix.d;
        }
    }

    if (shapeType === 'rect') {
        initialWidth = parseFloat(shapeBody.getAttribute('width'));
        initialHeight = parseFloat(shapeBody.getAttribute('height'));
    } else if (shapeType === 'circle') {
        const r = parseFloat(shapeBody.getAttribute('r'));
        initialWidth = r * 2;
        initialHeight = r * 2;
    } else if (shapeType === 'polygon') {
        // For polygons, use the bounding box of the shape body as initial width/height
        initialWidth = bbox.width;
        initialHeight = bbox.height;
    }

    return {
        type: shapeType,
        color: group.getAttribute('data-color'),
        label: group.getAttribute('data-label'),
        emotion: group.getAttribute('data-emotion'), // Retrieve emotion
        action: group.getAttribute('data-action'),   // Retrieve action
        eyeColor: group.getAttribute('data-eye-color'), // Retrieve eye color
        clothing: group.getAttribute('data-clothing'), // Retrieve clothing
        hairStyle: group.getAttribute('data-hair-style'), // Retrieve hair style
        hairColor: group.getAttribute('data-hair-color'), // Retrieve hair color
        noColor: group.getAttribute('data-no-color') === 'true', // Retrieve noColor state
        promptPrefix: group.getAttribute('data-prompt-prefix'), // Retrieve prompt prefix
        promptSuffix: group.getAttribute('data-prompt-suffix'), // Retrieve prompt suffix
        x: translateX, // Position is now directly the group's translate X
        y: translateY, // Position is now directly the group's translate Y
        width: initialWidth * scaleX, // Base width * current scale
        height: initialHeight * scaleY // Base height * current scale
    };
}

export function deleteSelectedShape() {
    if (selectedShapeGroup) {
        svgCanvas.removeChild(selectedShapeGroup);
        selectedShapeGroup = null;
        return true;
    }
    return false;
}

export function clearCanvas() {
    // Remove all child elements from the SVG canvas except the pose container
    const children = Array.from(svgCanvas.childNodes);
    children.forEach(child => {
        if (child.id !== 'pose-container') {
            svgCanvas.removeChild(child);
        }
    });

    selectedShapeGroup = null;
    currentGradient = null; // Reset la variable interne du fond

    // Remove any existing gradient definitions
    const oldDefs = svgCanvas.querySelector('defs');
    if (oldDefs) {
        oldDefs.remove();
    }
}

export function updateShapeColor(group, newColor, noColorState) {
    if (group && group._shapeBody) {
        group._shapeBody.setAttribute('fill', newColor);
        group.setAttribute('data-color', newColor); // Update data-color attribute
        group.setAttribute('data-no-color', noColorState.toString()); // Update noColor attribute
    }
}

export function updateShapeStrokeColor(group, newColor) {
    if (group && group._shapeBody) {
        group._shapeBody.setAttribute('stroke', newColor);
        group.setAttribute('data-stroke-color', newColor); // Update data-stroke-color attribute
    }
}

export function updateShapeText(group, newText) {
    if (group && group._labelText) {
        group._labelText.textContent = newText;
        group.setAttribute('data-label', newText);
        updateShapeAppearance(group); // Recalculer la position du texte et des poignées
    }
}

export function getSvgCanvas() {
    return svgCanvas;
}

export function getCanvasDimensions() {
    if (svgCanvas) {
        return {
            width: svgCanvas.clientWidth,
            height: svgCanvas.clientHeight
        };
    }
    return { width: 0, height: 0 };
}

export function setCanvasBackgroundGradient(colors) {
    currentGradient = colors; // Met à jour la variable interne

    if (!svgCanvas || !colors || colors.length === 0) {
        // Fallback to no background or clear previous if colors are invalid
        svgCanvas.style.fill = ''; // Clear any direct fill
        const oldDefs = svgCanvas.querySelector('defs');
        if (oldDefs) {
            oldDefs.remove();
        }
        const bgRect = svgCanvas.querySelector('#backgroundRect');
        if (bgRect) {
            bgRect.remove();
        }
        return;
    }

    // Ensure defs element exists
    let defs = svgCanvas.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svgCanvas.insertBefore(defs, svgCanvas.firstChild); // Add defs at the beginning
    } else {
        // Clear previous gradients
        defs.innerHTML = '';
    }

    const gradientId = 'canvasBackgroundGradient';
    const linearGradient = document.createElementNS(SVG_NS, 'linearGradient');
    linearGradient.setAttribute('id', gradientId);
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '0%');
    linearGradient.setAttribute('y2', '100%'); // Vertical gradient (from top to bottom)

    const step = 100 / (colors.length - 1);
    colors.forEach((color, index) => {
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', `${index * step}%`);
        stop.setAttribute('stop-color', color);
        linearGradient.appendChild(stop);
    });

    defs.appendChild(linearGradient);

    // Create a rect that covers the entire canvas and fills it with the gradient
    let bgRect = svgCanvas.querySelector('#backgroundRect');
    if (!bgRect) {
        bgRect = document.createElementNS(SVG_NS, 'rect');
        bgRect.setAttribute('id', 'backgroundRect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        svgCanvas.insertBefore(bgRect, svgCanvas.firstChild); // Ensure it's the first child
    }
    bgRect.setAttribute('fill', `url(#${gradientId})`);
}

export function bringToFront(group) {
    if (group) {
        svgCanvas.appendChild(group);
    }
}

export function sendToBack(group) {
    if (group) {
        const backgroundRect = svgCanvas.querySelector('#backgroundRect');
        if (backgroundRect) {
            // If backgroundRect exists, insert the group right after it.
            // If backgroundRect is the only child, this will put it at the end.
            // If there are other elements after backgroundRect, it will insert before them.
            svgCanvas.insertBefore(group, backgroundRect.nextSibling);
        } else {
            // If no backgroundRect, insert as the first child as usual.
            svgCanvas.insertBefore(group, svgCanvas.firstChild);
        }
    }
}

export function bringForward(group) {
    if (group && group.nextSibling) {
        svgCanvas.insertBefore(group.nextSibling, group);
    }
}

export function sendBackward(group) {
    if (group && group.previousSibling) {
        svgCanvas.insertBefore(group, group.previousSibling);
    }
}
