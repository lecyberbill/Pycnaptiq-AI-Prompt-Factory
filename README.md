# Pycnaptiq-AI Prompt Factory

Pycnaptiq-AI Prompt Factory is a web-based tool designed to help users create visual compositions and generate descriptive prompts for them. This tool allows users to add various shapes to a canvas, manipulate their properties, and then export a detailed text prompt that describes the scene, suitable for use with AI image generation models.

<img width="1494" height="1027" alt="image" src="https://github.com/user-attachments/assets/78c12c19-bd9f-4e1b-9b57-df0b88d23be6" />

<img width="1469" height="1132" alt="image" src="https://github.com/user-attachments/assets/33b0744f-7299-41a3-beef-f3f6897769a7" />

**Flux, image to image** 
<img width="1249" height="1169" alt="image" src="https://github.com/user-attachments/assets/b9ab094f-9287-49a6-af9b-fe01802c7e38" />

## Features

-   **Shape Creation:** Add rectangles, circles, ellipses, triangles, and freeform shapes to the canvas.
-   **Shape Manipulation:** Drag, resize, and edit shapes, including their color, stroke, and text labels.
-   **Z-Index Control:** Adjust the layering of shapes (bring to front, send to back, etc.).
-   **Undo/Redo Functionality:** Easily correct mistakes or revert changes with dedicated Undo and Redo buttons (`Ctrl+Z` and `Ctrl+Y` shortcuts).
-   **Enhanced Color Control:**
    -   Set fill color for shapes.
    -   Apply a "No Fill Color (Flesh Tone)" option, which influences the generated prompt to omit color descriptions.
    -   Specify a stroke color for shapes.
    -   Apply the current stroke color to all shapes on the canvas.
-   **Detailed Shape Attributes (Object Identity Card):**
    -   Attach specific attributes to each shape, such as Emotion, Action, Eye Color, Clothing, Hair Style, and Hair Color, which are included in the prompt.
    -   Dropdowns for these attributes now include a "Select X" option, allowing users to explicitly choose no value for a field.
-   **Custom Prompt Text per Shape:** Add custom text that appears before and after an individual shape's description in the generated prompt.
-   **Prompt Generation:** Automatically generate a natural-language prompt describing the scene, including background, camera angle, lighting, art style, and detailed descriptions of each shape's size, color, label, attributes, and position.
-   **Freeform Drawing and Advanced Editing:**
    -   Create custom freeform paths with editable points.
    -   Convert line segments to Bezier curves with adjustable control handles for precise shape manipulation.
-   **Export Options:** Export the generated prompt, copy the prompt to clipboard (excluding instructional text), save the canvas as an SVG file, or export it as a PNG image.
-   **Pose Estimation and Manipulation:** Create and manipulate a skeletal pose model directly on the canvas, with the ability to generate descriptive text for the pose.

## Getting Started

To run Shap Prompteur locally, you need Python installed on your system to serve the static files.

### Prerequisites

-   A functional Python 3.x environment is required to serve the static files.

### Installation and Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lecyberbill/Pycnaptiq-AI-Shap-Prompteur
    cd shap_prompteur
    ```
    

2.  **Start the local server:**
    A convenience batch file `start_server.bat` is provided to quickly launch a Python HTTP server.
    ```bash
    start_server.bat
    ```
    This will open a new command prompt window and start the server on `http://127.0.0.1:8000`.

3.  **Access the application:**
    Open your web browser and navigate to:
    ```
    http://localhost:8000/index.html
    ```

## Usage

1.  **Add Shapes:**
    -   Select a shape type (Rectangle, Circle, Ellipse, Triangle, Freeform) from the "Shape Type" dropdown.
    -   Choose a fill color for the shape using the "Fill Color" picker. Optionally, select "No Fill Color (Flesh Tone)" if the shape represents a skin-toned object without a specific color.
    -   Choose a stroke color using the "Stroke Color" picker.
    -   Enter a label for the shape in the "Shape Label" input field.
    -   Click "Create Shape" to add it to the canvas.

