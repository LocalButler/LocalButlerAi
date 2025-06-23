import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { GEMINI_MODEL_TEXT, GEMINI_MODEL_VISION } from '../constants';
import { UserProfile } from "../types";
import { useUserStore } from '../stores/useUserStore';
import { useMealPlanStore } from '../stores/useMealPlanStore';
import { SavedMealPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
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

// Helper to save interaction (to backend or localStorage)
async function saveGeminiInteraction({
  interactionId,
  userId,
  prompt,
  response,
  type,
  timestamp
}: {
  interactionId: string;
  userId: string;
  prompt: string;
  response: string;
  type: 'text' | 'vision';
  timestamp: string;
}) {
  // TODO: Replace with API call to backend if needed
  const interactions = JSON.parse(localStorage.getItem('geminiInteractions') || '[]');
  interactions.push({ interactionId, userId, prompt, response, type, timestamp });
  localStorage.setItem('geminiInteractions', JSON.stringify(interactions));
}

export async function generateText(
  prompt: string, 
  systemInstruction?: string, 
  outputJson: boolean = false,
  userProfile: UserProfile | null = null,
  temperature: number = 0.7 // Added temperature parameter with default
): Promise<string> {
  if (!ai) return Promise.reject(new Error("Gemini API key not configured."));
  
  // Get user from Zustand store
  const user = useUserStore.getState().user;
  const userId = user?.id || 'anonymous';
  const interactionId = uuidv4();
  const timestamp = new Date().toISOString();

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
    await saveGeminiInteraction({
      interactionId,
      userId,
      prompt: contextualPrompt,
      response: response.text ?? '',
      type: 'text',
      timestamp
    });
    return response.text ?? '';
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

  // Get user from Zustand store
  const user = useUserStore.getState().user;
  const userId = user?.id || 'anonymous';
  const interactionId = uuidv4();
  const timestamp = new Date().toISOString();

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
        temperature: temperature,
      }
    });
    await saveGeminiInteraction({
      interactionId,
      userId,
      prompt: contextualPrompt,
      response: response.text ?? '',
      type: 'vision',
      timestamp
    });
    return response.text ?? '';
  } catch (error) {
    console.error("Gemini API error (generateTextWithImage):", error);
    throw error;
  }
}

// --- Agent Z API integration ---

// Simple validation helper for Agent Z data
function validateAgentZPayload(type: string, data: any): { valid: boolean; error?: string } {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Type is required and must be a string.' };
  }
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data is required and must be an object.' };
  }
  // Add more type-specific validation as needed
  if (type === 'mealPlan') {
    if (!data.meals || !Array.isArray(data.meals)) {
      return { valid: false, error: 'Meal plan must include a meals array.' };
    }
  }
  // ...add more cases for other types...
  return { valid: true };
}

/**
 * Save data to Agent Z with validation, error handling, and optimistic UI update support.
 * @param type - The type of data (e.g., 'mealPlan')
 * @param data - The data to save
 * @param optimisticUpdate - Optional callback to update UI optimistically
 * @param rollback - Optional callback to rollback UI if save fails
 * @param setError - Optional callback to set error message for user feedback
 * @param sessionId - Required session ID to associate with the save operation
 * @returns Response from backend or error
 */
export async function agentZSave(
  type: string,
  data: any,
  optimisticUpdate?: () => void,
  rollback?: () => void,
  setError?: (msg: string) => void,
  sessionId?: string
) {
  // Validate before sending
  const validation = validateAgentZPayload(type, data);
  if (!validation.valid) {
    const errorMsg = `Validation failed: ${validation.error}`;
    console.error(errorMsg);
    if (setError) setError(errorMsg);
    throw new Error(errorMsg);
  }
  if (!sessionId) {
    const errorMsg = 'Session ID is required for saving data.';
    console.error(errorMsg);
    if (setError) setError(errorMsg);
    throw new Error(errorMsg);
  }
  // Optimistic UI update
  if (optimisticUpdate) optimisticUpdate();

  try {
    const user = useUserStore.getState().user;
    const userId = user?.id || 'anonymous';
    const response = await fetch('/api/v1/agentz/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type,
        data,
        sessionId,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      if (setError) setError(`Failed to save with Agent Z: ${errorText}`);
      throw new Error('Failed to save with Agent Z');
    }
    return await response.json();
  } catch (err: any) {
    console.error('Agent Z save error:', err);
    if (rollback) rollback();
    if (setError) setError('Agent Z save error: ' + (err?.message || String(err)));
    throw err;
  }
}

// Example: After parsing Gemini JSON response
export async function handleGeminiMealPlanResponse(responseText: string, setError?: (msg: string) => void) {
  const parsed = parseGeminiJsonResponse(responseText) as SavedMealPlan;
  if (parsed) {
    const prev = useMealPlanStore.getState().mealPlans;
    // Optimistically add meal plan
    const optimisticUpdate = () => useMealPlanStore.getState().addMealPlan(parsed);
    // Rollback if error
    const rollback = () => useMealPlanStore.getState().rollbackMealPlans(prev);
    try {
      await agentZSave('mealPlan', parsed, optimisticUpdate, rollback, setError);
    } catch (e) {
      // Error already handled by setError and rollback
    }
  }
  return parsed;
}