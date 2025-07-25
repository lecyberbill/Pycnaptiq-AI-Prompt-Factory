# Pycnaptiq-AI Shap Prompteur

Pycnaptiq-AI Shap Prompteur is a web-based tool designed to help users create visual compositions and generate descriptive prompts for them. This tool allows users to add various shapes to a canvas, manipulate their properties, and then export a detailed text prompt that describes the scene, suitable for use with AI image generation models.


<img width="1431" height="1044" alt="image" src="https://github.com/user-attachments/assets/0e0db20b-10f8-4a2d-9c29-27676217f41b" />

<img width="1479" height="775" alt="image" src="https://github.com/user-attachments/assets/bd8fbe30-42ce-4d0b-8265-ed609b9c13e7" />





## Features

-   **Shape Creation:** Add rectangles, circles, ellipses, triangles, and freeform shapes to the canvas.
-   **Shape Manipulation:** Drag, resize, and edit shapes, including their color, stroke, and text labels.
-   **Z-Index Control:** Adjust the layering of shapes (bring to front, send to back, etc.).
-   **Prompt Generation:** Automatically generate a natural-language prompt describing the scene, including background, camera angle, lighting, art style, and detailed descriptions of each shape's size, color, label, and position.
-   **Export Options:** Export the generated prompt, save the canvas as an SVG file, or export it as a PNG image.
-   **Freeform Drawing:** Create custom freeform paths with editable points and convert segments to Bezier curves with adjustable control handles.

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
    -   Choose a color for the shape using the color picker.
    -   Enter a label for the shape in the "Shape Label" input field.
    -   Click "Create Shape" to add it to the canvas.

2.  **Manipulate Shapes:**
    -   Click and drag shapes to move them.
    -   Click on a shape to select it. Once selected, you can:
        -   Drag its corner handles to resize it.
        -   Change its fill color using the "Shape Color" picker.
        -   Change its stroke color using the "Stroke Color" picker.
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

3.  **Freeform Shapes:**
    -   Select "Freeform" from the "Shape Type" dropdown.
    -   Click on the canvas to add points to your freeform path.
    -   Click "Close Path" to finalize the shape.
    -   Double-click an existing freeform shape to enter edit mode, where you can move individual points.
    -   **Convert to Bezier:** While in freeform edit mode, select a point on the path and click "Convert to Bezier". The line segment immediately following the selected point will be converted into a cubic Bezier curve.
    -   **Manipulate Bezier Curves:** Once a segment is converted to a Bezier curve, yellow control handles will appear. You can drag these handles to adjust the curvature. The tangent lines will help visualize the curve's direction.

4.  **Generate Prompt:**
    -   Adjust the background category, background idea, camera angle, lighting/mood, and art style using the respective dropdowns and buttons.
    -   Click "Generate Prompt" to see the generated text prompt in the "Prompt Display" area.

5.  **Export:**
    -   **Export PNG:** Click "Export PNG" to download the current canvas as a PNG image.
    -   **Save SVG:** Click "Save SVG" to download the current canvas as an SVG file.

6.  **Clear Canvas:**
    -   Click "Clear Canvas" to remove all shapes from the canvas.

## Project Structure

```
.
├── index.html
├── start_server.bat
├── README.md
└── assets/
    ├── colors.json
    ├── style.css
    └── js/
        ├── backgroundManager.js
        ├── colorUtils.js
        ├── dragAndResize.js
        ├── eventHandlers.js
        ├── main.js
        └── svgManager.js
```

-   `index.html`: The main HTML file for the application.
-   `start_server.bat`: A Windows batch script to quickly start a local Python HTTP server.
-   `assets/`: Contains all static assets for the application.
    -   `colors.json`: Defines color palettes or color names for use in prompts.
    -   `style.css`: Stylesheet for the application's appearance.
    -   `js/`: Contains all JavaScript modules for the application's logic.
        -   `main.js`: Initializes the SVG canvas and event listeners.
        -   `svgManager.js`: Manages SVG elements, including creation, manipulation, and z-index.
        -   `eventHandlers.js`: Contains all event listeners and the core prompt generation logic.
        -   `dragAndResize.js`: Handles drag and resize functionality for shapes.
        -   `colorUtils.js`: Utility functions for color conversions and closest color name matching.
        -   `backgroundManager.js`: Manages background data, camera angles, lighting, and art styles.