2.  **Manipulate Shapes:**
    -   Click and drag shapes to move them.
    -   Click on a shape to select it. Once selected, you can:
        -   Drag its corner handles to resize it.
        -   Change its fill color using the "Fill Color" picker or toggle "No Fill Color (Flesh Tone)".
        -   Change its stroke color using the "Stroke Color" picker.
        -   Click "Apply to All Shapes" to apply the current stroke color to all shapes on the canvas.
        -   Use the Z-index buttons ("Bring to Front", "Send to Back", "Bring Forward", "Send Backward") to adjust its layer.
    -   **Editing and Deleting Text Labels:**
        -   Double-click the text label on a shape to enter edit mode. Type your new text and press `Enter` or click outside to apply.
        -   To clear a text label, select the shape and press `Delete` or `Backspace` while the text editor is active. The label will be replaced with a non-breaking space, allowing you to re-edit it later.
        -   **Right-Click to Edit Label:** Right-click on any shape to open a prompt to directly change its label. This is useful for re-adding a label that has been cleared or for quick edits.
    -   **Deleting Shapes:**
        -   With a shape selected (and no text editor active), press `Delete` or `Backspace` to remove the entire shape from the canvas.
    -   **Copy and Paste:**
        -   Use `Ctrl+C` to copy the selected shape.
        -   Use `Ctrl+V` to paste the copied shape (pasted shapes appear slightly offset from the original).
    -   **Undo/Redo:**
        -   Click the "Undo" button or press `Ctrl+Z` to revert the last action.
        -   Click the "Redo" button or press `Ctrl+Y` to re-apply an undone action.

3.  **Freeform Shapes:**
    -   Select "Freeform" from the "Shape Type" dropdown.
    -   Click on the canvas to add points to your freeform path.
    -   Click "Close Path" to finalize the shape.
    -   Double-click an existing freeform shape to enter edit mode, where you can move individual points.
    -   **Convert to Bezier:** While in freeform edit mode, select a point on the path and click "Convert to Bezier". The line segment immediately following the selected point will be converted into a cubic Bezier curve.
    -   **Manipulate Bezier Curves:** Once a segment is converted to a Bezier curve, yellow control handles will appear. You can drag these handles to adjust the curvature. The tangent lines will help visualize the curve's direction.

4.  **Manage Shape Attributes (Object Identity Card):**
    -   Click the small yellow icon that appears on a selected shape to open its "Object Identity Card".
    -   Here you can select specific Emotions, Actions, Eye Colors, Clothing, Hair Styles, and Hair Colors from the dropdowns.
    -   Use the "Text Before Shape Description" and "Text After Shape Description" fields to add custom text that will be included in the prompt for this specific shape.
    -   Click "Save Attributes" to apply the changes.

5.  **Generate Prompt:**
    -   Adjust the background category, background idea, camera angle, lighting/mood, and art style using the respective dropdowns and buttons.
    -   Click "Generate Prompt" to see the generated text prompt in the "Prompt Display" area.

6.  **Export:**
    -   **Export PNG:** Click "Export PNG" to download the current canvas as a PNG image.
    -   **Save SVG:** Click "Save SVG" to download the current canvas as an SVG file.
    -   **Copy Prompt:** Click "Copy Prompt" to copy the generated text to your clipboard, excluding the final instructional line.

7.  **Clear Canvas:**
    -   Click "Clear Canvas" to remove all shapes from the canvas.

8.  **Pose Mode:**
    -   Click the "Toggle Pose Mode" button to activate or deactivate the pose manipulation interface.
    -   In pose mode, a skeletal model appears on the canvas. You can drag the circular joints to manipulate the pose.
    -   The background of the canvas is cleared in pose mode to provide a clear view of the skeletal model.
    -   When you generate a prompt, the current pose will be described along with other elements on the canvas.

## Project Structure

```
.
├── index.html
├── start_server.bat
├── README.md
└── assets/
    ├── colors.json
    ├── style.css
    ├── data/
    │   ├── emotions_actions.json
    │   └── object_attributes.json
    └── js/
        ├── backgroundManager.js
        ├── colorUtils.js
        ├── dataManager.js
        ├── dragAndResize.js
        ├── eventHandlers.js
        ├── historyManager.js
        ├── main.js
        └── svgManager.js
```

-   `index.html`: The main HTML file for the application.
-   `start_server.bat`: A Windows batch script to quickly start a local Python HTTP server.
-   `assets/`: Contains all static assets for the application.
    -   `colors.json`: Defines color palettes or color names for use in prompts.
    -   `style.css`: Stylesheet for the application's appearance.
    -   `data/`: Contains JSON data for emotions, actions, and object attributes.
    -   `js/`: Contains all JavaScript modules for the application's logic.
        -   `main.js`: Initializes the SVG canvas and event listeners.
        -   `svgManager.js`: Manages SVG elements, including creation, manipulation, and z-index.
        -   `eventHandlers.js`: Contains all event listeners and the core prompt generation logic.
        -   `dragAndResize.js`: Handles drag and resize functionality for shapes.
        -   `colorUtils.js`: Utility functions for color conversions and closest color name matching.
        -   `backgroundManager.js`: Manages background data, camera angles, lighting, and art styles.
        -   `historyManager.js`: Manages the application's undo/redo state.
        -   `dataManager.js`: Handles loading and providing data for various dropdowns (emotions, actions, etc.).
