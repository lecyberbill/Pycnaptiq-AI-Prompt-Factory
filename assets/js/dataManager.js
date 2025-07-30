let emotionsData = [];
let actionsData = [];
let eyeColorsData = [];
let clothingData = [];
let hairStylesData = [];
let hairColorsData = [];

export async function loadObjectAttributesData() {
    try {
        const response = await fetch('assets/data/object_attributes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        emotionsData = data.emotions;
        actionsData = data.actions;
        eyeColorsData = data.eyeColors;
        clothingData = data.clothing;
        hairStylesData = data.hairStyles;
        hairColorsData = data.hairColors;
        console.log("Object attributes data loaded successfully.");
    } catch (error) {
        console.error("Failed to load object_attributes.json:", error);
    }
}

export function getEmotions() {
    return emotionsData;
}

export function getActions() {
    return actionsData;
}

export function getEyeColors() {
    return eyeColorsData;
}

export function getClothing() {
    return clothingData;
}

export function getHairStyles() {
    return hairStylesData;
}

export function getHairColors() {
    return hairColorsData;
}

export async function loadPoseJointsData() {
    try {
        const response = await fetch('assets/data/pose_joints.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Pose joints data loaded successfully.");
        return data;
    } catch (error) {
        console.error("Failed to load pose_joints.json:", error);
        return null;
    }
}
