import { GoogleGenAI, Modality, Type, Operation } from "@google/genai";
import { AspectRatio } from '../types';

// AUDIO DECODING HELPERS for TTS
export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

// FIX: Removed apiKey parameter and switched to process.env.API_KEY
export const generateSpeech = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say in a cheerful, friendly voice for a children's story: ${prompt}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API.");
    }
    return base64Audio;
};

// FIX: Removed apiKey parameter and switched to process.env.API_KEY
export const generateCharacterDescription = async (storyPrompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a character designer for a children's animation studio. Based on the following story idea, create a detailed visual description of the main character. This description will be used by an AI image generator to ensure the character looks consistent across multiple images. Focus on key visual features like species, clothing, colors, and any unique accessories. Keep it concise, around 2-3 sentences.

    Story idea: "${storyPrompt}"`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    
    return response.text;
};

// FIX: Removed apiKey parameter and switched to process.env.API_KEY
export const generateImagePromptsForStory = async (storyPrompt: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a creative storyboard artist for a children's YouTube channel. Based on the following story idea, generate a list of 12 distinct, visually rich prompts for illustrations that tell the story from beginning to end. Each prompt should describe a specific action or scene. Return the result as a JSON array of strings.

    Story idea: "${storyPrompt}"`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                },
            },
        },
    });

    try {
        const jsonText = response.text.trim();
        const prompts = JSON.parse(jsonText);
        if (Array.isArray(prompts) && prompts.every(p => typeof p === 'string')) {
            return prompts;
        }
        throw new Error("Invalid response format from API.");
    } catch (e) {
        console.error("Failed to parse image prompts:", e);
        throw new Error("Could not generate illustration ideas for the story.");
    }
};

// FIX: Removed apiKey parameter and switched to process.env.API_KEY
export const generateImage = async (prompt: string, characterDescription?: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let finalPrompt: string;
    if (characterDescription) {
        finalPrompt = `A cute, vibrant 3D animation style render, like a still from a modern animated movie for children. Main character description (maintain consistency): "${characterDescription}". The scene is: ${prompt}`;
    } else {
        finalPrompt = `A cute, vibrant 3D animation style illustration for a children's storybook. ${prompt}`;
    }

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

const pollVideoOperation = async (
    // FIX: Replaced VideosOperationResponse with Operation and removed apiKey
    operation: Operation,
    setProgress: (message: string) => void
): Promise<string> => {
    let currentOperation = operation;
    // FIX: Switched to process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const messages = [
      "Warming up the animation engines...",
      "Gathering pixels and colors...",
      "Teaching the pixels to dance...",
      "Almost there, adding the final sparkle!",
    ];
    let messageIndex = 0;

    while (!currentOperation.done) {
        setProgress(messages[messageIndex % messages.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
        } catch (e) {
            console.error("Error polling video operation:", e);
            throw e;
        }
    }

    const downloadLink = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }

    // FIX: Switched to process.env.API_KEY
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};

// FIX: Removed apiKey parameter
export const generateVideoFromPrompt = async (
    prompt: string,
    aspectRatio: AspectRatio,
    setProgress: (message: string) => void
): Promise<string> => {
    // FIX: Switched to process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A whimsical, cute animation for a children's story. ${prompt}`,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
    // FIX: Removed apiKey from pollVideoOperation call
    return pollVideoOperation(operation, setProgress);
};

// FIX: Removed apiKey parameter
export const generateVideoFromImage = async (
    prompt: string | null,
    imageBase64: string,
    mimeType: string,
    aspectRatio: AspectRatio,
    setProgress: (message: string) => void
): Promise<string> => {
    // FIX: Switched to process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt ? `A whimsical, cute animation for a children's story. ${prompt}` : "Animate this image in a whimsical, cute style for a children's story.",
        image: {
            imageBytes: imageBase64,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
    // FIX: Removed apiKey from pollVideoOperation call
    return pollVideoOperation(operation, setProgress);
};
