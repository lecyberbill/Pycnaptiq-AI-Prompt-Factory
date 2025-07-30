// This file will handle the image generation using the Gemini API.

// We will need to adapt the Node.js code to a browser-compatible version.
// This means using the Gemini REST API instead of the @google/genai package.

// Function to generate an image
async function generateImage(prompt, apiKey) {
    if (!apiKey) {
        alert("Please enter your Gemini API key.");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

    const headers = {
        "Content-Type": "application/json",
    };

    const body = {
        contents: [
            {
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        "generationConfig": {
            "responseMimeType": "image/png"
        }
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error.message}`);
        }

        const data = await response.json();
        
        if (data.inlineData) {
            const imageData = data.inlineData.data;
            const imageUrl = `data:image/png;base64,${imageData}`;
            
            // Create an image element and display it
            const imageContainer = document.createElement('div');
            imageContainer.id = 'generated-image-container';
            imageContainer.style.position = 'fixed';
            imageContainer.style.top = '10px';
            imageContainer.style.right = '10px';
            imageContainer.style.zIndex = '1001';
            imageContainer.style.border = '2px solid #ccc';
            imageContainer.style.padding = '10px';
            imageContainer.style.backgroundColor = 'white';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.width = '256px';
            img.style.height = '256px';

            const closeButton = document.createElement('button');
            closeButton.innerText = 'Close';
            closeButton.onclick = () => document.body.removeChild(imageContainer);

            const saveButton = document.createElement('button');
            saveButton.innerText = 'Save Image';
            saveButton.onclick = () => saveBase64Image(imageData, 'generated-image.png');

            imageContainer.appendChild(img);
            imageContainer.appendChild(closeButton);
            imageContainer.appendChild(saveButton);
            document.body.appendChild(imageContainer);

        } else {
            console.error("No image data found in the response:", data);
            alert("Could not generate image. Check console for details.");
        }

    } catch (error) {
        console.error("Error generating image:", error);
        alert(`Error generating image: ${error.message}`);
    }
}

function saveBase64Image(base64Data, fileName) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'image/png'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
