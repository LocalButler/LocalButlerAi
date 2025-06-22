import React, { useState, useCallback, useEffect } from 'react';
import { generateText, parseGeminiJsonResponse, isApiKeySet } from '../services/geminiService';
import { WeeklyMealPlan, GroceryListCategory, GroceryItem, UserProfile, WithUserProfile, Task, TaskStatus, KitchenInventoryItem, Recipe, RecipeIngredient, RealisticShoppingListItem, YouTubeRecommendation, CookingTechniqueItem } from '../types'; 
import { DIETARY_PREFERENCES_OPTIONS } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import { ClipboardListIcon, SparklesIcon, TrashIcon, PlusCircleIcon, BookOpenIcon, PencilIcon, ArchiveBoxArrowDownIcon, LightBulbIcon, VideoCameraIcon, PlayIcon, CameraIcon, XMarkIcon } from './Icons'; 
import Modal from './Modal';

const ensureGroceryItemIds = (categories: GroceryListCategory | null): GroceryListCategory | null => {
  if (!categories) return null;
  const newCategories: GroceryListCategory = {};
  for (const category in categories) {
    newCategories[category] = categories[category].map((item, index) => 
      typeof item === 'string' 
      ? { id: `${category}-${index}-${Date.now()}`, name: item, have: false } 
      : { ...item, id: item.id || `${category}-${index}-${Date.now()}`, have: item.have || false }
    );
  }
  return newCategories;
};

interface DietarySectionProps extends WithUserProfile {
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { status?: TaskStatus }) => void;
  kitchenInventory: KitchenInventoryItem[];
  onUpdateKitchenInventory: (inventory: KitchenInventoryItem[]) => void;
  onSaveRecipeToBook: (recipe: Recipe, source?: string) => void; 
  onSaveCurrentMealPlan: (plan: WeeklyMealPlan, details: { numDays: number; preferences: string; customPreference: string; calories: number }) => void;
}

const inputStyleDark = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const selectStyleDark = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white border-gray-600 focus:ring-primary focus:border-primary";
const labelStyle = "block text-sm font-medium text-gray-700";
const inputStyleLight = "mt-0.5 w-full p-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-800 placeholder-gray-500 focus:ring-primary focus:border-primary";
const recipeSaveSuccessMessageInitial = ''; 
const IMAGE_PLACEHOLDER_STRING = "__HAS_IMAGE_PLACEHOLDER__";

function cleanRecipeDescriptionField(recipe: Recipe): Recipe {
    const cleanedRecipe = { ...recipe };
    if (cleanedRecipe.description && typeof cleanedRecipe.description !== 'string') {
        const descObj = cleanedRecipe.description as any;
        if (typeof descObj === 'object' && descObj !== null && 
            'description' in descObj && typeof descObj.description === 'string') {
            cleanedRecipe.description = descObj.description;
        } else if (typeof descObj === 'object' && descObj !== null &&
                   'name' in descObj && typeof descObj.name === 'string' &&
                   (!('description' in descObj) || typeof descObj.description !== 'string')) {
            cleanedRecipe.description = `Description (from nested name): ${descObj.name}`;
        } else {
            cleanedRecipe.description = "[Invalid/complex description format received]";
        }
    }
    return cleanedRecipe;
}


