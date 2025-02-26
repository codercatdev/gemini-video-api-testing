// To use the File API, use this import path for GoogleAIFileManager.
// Note that this is a different import path than what you use for generating content.
// For versions lower than @google/generative-ai@0.13.0
// use "@google/generative-ai/files"
import 'dotenv/config';
import { FunctionCallingMode, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, SchemaType } from "@google/generative-ai";
import type { GenerateContentRequest } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";

// Initialize the Gemini API client
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Environment variable GEMINI_API_KEY is missing.");
}

// Initialize GoogleGenerativeAI with your GEMINI_API_KEY.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Choose a Gemini model.
const model = genAI.getGenerativeModel({
  // model: "gemini-2.0-flash-lite-preview-02-05",
  model: "gemini-1.5-pro",
});

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

async function analyzeYouTubeVideo() {


  const listFilesResponse = await fileManager.listFiles();

  let videoFile = undefined;

  // View the response.
  for (const file of listFilesResponse?.files ?? []) {
    if(file.name === "files/ai-persuasion") {
      console.log('using existing file', file);
      videoFile = file;
    }
  }

  if (!videoFile) {
    // Upload the file and specify a display name.
    console.log('Uploading file...')
    const uploadResponse = await fileManager.uploadFile("./videos/video.mp4", {
      mimeType: "video/mp4",
      displayName: "AI Persuasion",
      name: "ai-persuasion",
    });
    // View the response.
    console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

    videoFile = uploadResponse.file;
  }
  // Poll getFile() on a set interval (10 seconds here) to check file state.
  let file = videoFile;
  while (file.state === FileState.PROCESSING) {
    process.stdout.write(".")
    // Sleep for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    // Fetch the file from the API again
    file = await fileManager.getFile(videoFile.name)
  }

  if (file.state === FileState.FAILED) {
    throw new Error("Video processing failed.");
  }

  // When file.state is ACTIVE, the file is ready to be used for inference.
  console.log(`File ${file.displayName} is ready for inference as ${file.uri}`);


  try {

    // Proper request structure

    const request: GenerateContentRequest = {
      contents: [{
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: videoFile.mimeType,
              fileUri: videoFile.uri
            }
          },
          {
            text: "Make a YouTube title, description, chapters, tags, and a 1000 word blog post in markdown format best for this video including images from the video."
          }
        ]
      }],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 1,
        maxOutputTokens: 4000,
      },
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY
        }
      },
      tools: [{
        functionDeclarations: [
          {
            name: "get_title",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING }
              },
              required: ["title"]
            },
            description: "Create a great YouTube title for this video that is less than 6 words"
          },
          {
            name: "get_summary",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                summary: { type: SchemaType.STRING }
              },
              required: ["summary"]
            },
            description: "Summarize this video and create an awesome YouTube description that is less than 100 words"
          },
          {
            name: "get_chapters",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                chapters: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      timestamp: { type: SchemaType.NUMBER },
                      title: { type: SchemaType.STRING }
                    },
                    required: ["timestamp", "title"]
                  }
                }
              },
              required: ["chapters"]
            },
            description: "Extract max 10 video chapters with timestamps and a unique title based on the content of the video"
          },
          {
            name: "get_tags",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                tags: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.STRING
                  }
                }
              },
              required: ["tags"]
            },
            description: "Extract max 10 video tags best for YouTube"
          },
          {
            name: "get_blog",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                blog: { type: SchemaType.STRING },
                paragraphs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                images: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ["blog", "paragraphs", "images"]
            },
            description: "Create at least a 3000+ word blog post in markdown format best for this video including images from the video, in an array of paragraphs and images"
          }]
      }]
    };

    const countResult = await model.countTokens(request);
    console.log(`Token count: ${countResult.totalTokens}`);

    const result = await model.generateContent(request);
    const functions = await result.response.functionCalls();
    
    if(!functions) {  
      console.log("No functions called");
      return;
    }

    console.log(JSON.stringify(functions, null, 2));

  } catch (error) {
    console.error("Error generating content:", error);
  }
}

analyzeYouTubeVideo();