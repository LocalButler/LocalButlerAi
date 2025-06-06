import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { GEMINI_MODEL_TEXT, GEMINI_MODEL_VISION } from '../constants';
import { UserProfile } from "../types";

const API_KEY = process.env.GEMINI_API_KEY;
console.log("API_KEY:", API_KEY);

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("API_KEY environment variable not set. Gemini API features will be disabled.");
}

export const isApiKeySet = (): boolean => !!API_KEY;

export function parseGeminiJsonResponse<T,>(jsonString: string): T | null {
  if (!jsonString) return null;
  let cleanJsonString = jsonString.trim();
  
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanJsonString.match(fenceRegex);
  if (match && match[2]) {
    cleanJsonString = match[2].trim();
  }

  cleanJsonString = cleanJsonString.replace(/,\s*}/g, '}');
  cleanJsonString = cleanJsonString.replace(/,\s*]/g, ']');

  try {
    return JSON.parse(cleanJsonString) as T;
  } catch (error) {
    console.error(
        "Failed to parse JSON response. See details below.",
        "\nError:", error,
        "\nOriginal string (from AI, pre-cleaning):", jsonString,
        "\nAttempted to parse (after cleaning fences and trailing commas):", cleanJsonString
    );
    return null;
  }
}

function addUserContextToPrompt(prompt: string, userProfile: UserProfile | null): string {
  let contextString = "";
  if (userProfile) {
    if (userProfile.butlerPersonaSummary) {
      contextString += `Butler Persona Summary: ${userProfile.butlerPersonaSummary}\n`;
    }
    if (userProfile.dietaryRestrictions) {
      contextString += `Dietary Preferences/Restrictions: ${userProfile.dietaryRestrictions}\n`;
    }
    if (userProfile.avoidIngredients) {
      contextString += `Ingredients to Always Avoid: ${userProfile.avoidIngredients}\n`;
    }
    if (userProfile.cookingComplexity && userProfile.cookingComplexity !== "No Preference") {
      contextString += `Preferred Cooking Complexity: ${userProfile.cookingComplexity}\n`;
    }
    if (userProfile.favoriteCuisines) {
      contextString += `Favorite Cuisines: ${userProfile.favoriteCuisines}\n`;
    }
  }

  if (contextString) {
    return `User Context:\n${contextString.trim()}\n\nOriginal Prompt: ${prompt}`;
  }
  return prompt;
}


export async function generateText(
  prompt: string, 
  systemInstruction?: string, 
  outputJson: boolean = false,
  userProfile: UserProfile | null = null,
  temperature: number = 0.7 // Added temperature parameter with default
): Promise<string> {
  if (!ai) return Promise.reject(new Error("Gemini API key not configured."));
  
  const contextualPrompt = addUserContextToPrompt(prompt, userProfile);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: contextualPrompt,
      config: {
        ...(systemInstruction && { systemInstruction }),
        ...(outputJson && { responseMimeType: "application/json" }),
        temperature: temperature, // Use the provided temperature
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error (generateText):", error);
    throw error;
  }
}

export async function generateTextWithImage(
  prompt: string, 
  base64ImageData: string, 
  mimeType: string, 
  systemInstruction?: string,
  outputJson: boolean = false,
  userProfile: UserProfile | null = null,
  temperature: number = 0.5 // Vision model might prefer a slightly lower default temp
): Promise<string> {
  if (!ai) return Promise.reject(new Error("Gemini API key not configured."));

  const contextualPrompt = addUserContextToPrompt(prompt, userProfile);

  const imagePart: Part = {
    inlineData: {
      mimeType: mimeType,
      data: base64ImageData,
    },
  };
  const textPart: Part = { text: contextualPrompt };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_VISION,
      contents: { parts: [textPart, imagePart] },
      config: {
        ...(systemInstruction && { systemInstruction }),
        ...(outputJson && { responseMimeType: "application/json" }),
        temperature: temperature, // Use the provided temperature
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error (generateTextWithImage):", error);
    throw error;
  }
}