const DietarySection: React.FC<DietarySectionProps> = ({ 
    userProfile, 
    onAddTask, 
    kitchenInventory, 
    onUpdateKitchenInventory, 
    onSaveRecipeToBook, 
    onSaveCurrentMealPlan,
}) => {
  const [preferences, setPreferences] = useState<string>('');
  const [customPreference, setCustomPreference] = useState<string>('');
  const [numDays, setNumDays] = useState<number>(7);
  const [calories, setCalories] = useState<number>(2000);
  
  const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryListCategory | null>(null);
  
  const [isLoadingMealPlan, setIsLoadingMealPlan] = useState<boolean>(false);
  const [isLoadingGroceryList, setIsLoadingGroceryList] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); 

  const [copycatDishName, setCopycatDishName] = useState('');
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false); 
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null); 
  const [recipeError, setRecipeError] = useState<string | null>(null); 
  const [requestedServings, setRequestedServings] = useState(''); 
  const [isLoadingServingsUpdate, setIsLoadingServingsUpdate] = useState(false);
  const [recipeSaveSuccessMessage, setRecipeSaveSuccessMessage] = useState(recipeSaveSuccessMessageInitial);
  
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [recipeShoppingListForModal, setRecipeShoppingListForModal] = useState<RealisticShoppingListItem[]>([]);
  const [isLoadingRealisticList, setIsLoadingRealisticList] = useState(false);
  const [recipeShoppingListNotification, setRecipeShoppingListNotification] = useState<string | null>(null);


  const [isEditingMealPlan, setIsEditingMealPlan] = useState(false);
  const [mealPlanEditPrompt, setMealPlanEditPrompt] = useState('');
  const [isLoadingMealPlanEdit, setIsLoadingMealPlanEdit] = useState(false);

  const [shoppingListItemForAlternatives, setShoppingListItemForAlternatives] = useState<RealisticShoppingListItem | null>(null);
  const [alternativeSuggestionsForShoppingItem, setAlternativeSuggestionsForShoppingItem] = useState<string | null>(null);
  const [isLoadingAlternativesForShoppingItem, setIsLoadingAlternativesForShoppingItem] = useState(false);
  const [alternativesErrorForShoppingItem, setAlternativesErrorForShoppingItem] = useState<string | null>(null);
  const [showAlternativesForShoppingItemModal, setShowAlternativesForShoppingItemModal] = useState(false);
  const [isLoadingApplyAlternative, setIsLoadingApplyAlternative] = useState(false);

  useEffect(() => {
    if (userProfile?.dietaryRestrictions && DIETARY_PREFERENCES_OPTIONS.includes(userProfile.dietaryRestrictions)) {
      setPreferences(userProfile.dietaryRestrictions);
    } else if (userProfile?.dietaryRestrictions) {
      setPreferences("Other");
      setCustomPreference(userProfile.dietaryRestrictions);
    }
  }, [userProfile]);
  
  const resetPlannerState = useCallback(() => {
    if (userProfile?.dietaryRestrictions && DIETARY_PREFERENCES_OPTIONS.includes(userProfile.dietaryRestrictions)) {
        setPreferences(userProfile.dietaryRestrictions);
        setCustomPreference('');
    } else if (userProfile?.dietaryRestrictions) {
        setPreferences("Other");
        setCustomPreference(userProfile.dietaryRestrictions);
    } else {
        setPreferences('');
        setCustomPreference('');
    }
    setNumDays(7);
    setCalories(2000);
    setMealPlan(null);
    setGroceryList(null);
    setError(null);
    setIsEditingMealPlan(false);
    setMealPlanEditPrompt('');
    setGeneratedRecipe(null);
    setCopycatDishName('');
    setRecipeError(null);
    setRequestedServings('');
    setRecipeSaveSuccessMessage('');
    setRecipeShoppingListNotification(null);
  }, [userProfile]);

  const handleGenerateMealPlan = useCallback(async (isNewPlanRequest = false) => {
    if (!isApiKeySet()) {
      setError("API Key not configured. Please set it up to use AI features.");
      return;
    }
    setError(null);
    setIsLoadingMealPlan(true);
    if (isNewPlanRequest || !mealPlan) { 
        setMealPlan(null);
        setGroceryList(null);
        setIsEditingMealPlan(false);
        setMealPlanEditPrompt('');
    }

    let finalPreferences = preferences === "Other" ? customPreference : preferences;
    if (!finalPreferences.trim() && preferences !== "None") {
      setError("Please specify your dietary preferences or select 'None'.");
      setIsLoadingMealPlan(false);
      return;
    }
    if (finalPreferences === "None") finalPreferences = "General healthy eating";
    
    const prompt = `Generate a detailed ${numDays}-day meal plan. This is for the user's AI-powered dietary journal to help them achieve their health goals.
Preferences: ${finalPreferences}.
Target daily calories: approximately ${calories}.
Structure the output as JSON. Each key should be a day (e.g., "Day 1").
Each day should be an object with keys "Breakfast", "Lunch", "Dinner", and "Snacks".
Values should be meal descriptions strings.
Example: { "Day 1": { "Breakfast": "Oatmeal with berries and nuts", "Lunch": "Chicken salad sandwich on whole wheat", "Dinner": "Salmon with roasted asparagus and quinoa", "Snacks": "Apple slices with almond butter" } }`;

    try {
      const responseText = await generateText(prompt, "You are a helpful dietary planning assistant creating plans for an AI journal.", true, userProfile);
      const parsedPlan = parseGeminiJsonResponse<WeeklyMealPlan>(responseText);
      if (parsedPlan) {
        setMealPlan(parsedPlan);
      } else {
        setError("Failed to parse meal plan from AI response. The response might be malformed. Raw: " + responseText.substring(0, 500) + "...");
        setMealPlan(null);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate meal plan. " + (err as Error).message);
    } finally {
      setIsLoadingMealPlan(false);
    }
  }, [preferences, customPreference, numDays, calories, userProfile, mealPlan]);

  const handleGenerateGroceryList = useCallback(async () => {
    if (!isApiKeySet()) {
      setError("API Key not configured.");
      return;
    }
    if (!mealPlan) {
      setError("Please generate a meal plan first.");
      return;
    }
    setError(null);
    setIsLoadingGroceryList(true);
    setGroceryList(null); 

    const prompt = `Based on the following meal plan, generate a categorized grocery list for the user's AI dietary journal.
Meal Plan: ${JSON.stringify(mealPlan)}.
Structure the output as JSON. Each key should be a category (e.g., "Produce", "Protein", "Dairy & Alternatives", "Pantry", "Frozen", "Spices & Condiments", "Beverages", "Other").
Each category value should be an array of strings representing grocery items. Include estimated quantities if appropriate but focus on the item names.
Example: { "Produce": ["Apples (3)", "Spinach (1 bag)", "Berries (1 punnet)"], "Protein": ["Chicken breast (2 lbs)", "Salmon fillet (1 lb)"] }`;

    try {
      const responseText = await generateText(prompt, "You are an efficient grocery list creator for an AI journal.", true, userProfile);
      const parsedList = parseGeminiJsonResponse<any>(responseText); 
      
      if (parsedList) {
        const standardizedList: GroceryListCategory = {};
        Object.keys(parsedList).forEach(category => {
          if (Array.isArray(parsedList[category])) {
            standardizedList[category] = parsedList[category].map((item: string | GroceryItem, index: number) => {
              if (typeof item === 'string') {
                return { id: `${category}-item-${index}-${Date.now()}`, name: item, have: false };
              }
              return { ...item, id: item.id || `${category}-item-${index}-${Date.now()}`, have: item.have || false };
            });
          } else {
             console.warn(`Category ${category} in parsed list is not an array:`, parsedList[category]);
             standardizedList[category] = [];
          }
        });
        setGroceryList(ensureGroceryItemIds(standardizedList));
      } else {
        setError("Failed to parse grocery list from AI response. The response might be malformed. Raw: " + responseText.substring(0, 500) + "...");
        setGroceryList(null);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate grocery list. " + (err as Error).message);
    } finally {
      setIsLoadingGroceryList(false);
    }
  }, [mealPlan, userProfile]);

  const toggleHaveItem = useCallback((categoryId: string, itemId: string) => {
    setGroceryList(prevList => {
      if (!prevList) return null;
      const newList = { ...prevList };
      newList[categoryId] = newList[categoryId].map(item =>
        item.id === itemId ? { ...item, have: !item.have } : item
      );
      return newList;
    });
  }, []);
  
  const handleOrderDeliveryFromMealPlanList = useCallback(() => {
    const itemsToOrder: GroceryItem[] = [];
    if (groceryList) {
      Object.values(groceryList).forEach(categoryItems => {
        categoryItems.forEach(item => {
          if (!item.have) {
            itemsToOrder.push(item);
          }
        });
      });
    }
    if (itemsToOrder.length > 0) {
       onAddTask({
        title: "Grocery Delivery Draft (from Meal Plan)",
        description: `Request for grocery delivery. Items: ${itemsToOrder.map(i => i.name + (i.quantity ? ` (${i.quantity})` : '')).join(', ')}. Based on generated grocery list for user's AI journal.`,
        linkedContent: JSON.stringify(itemsToOrder),
        sourceSection: "Dietary",
        status: TaskStatus.DRAFT,
      });
      alert(`Task DRAFT created for delivery of ${itemsToOrder.length} items. Find it in "My Tasks" (Drafts) to edit and post to Marketplace.`);
      resetPlannerState(); 
    } else {
      alert("No items marked as needed for delivery.");
    }
  }, [groceryList, onAddTask, resetPlannerState]);

  const handleSaveCurrentMealPlanToJournal = useCallback(() => {
    if (!mealPlan) {
        alert("Please generate a meal plan first.");
        return;
    }
    const finalPrefs = preferences === "Other" ? customPreference : preferences;
    onSaveCurrentMealPlan(mealPlan, { numDays, preferences: finalPrefs, customPreference, calories });
    resetPlannerState(); 
  }, [mealPlan, preferences, customPreference, numDays, calories, onSaveCurrentMealPlan, resetPlannerState]);

  const handleApplyAIEditsToPlan = useCallback(async () => {
    if (!mealPlan || !mealPlanEditPrompt.trim() || !isApiKeySet()) {
        setError("Cannot edit plan. Ensure a plan exists, an edit description is provided, and API key is set.");
        return;
    }
    setIsLoadingMealPlanEdit(true);
    setError(null);

    let finalPreferences = preferences === "Other" ? customPreference : preferences;
    if (finalPreferences === "None") finalPreferences = "General healthy eating";

    const editPrompt = `The user wants to modify their current ${numDays}-day meal plan.
Current Meal Plan:
${JSON.stringify(mealPlan)}

User's requested modifications:
"${mealPlanEditPrompt}"

Please generate an updated ${numDays}-day meal plan that incorporates these changes while adhering to the original preferences: ${finalPreferences} and target daily calories: approximately ${calories}.
Structure the output as JSON, same as the original plan format. If a modification is unclear or conflicts heavily, try your best to accommodate or explain briefly within the meal descriptions if necessary.
Example: { "Day 1": { "Breakfast": "Oatmeal with berries (modified)", "Lunch": "Chicken salad sandwich (no nuts)", "Dinner": "Vegan Tofu Scramble", "Snacks": "Apple slices" } }`;
    
    try {
        const responseText = await generateText(editPrompt, "You are a helpful dietary planning assistant, modifying an existing plan.", true, userProfile);
        const parsedPlan = parseGeminiJsonResponse<WeeklyMealPlan>(responseText);
        if (parsedPlan) {
            setMealPlan(parsedPlan);
            setGroceryList(null); 
            setIsEditingMealPlan(false);
            setMealPlanEditPrompt('');
        } else {
            setError("Failed to parse edited meal plan. AI response might be malformed. Raw: " + responseText.substring(0, 300) + "...");
        }
    } catch (err: any) {
        setError("Error editing meal plan: " + (err as Error).message);
    } finally {
        setIsLoadingMealPlanEdit(false);
    }
  }, [mealPlan, mealPlanEditPrompt, preferences, customPreference, numDays, calories, userProfile]);

  const commonRecipePromptStructure = `
Structure the output as a JSON object with the following keys: 
"name" (string, the dish name), 
"description" (string, brief overview),
"ingredients" (array of objects, each with "name": string, "quantity": string (e.g., "2", "1/2"), "unit": string (e.g., "cups", "tbsp", "cloves", "medium", "to taste")),
"instructions" (array of strings, each string is a step),
"prepTime" (string, e.g., "15 minutes"),
"cookTime" (string, e.g., "30 minutes"),
"servings" (string, e.g., "4 servings"),
"cookingTechniques" (array of objects, each object should have "techniqueName": string, "description": string (beginner-friendly explanation with chef's tips), and optionally "youtubeRecommendations": an array of 1-2 objects, each with "title": string, "url": string (full YouTube URL of a relevant tutorial for THIS specific technique)),
"youtubeRecommendations" (array of objects for the OVERALL DISH, each with "title": string, "url": string (full YouTube URL), "videoId": string (YouTube video ID) - aim for 3 recommendations for the main dish).
The recipe may or may not include an "imageUrl" (string, base64 encoded). If you generate an image, include it.
If a specific quantity or unit is not applicable (e.g. "salt to taste"), unit can be "to taste" or similar.
Example for cookingTechniques: 
"cookingTechniques": [
  { 
    "techniqueName": "Sautéing", 
    "description": "This involves cooking food quickly in a small amount of fat over medium-high heat. Chef's tip: Don't overcrowd the pan to ensure even browning.",
    "youtubeRecommendations": [
      {"title": "How to Sauté Perfectly", "url": "https://www.youtube.com/watch?v=technique_sauté"}
    ]
  }
]`;

  const handleGetCopycatRecipe = useCallback(async () => {
    if (!isApiKeySet()) {
        setRecipeError("API Key not set.");
        return;
    }
    if (!copycatDishName.trim()) {
        setRecipeError("Please enter a dish name.");
        return;
    }
    setIsLoadingRecipe(true);
    setGeneratedRecipe(null);
    setRecipeError(null);
    setRecipeShoppingListForModal([]);
    setRequestedServings('');
    setRecipeSaveSuccessMessage('');
    setRecipeShoppingListNotification(null);

    const prompt = `Provide a detailed recipe for "${copycatDishName}". 
${commonRecipePromptStructure}
Example: { "name": "Spaghetti Carbonara", "description": "A classic Roman pasta dish.", "ingredients": [ {"name": "Spaghetti", "quantity": "400", "unit": "g"} ], "instructions": ["Cook spaghetti..."], "prepTime": "10 minutes", "cookTime": "15 minutes", "servings": "4", "cookingTechniques": [{"techniqueName": "Boiling pasta", "description": "Use plenty of salted water...", "youtubeRecommendations": [{"title": "Perfect Pasta Boiling", "url": "https://youtube.com/pasta_boil_example"}]}], "youtubeRecommendations": [{"title": "Authentic Carbonara", "url": "https://www.youtube.com/watch?v=abcdef123", "videoId": "abcdef123"}] }`;

    try {
        const responseText = await generateText(prompt, "You are a recipe generation expert and YouTube video curator.", true, userProfile);
        const parsedRecipe = parseGeminiJsonResponse<Recipe>(responseText);
        if (parsedRecipe && parsedRecipe.ingredients && parsedRecipe.instructions) {
            const cleanedRecipe = cleanRecipeDescriptionField(parsedRecipe);
            setGeneratedRecipe(cleanedRecipe);
            setRequestedServings(cleanedRecipe.servings || ''); 
        } else {
            setRecipeError("Failed to parse recipe. AI response might be incomplete or malformed. Raw: " + responseText.substring(0, 300));
            console.error("Malformed recipe JSON:", responseText);
        }
    } catch (err: any) {
        setRecipeError("Error generating recipe: " + (err as Error).message);
    } finally {
        setIsLoadingRecipe(false);
    }
  }, [copycatDishName, userProfile, commonRecipePromptStructure]);

  const handleFeelingLuckyRecipe = useCallback(async () => {
    if (!isApiKeySet()) {
        setRecipeError("API Key not set.");
        return;
    }
    setIsLoadingRecipe(true);
    setGeneratedRecipe(null);
    setRecipeError(null);
    setRecipeShoppingListForModal([]);
    setRequestedServings('');
    setCopycatDishName(''); 
    setRecipeSaveSuccessMessage('');
    setRecipeShoppingListNotification(null);

    const prompt = `Generate a random, interesting, and delicious recipe that would appeal to culinary meal preppers. Please ensure this recipe is unique and different from common or previously suggested recipes to provide variety. This could be a popular dish with a healthy or make-ahead twist, a unique ethnic recipe, or something trendy and flavorful. Provide a complete recipe.
${commonRecipePromptStructure}
Example: { "name": "Spicy Mango Chicken Stir-fry", "description": "A vibrant stir-fry.", "ingredients": [ {"name": "Chicken Breast", "quantity": "1", "unit": "lb"}], "instructions": ["Dice chicken..."], "prepTime": "20 minutes", "cookTime": "15 minutes", "servings": "4", "cookingTechniques": [{"techniqueName": "Stir-frying", "description": "Cook quickly...", "youtubeRecommendations": [{"title": "Master Stir-fry", "url":"https://youtube.com/stir_fry_masterclass"}]}], "youtubeRecommendations": [{"title": "Easy Stir Fry", "url": "https://www.youtube.com/watch?v=xyzabc456", "videoId": "xyzabc456"}] }`;

    try {
        const responseText = await generateText(prompt, "You are a creative recipe generation expert and YouTube video curator, specializing in meal-prep friendly dishes.", true, userProfile, 0.9); // Higher temperature for more randomness
        const parsedRecipe = parseGeminiJsonResponse<Recipe>(responseText);
        if (parsedRecipe && parsedRecipe.name && parsedRecipe.ingredients && parsedRecipe.instructions) {
            const cleanedRecipe = cleanRecipeDescriptionField(parsedRecipe);
            setGeneratedRecipe(cleanedRecipe);
            setRequestedServings(cleanedRecipe.servings || '');
            setCopycatDishName(cleanedRecipe.name); 
        } else {
            setRecipeError("Failed to parse 'I'm Feeling Lucky' recipe. AI response might be incomplete or malformed. Raw: " + responseText.substring(0, 300));
            console.error("Malformed lucky recipe JSON:", responseText);
        }
    } catch (err: any) {
        setRecipeError("Error generating 'I'm Feeling Lucky' recipe: " + (err as Error).message);
    } finally {
        setIsLoadingRecipe(false);
    }
  }, [userProfile, commonRecipePromptStructure]);


  const handleUpdateServingsAI = useCallback(async () => {
    if (!generatedRecipe || !requestedServings.trim() || !isApiKeySet()) {
        setRecipeError("Original recipe missing, new servings not specified, or API key not set.");
        return;
    }
    setIsLoadingServingsUpdate(true);
    setRecipeError(null);

    const originalImageUrl = generatedRecipe.imageUrl; 
    const recipeContextForAI = {
      ...generatedRecipe,
      imageUrl: generatedRecipe.imageUrl ? IMAGE_PLACEHOLDER_STRING : undefined,
      cookingTechniques: generatedRecipe.cookingTechniques?.map(ct => ({
        ...ct, 
        youtubeRecommendations: ct.youtubeRecommendations || [] 
      })) || [],
      youtubeRecommendations: generatedRecipe.youtubeRecommendations || [],
    };
    
    const prompt = `The user wants to update the servings for the following recipe:
Original Recipe (JSON - NOTE: if 'imageUrl' is '${IMAGE_PLACEHOLDER_STRING}', it means an image exists and should be preserved by keeping the 'imageUrl' field in your output JSON with the same placeholder value if no changes to the image are requested):
${JSON.stringify(recipeContextForAI)}

New requested servings: "${requestedServings}"

Please recalculate the ingredient quantities for the new serving size.
Adjust instructions and cooking techniques if necessary. Try to maintain the core essence of the recipe.
Output the *complete updated recipe* in the same JSON format as the original (keys: "name", "description", "ingredients", "instructions", "cookingTechniques" (array of objects with "techniqueName", "description", optional "youtubeRecommendations"), "youtubeRecommendations" (for overall dish), "prepTime", "cookTime", "servings", "imageUrl").
The "servings" field in the output JSON should reflect the new requested servings. 
Ensure cookingTechniques are relevant and clear, preserving their structure including any existing technique-specific YouTube recommendations.
Crucially, include the "youtubeRecommendations" field (for the overall dish) in your JSON output, preserving the original recommendations. If an image existed, preserve the "imageUrl" field with '${IMAGE_PLACEHOLDER_STRING}'.`;

    try {
        const responseText = await generateText(prompt, "You are a recipe adjustment expert. Update ingredients, instructions, and cooking techniques for new serving size. Preserve YouTube recommendations and image presence.", true, userProfile);
        let parsedRecipe = parseGeminiJsonResponse<Recipe>(responseText);
        if (parsedRecipe && parsedRecipe.ingredients && parsedRecipe.instructions) {
            parsedRecipe = cleanRecipeDescriptionField(parsedRecipe);
            if (parsedRecipe.imageUrl === IMAGE_PLACEHOLDER_STRING) {
                parsedRecipe.imageUrl = originalImageUrl;
            }

            if (!parsedRecipe.youtubeRecommendations && generatedRecipe.youtubeRecommendations) {
                parsedRecipe.youtubeRecommendations = generatedRecipe.youtubeRecommendations;
            }
            parsedRecipe.cookingTechniques = (parsedRecipe.cookingTechniques || generatedRecipe.cookingTechniques || []).map(ct => ({
                techniqueName: ct.techniqueName || "Unknown Technique",
                description: ct.description || "No description provided.",
                youtubeRecommendations: ct.youtubeRecommendations || []
            }));

            setGeneratedRecipe(parsedRecipe); 
            setRecipeError(null);
        } else {
            setRecipeError("AI failed to update servings. Response might be malformed. Raw: " + responseText.substring(0, 300));
        }
    } catch (err: any) {
        setRecipeError("Error updating servings: " + (err as Error).message);
    } finally {
        setIsLoadingServingsUpdate(false);
    }
  }, [generatedRecipe, requestedServings, userProfile]);

  const updateRecipeShoppingListBasedOnRecipe = useCallback(async (recipeForShoppingList: Recipe) => {
    if (!recipeForShoppingList || !isApiKeySet()) {
        setRecipeError("Cannot generate shopping list: Recipe data missing or API key not set.");
        setRecipeShoppingListForModal([]);
        setRecipeShoppingListNotification(null);
        return;
    }
    setIsLoadingRealisticList(true);
    setRecipeError(null); 
    setRecipeShoppingListNotification(null);

    const ingredientsText = recipeForShoppingList.ingredients.map(ing => `${ing.name} (${ing.quantity || ''} ${ing.unit || ''})`).join('; ');
    const realisticListPrompt = `Given this list of recipe ingredients: "${ingredientsText}".
    Servings specified for this recipe: ${recipeForShoppingList.servings || 'Not specified, assume 2-4'}.
    Convert each ingredient into a realistic item a person would buy at a grocery store, considering the servings.
    Also, categorize each item into common grocery sections (e.g., "Produce", "Dairy & Alternatives", "Protein", "Pantry Staples", "Frozen", "Spices & Condiments", "Beverages", "Other").
    Output this as a JSON array of objects. Each object should have:
    "originalItemName": (string), "originalQuantityInfo": (string), "realisticItemName": (string), "realisticQuantity": (string), "category": (string), "notes": (string, optional).
    Example for "1 egg (for 2 servings); 1/2 cup all-purpose flour":
    [
        { "originalItemName": "egg", "originalQuantityInfo": "1", "realisticItemName": "Large Eggs", "realisticQuantity": "1 half-dozen or 1 dozen", "category": "Dairy & Alternatives", "notes": "Based on 2 servings." },
        { "originalItemName": "all-purpose flour", "originalQuantityInfo": "1/2 cup", "realisticItemName": "All-Purpose Flour", "realisticQuantity": "1 bag (approx 2 lbs or 1kg)", "category": "Pantry Staples", "notes": "Smallest common bag size." }
    ]`;
    
    try {
        const realisticListText = await generateText(realisticListPrompt, "You are a shopping list assistant, translating recipe ingredients to shopping quantities, considering servings, and categorizing items.", true, userProfile);
        const parsedRealisticList = parseGeminiJsonResponse<Omit<RealisticShoppingListItem, 'id' | 'have' | 'selected'>[]>(realisticListText);

        if (parsedRealisticList && Array.isArray(parsedRealisticList)) {
            let itemsFoundInInventoryCount = 0;
            const shoppingListItems = parsedRealisticList.map((item, index) => {
                const foundInInventory = kitchenInventory.find(invItem => 
                    invItem.name.toLowerCase().includes(item.realisticItemName.toLowerCase()) ||
                    item.realisticItemName.toLowerCase().includes(invItem.name.toLowerCase()) ||
                    (item.originalItemName && (invItem.name.toLowerCase().includes(item.originalItemName.toLowerCase()) || item.originalItemName.toLowerCase().includes(invItem.name.toLowerCase())))
                );
                if (foundInInventory) itemsFoundInInventoryCount++;
                return { 
                    ...item, 
                    id: `rsli-upd-${Date.now()}-${index}`,
                    have: !!foundInInventory, 
                    selected: !foundInInventory 
                };
            });
            setRecipeShoppingListForModal(shoppingListItems);
            if (itemsFoundInInventoryCount > 0) {
                setRecipeShoppingListNotification(`Compared with your inventory: ${itemsFoundInInventoryCount} item(s) you likely have are unselected.`);
            } else {
                setRecipeShoppingListNotification("Shopping list ready. We checked your inventory, and it seems you need all these items.");
            }
        } else {
            setRecipeError("AI couldn't update the realistic shopping list. Raw: " + realisticListText.substring(0,200));
            setRecipeShoppingListNotification(null);
            const fallbackShoppingList = recipeForShoppingList.ingredients.map((ing, index) => {
                 const foundInInventory = kitchenInventory.find(invItem => 
                    invItem.name.toLowerCase().includes(ing.name.toLowerCase()) || 
                    ing.name.toLowerCase().includes(invItem.name.toLowerCase())
                );
                return {
                    id: `fallback-rsli-upd-${Date.now()}-${index}`,
                    originalItemName: ing.name,
                    originalQuantityInfo: `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
                    realisticItemName: ing.name, 
                    realisticQuantity: `${ing.quantity || ''} ${ing.unit || ''}`.trim(), 
                    category: "Uncategorized",
                    have: !!foundInInventory,
                    selected: !foundInInventory
                };
            });
            setRecipeShoppingListForModal(fallbackShoppingList);
        }
    } catch (err: any) {
        setRecipeError("Error updating realistic shopping list: " + (err as Error).message);
        setRecipeShoppingListNotification(null);
         const fallbackShoppingList = recipeForShoppingList.ingredients.map((ing, index) => {
            const foundInInventory = kitchenInventory.find(invItem => 
                invItem.name.toLowerCase().includes(ing.name.toLowerCase()) || 
                ing.name.toLowerCase().includes(invItem.name.toLowerCase())
            );
            return {
                id: `error-rsli-upd-${Date.now()}-${index}`,
                originalItemName: ing.name,
                originalQuantityInfo: `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
                realisticItemName: ing.name,
                realisticQuantity: `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
                category: "Uncategorized",
                have: !!foundInInventory,
                selected: !foundInInventory
            };
        });
        setRecipeShoppingListForModal(fallbackShoppingList);
    } finally {
        setIsLoadingRealisticList(false);
    }
  }, [userProfile, kitchenInventory, isApiKeySet]); 
  
  const handleOpenShoppingListModal = useCallback(async () => {
    if (!generatedRecipe) return; 
    setShowShoppingListModal(true); 
    setRecipeSaveSuccessMessage('');
    setRecipeError(null); 
    setRecipeShoppingListNotification(null);
    await updateRecipeShoppingListBasedOnRecipe(generatedRecipe);
  }, [generatedRecipe, updateRecipeShoppingListBasedOnRecipe]);

  const toggleRecipeShoppingListItem = useCallback((itemId: string) => {
    setRecipeShoppingListForModal(prev => prev.map(item => item.id === itemId ? {...item, selected: !item.selected } : item));
  }, []);

  const handleOrderMissingRecipeItems = useCallback(() => {
    const itemsToOrder = recipeShoppingListForModal.filter(item => item.selected && !item.have);
    if (itemsToOrder.length > 0) {
        onAddTask({
            title: `Grocery DRAFT for: ${generatedRecipe?.name || 'Copied Dish'}`,
            description: `Request for grocery delivery for recipe. Realistic items: ${itemsToOrder.map(i => `${i.realisticItemName} (${i.realisticQuantity})`).join(', ')}. Original recipe items might have been: ${itemsToOrder.map(i => `${i.originalItemName} (${i.originalQuantityInfo})`).join('; ')}. Based on a recipe for ${generatedRecipe?.servings || 'N/A'} servings.`,
            linkedContent: JSON.stringify({recipeName: generatedRecipe?.name, servings: generatedRecipe?.servings, items: itemsToOrder}),
            sourceSection: "Dietary (Copycat)",
            status: TaskStatus.DRAFT,
            sourceRecipeId: undefined, 
        });
        alert(`Task DRAFT created to order ${itemsToOrder.length} missing ingredients for "${generatedRecipe?.name}". Find it in "My Tasks" to post to Marketplace.`);
        setShowShoppingListModal(false);
        setGeneratedRecipe(null);
        setCopycatDishName('');
        setRequestedServings('');
        setRecipeSaveSuccessMessage('');
        setRecipeShoppingListNotification(null);
    } else {
        alert("No missing items selected for order.");
    }
  }, [recipeShoppingListForModal, generatedRecipe, onAddTask]);

  const handleSaveGeneratedRecipeToBookLocal = useCallback(() => {
    if (generatedRecipe) {
        // Frontend validation: check if generatedRecipe is a valid JSON object and has required fields
        try {
            const recipeStr = JSON.stringify(generatedRecipe);
            const parsed = JSON.parse(recipeStr);
            // Basic required fields check (customize as needed)
            if (!parsed.name || !parsed.ingredients || !Array.isArray(parsed.ingredients)) {
                setRecipeError("Recipe is missing required fields or is not in valid format. Please review before saving.");
                return;
            }
        } catch (e) {
            setRecipeError("Recipe is not valid JSON and cannot be saved. Please review before saving.");
            return;
        }
        onSaveRecipeToBook(generatedRecipe, "Copycat AI");
        setRecipeShoppingListNotification(null); // Clear shopping list notification
        setRecipeSaveSuccessMessage(`Recipe "${generatedRecipe.name}" saved to your Journal & Recipes!`);
        setRecipeError(null);
        setGeneratedRecipe(null);
        setCopycatDishName('');
        setRequestedServings('');
        setTimeout(() => setRecipeSaveSuccessMessage(''), 5000);
    }
  }, [generatedRecipe, onSaveRecipeToBook]);
  
  const handleSuggestAlternativesAI = useCallback(async (
    shoppingListItem: RealisticShoppingListItem | null,
    currentRecipeForContext: Recipe | null 
  ) => {
    if (!shoppingListItem || !currentRecipeForContext || !isApiKeySet()) {
      setAlternativesErrorForShoppingItem("Cannot get alternatives. Missing item, recipe context, or API key.");
      setIsLoadingAlternativesForShoppingItem(false);
      return;
    }
    setIsLoadingAlternativesForShoppingItem(true);
    setAlternativesErrorForShoppingItem(null);
    setAlternativeSuggestionsForShoppingItem(null);

    const recipeContextForAlternatives = {
        ...currentRecipeForContext,
        imageUrl: currentRecipeForContext.imageUrl ? IMAGE_PLACEHOLDER_STRING : undefined,
        cookingTechniques: (currentRecipeForContext.cookingTechniques || []).map(ct => ({
          techniqueName: ct.techniqueName,
          description: ct.description,
          youtubeRecommendations: ct.youtubeRecommendations || []
        })),
        youtubeRecommendations: currentRecipeForContext.youtubeRecommendations || []
    };


    const prompt = `The user is considering an alternative for the ingredient "${shoppingListItem.originalItemName}" (which was listed on their shopping list as "${shoppingListItem.realisticItemName} - ${shoppingListItem.realisticQuantity}") for the following recipe:
Recipe Context (JSON - NOTE: if 'imageUrl' is '${IMAGE_PLACEHOLDER_STRING}', it means an image exists):
${JSON.stringify(recipeContextForAlternatives)}

Please suggest 1-2 suitable alternatives for "${shoppingListItem.originalItemName}".
For each alternative:
1. State the alternative ingredient.
2. Specify any change in quantity needed compared to the original recipe's quantity for "${shoppingListItem.originalItemName}".
3. Briefly explain the potential impact on the dish's flavor, texture, or cooking process.

If there are no good alternatives or if substituting "${shoppingListItem.originalItemName}" is highly discouraged for this specific recipe, clearly state that and explain why.
Your response should be concise and directly address the substitution.`;

    try {
      const responseText = await generateText(prompt, "You are a helpful culinary assistant providing ingredient substitution advice.", false, userProfile);
      setAlternativeSuggestionsForShoppingItem(responseText);
    } catch (err: any) {
      setAlternativesErrorForShoppingItem("Error suggesting alternatives: " + (err as Error).message);
      setAlternativeSuggestionsForShoppingItem("Sorry, I couldn't fetch alternatives at this time.");
    } finally {
      setIsLoadingAlternativesForShoppingItem(false);
    }
  }, [userProfile, isApiKeySet]); 

  const handleOpenAlternativesForShoppingItemModal = useCallback((item: RealisticShoppingListItem) => {
    if (!generatedRecipe) {
        setAlternativesErrorForShoppingItem("Cannot process alternatives: The main recipe context (Copycat Recipe) is missing. Please generate or re-generate the main recipe first.");
        setShowAlternativesForShoppingItemModal(true);
        setIsLoadingAlternativesForShoppingItem(false); 
        setShoppingListItemForAlternatives(item); 
        setAlternativeSuggestionsForShoppingItem(null); 
        return;
    }
    setShoppingListItemForAlternatives(item);
    setShowAlternativesForShoppingItemModal(true);
    setAlternativeSuggestionsForShoppingItem(null);
    setAlternativesErrorForShoppingItem(null);
    handleSuggestAlternativesAI(item, generatedRecipe); 
  }, [generatedRecipe, handleSuggestAlternativesAI]); 

  const handleApplyAlternativeAI = useCallback(async () => {
    if (!shoppingListItemForAlternatives || !alternativeSuggestionsForShoppingItem || !generatedRecipe || !isApiKeySet()) {
        setAlternativesErrorForShoppingItem("Cannot apply alternative. Missing original item, AI suggestion, recipe context, or API key.");
        return;
    }
    setIsLoadingApplyAlternative(true);
    setAlternativesErrorForShoppingItem(null);

    const originalImageUrl = generatedRecipe.imageUrl;
    const recipeContextForApplyingAlternative = {
        ...generatedRecipe,
        imageUrl: generatedRecipe.imageUrl ? IMAGE_PLACEHOLDER_STRING : undefined,
        cookingTechniques: (generatedRecipe.cookingTechniques || []).map(ct => ({
          techniqueName: ct.techniqueName,
          description: ct.description,
          youtubeRecommendations: ct.youtubeRecommendations || []
        })),
        youtubeRecommendations: generatedRecipe.youtubeRecommendations || [],
    };

    const prompt = `Given the original recipe (JSON - NOTE: if 'imageUrl' is '${IMAGE_PLACEHOLDER_STRING}', it means an image exists and should be preserved by keeping the 'imageUrl' field in your output JSON with the same placeholder value if no changes to the image are requested):
${JSON.stringify(recipeContextForApplyingAlternative)}

The user wants to substitute the ingredient "${shoppingListItemForAlternatives.originalItemName}".
The AI previously suggested the following alternatives/advice:
"${alternativeSuggestionsForShoppingItem}"

Please incorporate the most suitable AI-suggested alternative for "${shoppingListItemForAlternatives.originalItemName}" into the original recipe.
This means you need to:
1.  Modify the ingredient list (name, quantity, unit of the substituted item).
2.  Adjust any relevant instructions if the substitution impacts cooking method or times.
3.  Update the "cookingTechniques" section if the substitution changes a core technique or introduces a new one. Ensure the techniques (including their descriptions and any existing technique-specific youtubeRecommendations) remain relevant and beginner-friendly. The structure is: "cookingTechniques": [{"techniqueName": "...", "description": "...", "youtubeRecommendations": [...]}, ...].
4.  Keep other ingredients, instructions, and existing cooking techniques as close to original as possible unless the substitution necessitates a change.
5.  The "servings", "prepTime", and "cookTime" might need slight adjustments based on the substitution; update them if necessary.

Output the *complete, updated recipe* in the exact same JSON format as the original (keys: "name", "description", "ingredients", "instructions", "cookingTechniques", "youtubeRecommendations", "prepTime", "cookTime", "servings", "imageUrl").
Ensure the "servings" field reflects the original servings unless the substitution logically changes it.
Crucially, include the "youtubeRecommendations" field (for overall dish) in your JSON output, preserving the original recommendations. If an image existed, preserve the "imageUrl" field with '${IMAGE_PLACEHOLDER_STRING}'.`;

    try {
        const responseText = await generateText(prompt, "You are a recipe modification expert. Update the recipe JSON to incorporate the suggested ingredient substitution and adjust cooking techniques. Preserve YouTube recommendations and image presence.", true, userProfile);
        let parsedRecipe = parseGeminiJsonResponse<Recipe>(responseText);
        if (parsedRecipe && parsedRecipe.ingredients && parsedRecipe.instructions) {
            parsedRecipe = cleanRecipeDescriptionField(parsedRecipe);
            if (parsedRecipe.imageUrl === IMAGE_PLACEHOLDER_STRING) {
                parsedRecipe.imageUrl = originalImageUrl;
            }

            if (!parsedRecipe.youtubeRecommendations && generatedRecipe.youtubeRecommendations) {
                parsedRecipe.youtubeRecommendations = generatedRecipe.youtubeRecommendations;
            }
             parsedRecipe.cookingTechniques = (parsedRecipe.cookingTechniques || generatedRecipe.cookingTechniques || []).map(ct => ({
                techniqueName: ct.techniqueName || "Unknown Technique",
                description: ct.description || "No description provided.",
                youtubeRecommendations: ct.youtubeRecommendations || []
            }));
            setGeneratedRecipe(parsedRecipe); 
            setRecipeError(null); 
            setRecipeSaveSuccessMessage("Recipe updated with AI's suggested alternative!");
            setShowAlternativesForShoppingItemModal(false); 

            if (showShoppingListModal) { 
              await updateRecipeShoppingListBasedOnRecipe(parsedRecipe);
            }
        } else {
            setAlternativesErrorForShoppingItem("AI failed to apply the alternative. Response might be malformed. Raw: " + responseText.substring(0, 300));
        }
    } catch (err: any) {
        setAlternativesErrorForShoppingItem("Error applying alternative: " + (err as Error).message);
    } finally {
        setIsLoadingApplyAlternative(false);
    }
  }, [shoppingListItemForAlternatives, alternativeSuggestionsForShoppingItem, generatedRecipe, userProfile, isApiKeySet, showShoppingListModal, updateRecipeShoppingListBasedOnRecipe]);

  // Helper to group shopping list items by category for rendering
  const getGroupedShoppingList = (list: RealisticShoppingListItem[]) => {
    return list.reduce((acc, item) => {
        const category = item.category || "Other";
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, RealisticShoppingListItem[]>);
  };

  const groupedRecipeShoppingList = getGroupedShoppingList(recipeShoppingListForModal);


  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-700 mb-1">Meal Planner & Recipe Hub</h3>
      <p className="text-sm text-neutral mb-4">
        Leverage AI to create meal plans and discover recipes. Save generated recipes to your "Journal & Recipes" section.
      </p>

      <div className="mb-8 pb-6 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">AI Meal Plan Generator</h4>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="preferences" className={labelStyle}>Dietary Preferences</label>
            <select
              id="preferences"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className={selectStyleDark}
            >
              <option value="">Select a preference...</option>
              {DIETARY_PREFERENCES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="Other">Other (Specify below)</option>
            </select>
          </div>
          {preferences === "Other" && (
            <div>
              <label htmlFor="customPreference" className={labelStyle}>Custom Preference</label>
              <input
                type="text"
                id="customPreference"
                value={customPreference}
                onChange={(e) => setCustomPreference(e.target.value)}
                className={inputStyleDark}
                placeholder="Specify your custom dietary preference"
              />
            </div>
          )}
           <div>
            <label htmlFor="numDays" className={labelStyle}>Number of Days</label>
            <input
              type="number"
              id="numDays"
              value={numDays}
              onChange={(e) => setNumDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              className={inputStyleDark}
            />
          </div>
          <div>
            <label htmlFor="calories" className={labelStyle}>Target Daily Calories</label>
            <input
              type="number"
              id="calories"
              value={calories}
              onChange={(e) => setCalories(Math.max(500, parseInt(e.target.value, 10) || 500))}
              min="500"
              step="50"
              className={inputStyleDark}
            />
          </div>
        </div>
        <button
          onClick={() => handleGenerateMealPlan(true)}
          disabled={isLoadingMealPlan || !isApiKeySet()}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
          aria-label="Generate new meal plan"
        >
          {isLoadingMealPlan ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <ClipboardListIcon className="w-5 h-5 mr-2" />}
          {mealPlan ? "Generate New Meal Plan" : "Generate Meal Plan"}
        </button>
        {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md" role="alert">{error}</p>}
        {!isApiKeySet() && <p className="mt-4 text-sm text-amber-700 bg-amber-100 p-3 rounded-md">API Key not set. AI features are disabled.</p>}
      </div>

      {mealPlan && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow animate-fadeIn mb-8 pb-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">Your Meal Plan:</h3>
            <div className="space-x-2">
                <button 
                    onClick={handleSaveCurrentMealPlanToJournal} 
                    title="Save current meal plan to journal"
                    className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                    aria-label="Save current meal plan to journal"
                >
                    <ArchiveBoxArrowDownIcon className="w-5 h-5 text-primary" />
                </button>
                <button 
                    onClick={() => setIsEditingMealPlan(prev => !prev)} 
                    title={isEditingMealPlan ? "Cancel Edit" : "Edit this Meal Plan with AI"}
                    className={`p-2 rounded-full transition-colors ${isEditingMealPlan ? 'bg-red-100 hover:bg-red-200' : 'bg-yellow-100 hover:bg-yellow-200'}`}
                    aria-label={isEditingMealPlan ? "Cancel Meal Plan Edit" : "Edit this Meal Plan with AI"}
                >
                    {isEditingMealPlan ? <TrashIcon className="w-5 h-5 text-red-600"/> : <PencilIcon className="w-5 h-5 text-yellow-600"/>}
                </button>
            </div>
          </div>
          {isEditingMealPlan && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <label htmlFor="mealPlanEditPrompt" className="block text-sm font-medium text-yellow-700 mb-1">Describe your changes:</label>
                <textarea
                    id="mealPlanEditPrompt"
                    rows={2}
                    value={mealPlanEditPrompt}
                    onChange={(e) => setMealPlanEditPrompt(e.target.value)}
                    className="w-full p-2 border border-yellow-400 rounded-md bg-white text-gray-800 placeholder-gray-500"
                    placeholder="e.g., 'Replace chicken with fish on Day 2', 'Make all lunches vegetarian', 'Lower carbs for dinners'"
                />
                <button
                    onClick={handleApplyAIEditsToPlan}
                    disabled={isLoadingMealPlanEdit || !mealPlanEditPrompt.trim()}
                    className="mt-2 px-4 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 disabled:opacity-60"
                >
                    {isLoadingMealPlanEdit ? <LoadingSpinner size="w-4 h-4 inline mr-1"/> : <SparklesIcon className="w-4 h-4 inline mr-1"/>} Apply AI Edits
                </button>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-[500px] overflow-y-auto pr-1">
            {Object.entries(mealPlan).map(([day, meals]) => (
              <div key={day} className="p-4 bg-white rounded shadow-md border border-base_300">
                <h4 className="font-semibold text-primary mb-2">{day}</h4>
                <ul className="space-y-1 text-sm">
                  {Object.entries(meals).map(([mealType, description]) => (
                    <li key={mealType}>
                      <strong className="text-gray-600">{mealType}:</strong>
                      <span className="text-neutral ml-1">{description || 'Not specified'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button
            onClick={handleGenerateGroceryList}
            disabled={isLoadingGroceryList || !isApiKeySet()}
            className="w-full flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-accent hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
            aria-label="Generate grocery list from meal plan"
          >
            {isLoadingGroceryList ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
            Generate Grocery List
          </button>
        </div>
      )}

      {groceryList && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow animate-fadeIn mb-8 pb-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Your Grocery List:</h3>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6 max-h-[500px] overflow-y-auto pr-1">
            {Object.entries(groceryList).map(([category, items]) => (
              <div key={category}>
                <h4 className="font-semibold text-primary mb-2 border-b border-blue-200 pb-1">{category}</h4>
                <ul className="space-y-1 text-sm">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between">
                       <span className={` ${item.have ? 'line-through text-gray-400' : 'text-neutral'}`}>{item.name}</span>
                       <input 
                         type="checkbox"
                         checked={item.have || false}
                         onChange={() => toggleHaveItem(category, item.id)}
                         className="ml-2 accent-primary w-4 h-4 cursor-pointer"
                         aria-label={`Mark ${item.name} as ${item.have ? 'not have' : 'have'}`}
                       />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button
            onClick={handleOrderDeliveryFromMealPlanList}
            className="w-full flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 transition-colors"
            aria-label="Draft task for grocery delivery for items not marked as 'have'"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Draft Delivery Task for Missing Items
          </button>
        </div>
      )}
      
      <div className="mt-10 pt-6 border-t border-gray-200 mb-8 pb-6">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-gray-700">Copycat Recipe Generator</h3>
            {recipeSaveSuccessMessage && <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md animate-fadeIn">{recipeSaveSuccessMessage}</p>}
        </div>
        <p className="text-sm text-neutral mb-4">
          Want a recipe for a specific dish? Enter its name and let AI generate it for you. You can adjust servings, learn cooking techniques, get video recommendations, and save it to your "Journal & Recipes".
        </p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
          <input
            type="text"
            value={copycatDishName}
            onChange={(e) => setCopycatDishName(e.target.value)}
            placeholder="Enter a dish name (e.g., 'Chicken Alfredo')"
            className="flex-grow p-2.5 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary"
            aria-label="Dish name for copycat recipe"
          />
          <button
            onClick={handleGetCopycatRecipe}
            disabled={isLoadingRecipe || !copycatDishName.trim() || !isApiKeySet()}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 transition-colors"
            aria-label="Get Copycat Recipe from AI"
          >
            {isLoadingRecipe && !isLoadingServingsUpdate ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <LightBulbIcon className="w-5 h-5 mr-2" />}
            Get Recipe
          </button>
          <button
            onClick={handleFeelingLuckyRecipe}
            disabled={isLoadingRecipe || !isApiKeySet()}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-accent hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
            aria-label="Get a random recipe (I'm Feeling Lucky)"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            I'm Feeling Lucky
          </button>
        </div>
        {recipeError && <p className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">{recipeError}</p>}
        {isLoadingRecipe && !generatedRecipe && <div className="flex justify-center mt-4"><LoadingSpinner /> <p className="ml-2">AI is conjuring your recipe...</p></div>}
        
        {generatedRecipe && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow animate-fadeIn">
            <h4 className="text-lg font-bold text-primary mb-1">{generatedRecipe.name}</h4>
            {generatedRecipe.imageUrl && <img src={generatedRecipe.imageUrl} alt={generatedRecipe.name} className="w-full h-auto max-h-60 object-contain rounded-md my-3" />}
            {generatedRecipe.description && (
                typeof generatedRecipe.description === 'string' ?
                <p className="text-xs text-neutral mb-2 italic">{generatedRecipe.description}</p> :
                <p className="text-xs text-neutral mb-2 italic text-red-500">{String(generatedRecipe.description)}</p>
            )}
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-semibold text-primary">Chef's Note:</p>
                <p className="text-xs text-blue-700">This AI-generated recipe is a fantastic starting point! We encourage experienced cooks to adapt it, experiment with ingredients, and infuse their unique style to create a culinary masterpiece.</p>
            </div>
            <div className="text-xs text-gray-600 mb-2">
                <span>Prep: {generatedRecipe.prepTime || 'N/A'}</span> | 
                <span> Cook: {generatedRecipe.cookTime || 'N/A'}</span> | 
                <span> Servings: {generatedRecipe.servings || 'N/A'}</span>
            </div>
            <div className="mb-3">
                <h5 className="font-semibold text-gray-700 text-sm mb-1">Ingredients:</h5>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-gray-600 pl-3">
                {generatedRecipe.ingredients.map((ing, i) => (
                    <li key={i}>{`${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()}</li>
                ))}
                </ul>
            </div>
            <div className="mb-3">
                <h5 className="font-semibold text-gray-700 text-sm mb-1">Instructions:</h5>
                <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600 pl-3">
                {generatedRecipe.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                ))}
                </ol>
            </div>

            {generatedRecipe.cookingTechniques && generatedRecipe.cookingTechniques.length > 0 && (
              <div className="mb-3">
                <h5 className="font-semibold text-gray-700 text-sm mb-1">Cooking Techniques & Chef's Tips:</h5>
                <ul className="space-y-2 text-xs text-gray-600 pl-3">
                  {generatedRecipe.cookingTechniques.map((technique, i) => (
                    <li key={`tech-${i}`} className="border-l-2 border-blue-200 pl-2 py-1">
                      <strong className="text-blue-700">{technique.techniqueName}:</strong> {technique.description}
                      {technique.youtubeRecommendations && technique.youtubeRecommendations.length > 0 && (
                        <div className="mt-1 pl-2">
                          <p className="text-xs font-medium text-red-600 flex items-center">
                            <VideoCameraIcon className="w-3 h-3 mr-1"/> Technique Videos:
                          </p>
                          <ul className="list-disc list-inside ml-2 text-blue-600">
                            {technique.youtubeRecommendations.map((rec, recIdx) => (
                              <li key={`tech-yt-${i}-${recIdx}`}>
                                <a 
                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.title)}`} 
                                  target="_blank" rel="noopener noreferrer"
                                  className="hover:text-blue-800 hover:underline"
                                  title={`Search YouTube for: ${rec.title}`}
                                >
                                  {rec.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {generatedRecipe.youtubeRecommendations && generatedRecipe.youtubeRecommendations.length > 0 && (
                <div className="mb-3">
                    <h5 className="font-semibold text-gray-700 text-sm mb-1 flex items-center">
                        <VideoCameraIcon className="w-4 h-4 mr-1.5 text-red-600" />
                        Overall Dish Video Recommendations:
                    </h5>
                    <ul className="space-y-1 text-xs pl-3">
                        {generatedRecipe.youtubeRecommendations.map((rec, i) => (
                            <li key={i} className="flex items-center">
                                <PlayIcon className="w-3 h-3 mr-1.5 text-red-500 flex-shrink-0" />
                                <a 
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.title)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                                    title={`Search YouTube for: ${rec.title}`}
                                >
                                    {rec.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                <div>
                    <label htmlFor="requestedServings" className="block text-xs font-medium text-gray-700">Adjust Servings for this Recipe:</label>
                    <div className="flex items-center gap-2 mt-0.5">
                        <input
                            type="text"
                            id="requestedServings"
                            value={requestedServings}
                            onChange={(e) => setRequestedServings(e.target.value)}
                            placeholder="e.g., '6 servings', 'for 2 people'"
                            className={inputStyleLight + " flex-grow"}
                        />
                        <button
                            onClick={handleUpdateServingsAI}
                            disabled={isLoadingServingsUpdate || !requestedServings.trim() || !isApiKeySet()}
                            className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 disabled:opacity-60 flex items-center"
                        >
                            {isLoadingServingsUpdate ? <LoadingSpinner size="w-3 h-3 mr-1"/> : <SparklesIcon className="w-3 h-3 mr-1"/>} Update Servings (AI)
                        </button>
                    </div>
                    {isLoadingServingsUpdate && <p className="text-xs text-blue-600 mt-1">AI is adjusting servings...</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                     <button
                        onClick={handleOpenShoppingListModal}
                        disabled={!isApiKeySet()}
                        className="flex-1 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-md hover:bg-teal-600 transition-colors flex items-center justify-center"
                    >
                       <PlusCircleIcon className="w-4 h-4 mr-1.5"/> Add Ingredients to Shopping List
                    </button>
                    <button 
                        onClick={handleSaveGeneratedRecipeToBookLocal}
                        className="flex-1 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-md hover:bg-rose-600 transition-colors flex items-center justify-center"
                    >
                       <BookOpenIcon className="w-4 h-4 mr-1.5"/> Save to Journal & Recipes
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
      
      <Modal
        isOpen={showShoppingListModal}
        onClose={() => setShowShoppingListModal(false)}
        title={`Shopping List for: ${generatedRecipe?.name || ''}`}
        footer={<>
            <button onClick={() => setShowShoppingListModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Close</button>
            <button 
                onClick={handleOrderMissingRecipeItems} 
                disabled={recipeShoppingListForModal.filter(item => item.selected && !item.have).length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-md disabled:opacity-60"
            >
                Draft Order for Missing Items ({recipeShoppingListForModal.filter(item => item.selected && !item.have).length})
            </button>
        </>}
      >
        {isLoadingRealisticList ? (
            <div className="flex justify-center items-center p-4"><LoadingSpinner /> <span className="ml-2">AI is preparing your smart shopping list...</span></div>
        ) : recipeError && !Object.keys(groupedRecipeShoppingList).length ? ( 
            <p className="text-red-600">{recipeError}</p>
        ) : (
            <>
                {recipeShoppingListNotification && (
                    <div className="mb-3 p-2 text-sm bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                        {recipeShoppingListNotification}
                    </div>
                )}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {Object.entries(groupedRecipeShoppingList).map(([category, items]) => (
                        <div key={category}>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1 sticky top-0 bg-white py-1 border-b">{category}</h5>
                            {items.map(item => (
                                <div key={item.id} className="p-2.5 border-b border-gray-100 bg-white hover:bg-gray-50">
                                   <div className="flex items-center justify-between">
                                        <label className="flex items-center cursor-pointer flex-grow mr-2">
                                            <input 
                                                type="checkbox"
                                                checked={item.selected}
                                                onChange={() => toggleRecipeShoppingListItem(item.id)}
                                                className="accent-primary w-4 h-4 mr-2.5 shrink-0"
                                                aria-label={`Select ${item.realisticItemName} for shopping`}
                                            />
                                            <div className="text-sm">
                                                <span className={`font-medium ${item.have ? 'text-green-600 line-through' : 'text-gray-800'}`}>{item.realisticItemName}</span>
                                                <span className="text-gray-600"> ({item.realisticQuantity})</span>
                                                {item.have && <span className="text-xs text-green-500 ml-1">(In Inventory)</span>}
                                            </div>
                                        </label>
                                         <button 
                                            onClick={() => handleOpenAlternativesForShoppingItemModal(item)}
                                            title={`Ask AI for substitutes for ${item.originalItemName}`}
                                            className="p-1 text-amber-500 hover:text-amber-700 shrink-0"
                                        >
                                            <SparklesIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 ml-7 mt-0.5">Original: {item.originalItemName} ({item.originalQuantityInfo}) {item.notes && `- ${item.notes}`}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </>
        )}
      </Modal>
      
      <Modal
        isOpen={showAlternativesForShoppingItemModal}
        onClose={() => setShowAlternativesForShoppingItemModal(false)}
        title={`Alternatives for: ${shoppingListItemForAlternatives?.originalItemName || ''}`}
        footer={<>
            {alternativeSuggestionsForShoppingItem && !alternativesErrorForShoppingItem && !isLoadingAlternativesForShoppingItem && (
                <button 
                    onClick={handleApplyAlternativeAI} 
                    disabled={isLoadingApplyAlternative}
                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 disabled:opacity-60 flex items-center mr-auto"
                >
                    {isLoadingApplyAlternative ? <LoadingSpinner size="w-3 h-3 mr-1"/> : <SparklesIcon className="w-3 h-3 mr-1"/>} Apply this Alternative (AI)
                </button>
            )}
            <button onClick={() => setShowAlternativesForShoppingItemModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Close</button>
        </>}
      >
        {isLoadingAlternativesForShoppingItem ? (
          <div className="flex justify-center items-center p-4"><LoadingSpinner /> <span className="ml-2">AI is thinking of alternatives...</span></div>
        ) : alternativesErrorForShoppingItem ? (
          <p className="text-red-600">{alternativesErrorForShoppingItem}</p>
        ) : (
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2">Original Recipe Ingredient: <span className="text-primary">{shoppingListItemForAlternatives?.originalItemName}</span></p>
            <p className="font-medium mb-1">AI Suggested Alternatives:</p>
            <div className="whitespace-pre-wrap max-h-[40vh] overflow-y-auto p-1 bg-gray-50 rounded border">
                {alternativeSuggestionsForShoppingItem || "No specific suggestions provided by AI at this time."}
            </div>
            {isLoadingApplyAlternative && <p className="text-xs text-blue-600 mt-2">AI is updating the main recipe with this alternative...</p>}
             <p className="text-xs text-gray-500 mt-4 pt-2 border-t border-gray-200">
                Note: These are suggestions. To use an alternative, you can click "Apply this Alternative (AI)" to have the AI attempt to update the main recipe, or adjust the recipe details manually.
            </p>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default DietarySection;
