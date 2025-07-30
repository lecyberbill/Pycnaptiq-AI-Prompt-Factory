// js/poseManager.js

import * as SvgManager from './svgManager.js';
import * as DataManager from './dataManager.js';

let poseContainer;
let isPosingMode = false;
let joints = {};
let bones = [];
let originalBackground = null;

export async function initPoseManager() {
    const poseData = await DataManager.loadPoseJointsData();
    if (poseData) {
        poseContainer = SvgManager.getSvgCanvas().appendChild(document.createElementNS(SvgManager.SVG_NS, 'g'));
        poseContainer.id = 'pose-container';
        poseContainer.style.display = 'none';

        poseData.joints.forEach(joint => {
            const circle = document.createElementNS(SvgManager.SVG_NS, 'circle');
            circle.setAttribute('cx', joint.x);
            circle.setAttribute('cy', joint.y);
            circle.setAttribute('r', 10);
            circle.setAttribute('fill', joint.color);
            circle.style.cursor = 'pointer';
            poseContainer.appendChild(circle);
            joints[joint.name] = { x: joint.x, y: joint.y, element: circle };

            let isDragging = false;
            circle.addEventListener('mousedown', (e) => {
                isDragging = true;
            });
            
            SvgManager.getSvgCanvas().addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const svg = SvgManager.getSvgCanvas();
                    const pt = svg.createSVGPoint();
                    pt.x = e.clientX;
                    pt.y = e.clientY;
                    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
                    joints[joint.name].x = svgP.x;
                    joints[joint.name].y = svgP.y;
                    circle.setAttribute('cx', svgP.x);
                    circle.setAttribute('cy', svgP.y);
                    updateBones();
                }
            });

            SvgManager.getSvgCanvas().addEventListener('mouseup', (e) => {
                isDragging = false;
            });
        });

        poseData.bones.forEach(boneData => {
            const line = document.createElementNS(SvgManager.SVG_NS, 'line');
            const [start, end] = boneData.points;
            line.setAttribute('x1', joints[start].x);
            line.setAttribute('y1', joints[start].y);
            line.setAttribute('x2', joints[end].x);
            line.setAttribute('y2', joints[end].y);
            line.setAttribute('stroke', boneData.color);
            line.setAttribute('stroke-width', 5);
            poseContainer.insertBefore(line, poseContainer.firstChild);
            bones.push({ start: start, end: end, element: line });
        });
    }
}

function setControlsDisabled(disabled) {
    const controlsToDisable = [
        'freeform-mode-btn', 'create-shape', 'delete-shape', 'clear-canvas', 'undo-btn', 'redo-btn',
        'export-prompt', 'shape-color', 'no-fill-color', 'stroke-color', 'apply-stroke-to-all',
        'send-backward-btn', 'bring-forward-btn', 'send-to-back-btn', 'bring-to-front-btn',
        'toggle-theme-btn'
    ];

    controlsToDisable.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = disabled;
        }
    });

    const sectionsToHide = [
        'shape-palette', 'background-settings', 'color-settings', 'layer-management',
        'camera-settings', 'lighting-style-settings'
    ];

    sectionsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Hide all sections except the main shape management container
            if (id !== 'shape-management') {
                element.style.display = disabled ? 'none' : '';
            }
        }
    });

    // Specifically handle controls within shape-management
    const shapeManagementControls = [
        'shape-palette', 'create-shape', 'delete-shape', 'shape-label'
    ];
    shapeManagementControls.forEach(id => {
        const element = document.getElementById(id);
        if(element) {
            const parentGroup = element.closest('.control-group');
            if (parentGroup) {
                 parentGroup.style.display = disabled ? 'none' : '';
            } else {
                element.style.display = disabled ? 'none' : '';
            }
        }
    });
}

export function togglePosingMode() {
    isPosingMode = !isPosingMode;
    poseContainer.style.display = isPosingMode ? 'block' : 'none';

    setControlsDisabled(isPosingMode);

    const poseModeControls = document.getElementById('pose-mode-controls');
    if (isPosingMode) {
        document.body.classList.add('pose-mode-active');
        if (poseModeControls) poseModeControls.style.display = 'flex'; // Show pose controls
        originalBackground = SvgManager.getCanvasBackgroundGradient();
        SvgManager.setCanvasBackgroundGradient([]); // Clear background gradient for pose mode
    } else {
        document.body.classList.remove('pose-mode-active');
        if (poseModeControls) poseModeControls.style.display = 'none'; // Hide pose controls
        SvgManager.setCanvasBackgroundGradient(originalBackground);
        // Also clear the background image
        SvgManager.getSvgCanvas().style.backgroundImage = 'none';
        const poseBackgroundImageInput = document.getElementById('pose-background-image');
        if(poseBackgroundImageInput) poseBackgroundImageInput.value = '';
    }
}

export function getPoseDescription() {
    if (!isPosingMode) {
        return '';
    }

    let description = 'A character is posing. ';
    const leftShoulder = joints['left_shoulder'];
    const rightShoulder = joints['right_shoulder'];
    const leftElbow = joints['left_elbow'];
    const rightElbow = joints['right_elbow'];
    const leftWrist = joints['left_wrist'];
    const rightWrist = joints['right_wrist'];
    const leftHip = joints['left_hip'];
    const rightHip = joints['right_hip'];
    const leftKnee = joints['left_knee'];
    const rightKnee = joints['right_knee'];
    const leftAnkle = joints['left_ankle'];
    const rightAnkle = joints['right_ankle'];

    // Basic arm descriptions
    if (leftWrist.y < leftShoulder.y) {
        description += 'The left arm is raised. ';
    }
    if (rightWrist.y < rightShoulder.y) {
        description += 'The right arm is raised. ';
    }

    // Basic leg descriptions
    if (leftAnkle.y < leftHip.y) {
        description += 'The left leg is raised. ';
    }
    if (rightAnkle.y < rightHip.y) {
        description += 'The right leg is raised. ';
    }

    // More detailed descriptions can be added here based on joint angles

    return description;
}

function updateBones() {
    bones.forEach(bone => {
        const startJoint = joints[bone.start];
        const endJoint = joints[bone.end];
        bone.element.setAttribute('x1', startJoint.x);
        bone.element.setAttribute('y1', startJoint.y);
        bone.element.setAttribute('x2', endJoint.x);
        bone.element.setAttribute('y2', endJoint.y);
    });
}
