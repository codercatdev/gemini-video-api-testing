// To use the File API, use this import path for GoogleAIFileManager.
// Note that this is a different import path than what you use for generating content.
// For versions lower than @google/generative-ai@0.13.0
// use "@google/generative-ai/files"
import { GoogleAIFileManager } from "@google/generative-ai/dist/server/index.js";
// Initialize GoogleAIFileManager with your GEMINI_API_KEY.
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
// Upload the file and specify a display name.
const uploadResponse = await fileManager.uploadFile("GreatRedSpot.mp4", {
    mimeType: "video/mp4",
    displayName: "Jupiter's Great Red Spot",
});
// View the response.
console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);
