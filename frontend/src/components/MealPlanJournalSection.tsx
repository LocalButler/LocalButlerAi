import React, { useState, useCallback } from 'react';
import { SavedMealPlan, WeeklyMealPlan, SavedRecipe, Recipe, RecipeIngredient, UserProfile, WithUserProfile, YouTubeRecommendation, CookingTechniqueItem, RealisticShoppingListItem, KitchenInventoryItem, Task, TaskStatus } from '../types';
import { TrashIcon, ClipboardListIcon, PencilIcon, BookOpenIcon, PlusCircleIcon, CameraIcon, SparklesIcon, ForkIcon, VideoCameraIcon, PlayIcon, XMarkIcon } from './Icons';
import SectionContainer from './SectionContainer';
import FileUpload from './FileUpload';
import { generateText, isApiKeySet, parseGeminiJsonResponse } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal'; 

interface JournalAndRecipesSectionProps extends WithUserProfile {
  savedMealPlans: SavedMealPlan[];
  onDeleteSavedMealPlan: (planId: string) => void;
  savedRecipes: SavedRecipe[];
  onUpdateSavedRecipes: (recipes: SavedRecipe[]) => void;
  onDeleteSavedRecipe: (recipeId: string) => void;
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { status?: TaskStatus }) => void;
  kitchenInventory: KitchenInventoryItem[];
}
const IMAGE_PLACEHOLDER_STRING = "__HAS_IMAGE_PLACEHOLDER__";

function cleanRecipeDescriptionField(recipe: Recipe | SavedRecipe): Recipe | SavedRecipe {
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


const JournalAndRecipesSection: React.FC<JournalAndRecipesSectionProps> = ({
  userProfile, 
  savedMealPlans,
  onDeleteSavedMealPlan,
  savedRecipes,
  onUpdateSavedRecipes,
  onDeleteSavedRecipe,
  onAddTask,
  kitchenInventory,
}) => {
  const [expandedSavedPlanId, setExpandedSavedPlanId] = useState<string | null>(null);

  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<SavedRecipe | null>(null);
  const [isAiEditingSavedRecipeMode, setIsAiEditingSavedRecipeMode] = useState<boolean>(false);
  const [aiEditSavedRecipePrompt, setAiEditSavedRecipePrompt] = useState<string>('');
  const [stagedImageUrlForSavedRecipeAiEdit, setStagedImageUrlForSavedRecipeAiEdit] = useState<string | undefined>(undefined);
  const [isLoadingAiUpdateForSavedRecipe, setIsLoadingAiUpdateForSavedRecipe] = useState<boolean>(false);
  const [aiEditSavedRecipeError, setAiEditSavedRecipeError] = useState<string | null>(null);
  const [savedRecipeImageUploadSuccessMessage, setSavedRecipeImageUploadSuccessMessage] = useState<string>('');
  
  const [showSavedRecipeShoppingListModal, setShowSavedRecipeShoppingListModal] = useState(false);
  const [savedRecipeShoppingListModalContent, setSavedRecipeShoppingListModalContent] = useState<RealisticShoppingListItem[]>([]);
  const [isLoadingSavedRecipeRealisticList, setIsLoadingSavedRecipeRealisticList] = useState(false);
  const [savedRecipeShoppingListError, setSavedRecipeShoppingListError] = useState<string | null>(null);
  const [savedRecipeShoppingListNotification, setSavedRecipeShoppingListNotification] = useState<string | null>(null);


  const [shoppingListItemForSavedRecipeAlternatives, setShoppingListItemForSavedRecipeAlternatives] = useState<RealisticShoppingListItem | null>(null);
  const [alternativeSuggestionsForSavedRecipeShoppingItem, setAlternativeSuggestionsForSavedRecipeShoppingItem] = useState<string | null>(null);
  const [isLoadingAlternativesForSavedRecipeShoppingItem, setIsLoadingAlternativesForSavedRecipeShoppingItem] = useState(false);
  const [alternativesErrorForSavedRecipeShoppingItem, setAlternativesErrorForSavedRecipeShoppingItem] = useState<string | null>(null);
  const [showAlternativesForSavedRecipeShoppingItemModal, setShowAlternativesForSavedRecipeShoppingItemModal] = useState(false);
  const [isLoadingApplySavedRecipeAlternative, setIsLoadingApplySavedRecipeAlternative] = useState(false);


  const handleLoadPlan = (plan: SavedMealPlan) => {
    alert(`Feature to load "${plan.title}" directly into the planner for editing/viewing is planned. For now, you can recreate it with similar settings.`);
  };

  const handleSelectSavedRecipe = (recipe: SavedRecipe) => {
    setSelectedSavedRecipe(recipe);
    setIsAiEditingSavedRecipeMode(false); 
    setAiEditSavedRecipePrompt('');
    setAiEditSavedRecipeError(null);
    setSavedRecipeImageUploadSuccessMessage('');
    setStagedImageUrlForSavedRecipeAiEdit(recipe.imageUrl);
    setShowSavedRecipeShoppingListModal(false); 
    setSavedRecipeShoppingListError(null);
    setSavedRecipeShoppingListNotification(null);
  };

  const handleDeleteSavedRecipeLocal = (recipeId: string) => {
    onDeleteSavedRecipe(recipeId); 
    if (selectedSavedRecipe?.id === recipeId) {
      setSelectedSavedRecipe(null);
      setIsAiEditingSavedRecipeMode(false);
    }
  };

  const handleStartAiEditForSavedRecipe = (recipe: SavedRecipe) => {
    setSelectedSavedRecipe(recipe); 
    setIsAiEditingSavedRecipeMode(true);
    setAiEditSavedRecipePrompt('');
    setAiEditSavedRecipeError(null);
    setSavedRecipeImageUploadSuccessMessage('');
    setStagedImageUrlForSavedRecipeAiEdit(recipe.imageUrl); 
  };

  const handleCancelAiEditForSavedRecipe = () => {
    setIsAiEditingSavedRecipeMode(false);
    setAiEditSavedRecipePrompt('');
    setAiEditSavedRecipeError(null);
    setSavedRecipeImageUploadSuccessMessage('');
    if (selectedSavedRecipe) {
      setStagedImageUrlForSavedRecipeAiEdit(selectedSavedRecipe.imageUrl);
    }
  };
  
  const handleImageUploadForSavedRecipe = (file: File, base64Data: string) => {
    if (!selectedSavedRecipe) return;

    const newImageUrl = `data:${file.type};base64,${base64Data}`;
    
    if (isAiEditingSavedRecipeMode) {
        setStagedImageUrlForSavedRecipeAiEdit(newImageUrl);
        setSavedRecipeImageUploadSuccessMessage('Image staged for AI update. Describe other changes or click "Update with AI".');
    } else {
        const updatedRecipeWithNewImage = { ...selectedSavedRecipe, imageUrl: newImageUrl };
        onUpdateSavedRecipes(savedRecipes.map(r => r.id === selectedSavedRecipe.id ? updatedRecipeWithNewImage : r));
        setSelectedSavedRecipe(updatedRecipeWithNewImage); 
        setSavedRecipeImageUploadSuccessMessage('Recipe image updated successfully!');
        setTimeout(() => setSavedRecipeImageUploadSuccessMessage(''), 4000);
    }
  };

  const handleUpdateSavedRecipeWithAI = useCallback(async () => {
    console.log("Is API Key Set:", isApiKeySet()); // <-- Moved here
    if (!selectedSavedRecipe || !aiEditSavedRecipePrompt.trim() || !isApiKeySet()) {
        setAiEditSavedRecipeError("Recipe context, AI prompt, or API key is missing.");
        return;
    }
    setIsLoadingAiUpdateForSavedRecipe(true);
    setAiEditSavedRecipeError(null);
    setSavedRecipeImageUploadSuccessMessage('');

    const recipeContextForAI = { 
        ...selectedSavedRecipe,
        imageUrl: stagedImageUrlForSavedRecipeAiEdit ? IMAGE_PLACEHOLDER_STRING : undefined,
        cookingTechniques: (selectedSavedRecipe.cookingTechniques || []).map(ct => ({
          techniqueName: ct.techniqueName,
          description: ct.description,
          youtubeRecommendations: ct.youtubeRecommendations || []
        })),
        youtubeRecommendations: selectedSavedRecipe.youtubeRecommendations || [],
    };
    
    const systemInstruction = `You are a recipe modification expert.
Given an original recipe (JSON format) and a user's modification request, update the recipe.
Your response MUST be a single JSON object representing the complete updated recipe.
The JSON object must include all original fields if they are still applicable, and reflect the requested changes.
Fields to include: "name", "description", "ingredients" (array of objects: name, quantity, unit), "instructions" (array of strings), "prepTime", "cookTime", "servings", "cookingTechniques" (array of objects, each with "techniqueName", "description", and optionally "youtubeRecommendations" as array of {title, url}), "youtubeRecommendations" (array of objects: title, url, videoId for overall dish), and "imageUrl" (string).
If the original recipe had an image (indicated by 'imageUrl': '${IMAGE_PLACEHOLDER_STRING}'), and your modifications don't require removing the image, please include "imageUrl": "${IMAGE_PLACEHOLDER_STRING}" in your response JSON. If the user asks to remove the image, omit the "imageUrl" field entirely.
Preserve original dish-level "youtubeRecommendations" unless the user's request directly implies changes to them.
For "cookingTechniques", ensure they are relevant and beginner-friendly. Preserve or update existing technique-specific YouTube recommendations if the technique is retained or modified. If a technique is removed, remove its recommendations. If a new technique is added, you can suggest new YouTube recommendations for it.
If servings change, adjust ingredient quantities and potentially instructions.
If dietary changes are requested (e.g., vegan), modify ingredients and instructions accordingly.
Maintain the general structure and style of the original recipe where possible.`;

    const prompt = `Original Recipe (JSON - NOTE: if 'imageUrl' is '${IMAGE_PLACEHOLDER_STRING}', it means an image exists and should be preserved by keeping the 'imageUrl' field in your output JSON with the same placeholder value if no changes to the image are requested. "cookingTechniques" contains technique-specific YouTube recommendations):
${JSON.stringify(recipeContextForAI)}

User's modification request:
"${aiEditSavedRecipePrompt}"

Please provide the complete updated recipe as a JSON object.`;

    try {
        const responseText = await generateText(prompt, systemInstruction, true, userProfile);
        let parsedUpdatedRecipe = parseGeminiJsonResponse<Recipe>(responseText); 

        if (parsedUpdatedRecipe && parsedUpdatedRecipe.name && parsedUpdatedRecipe.ingredients && parsedUpdatedRecipe.instructions) {
            parsedUpdatedRecipe = cleanRecipeDescriptionField(parsedUpdatedRecipe) as Recipe;

            let finalImageUrl = undefined;
            if (parsedUpdatedRecipe.imageUrl === IMAGE_PLACEHOLDER_STRING) {
                finalImageUrl = stagedImageUrlForSavedRecipeAiEdit || selectedSavedRecipe.imageUrl;
            } else if (parsedUpdatedRecipe.imageUrl) { 
                finalImageUrl = parsedUpdatedRecipe.imageUrl;
            }
            
            const fullyUpdatedSavedRecipe: SavedRecipe = {
                ...selectedSavedRecipe, 
                ...parsedUpdatedRecipe, 
                cookingTechniques: (parsedUpdatedRecipe.cookingTechniques || selectedSavedRecipe.cookingTechniques || []).map(ct => ({
                    techniqueName: ct.techniqueName || "Unknown Technique",
                    description: ct.description || "No description provided.",
                    youtubeRecommendations: ct.youtubeRecommendations || []
                })),
                youtubeRecommendations: parsedUpdatedRecipe.youtubeRecommendations || selectedSavedRecipe.youtubeRecommendations || [],
                imageUrl: finalImageUrl,
            };
            
            onUpdateSavedRecipes(savedRecipes.map(r => r.id === selectedSavedRecipe.id ? fullyUpdatedSavedRecipe : r));
            setSelectedSavedRecipe(fullyUpdatedSavedRecipe);
            setIsAiEditingSavedRecipeMode(false);
            setAiEditSavedRecipePrompt('');
            setSavedRecipeImageUploadSuccessMessage('Recipe updated successfully by AI!');
            setTimeout(() => setSavedRecipeImageUploadSuccessMessage(''), 4000);
        } else {
            setAiEditSavedRecipeError("AI failed to update the recipe or the response was malformed. Raw: " + responseText.substring(0,300));
        }
    } catch (err) {
        setAiEditSavedRecipeError("Error updating recipe with AI: " + (err as Error).message);
    } finally {
        setIsLoadingAiUpdateForSavedRecipe(false);
    }
  }, [selectedSavedRecipe, aiEditSavedRecipePrompt, onUpdateSavedRecipes, savedRecipes, stagedImageUrlForSavedRecipeAiEdit, userProfile]);

  // --- Shopping List Functionality for Saved Recipes ---
  const updateSavedRecipeShoppingListBasedOnRecipe = useCallback(async (recipeForShoppingList: SavedRecipe) => {
    if (!recipeForShoppingList || !isApiKeySet()) {
        setSavedRecipeShoppingListError("Cannot generate shopping list: Recipe data missing or API key not set.");
        setSavedRecipeShoppingListModalContent([]);
        setSavedRecipeShoppingListNotification(null);
        return;
    }
    setIsLoadingSavedRecipeRealisticList(true);
    setSavedRecipeShoppingListError(null); 
    setSavedRecipeShoppingListNotification(null);

    const ingredientsText = recipeForShoppingList.ingredients.map(ing => `${ing.name} (${ing.quantity || ''} ${ing.unit || ''})`).join('; ');
    const realisticListPrompt = `Given this list of recipe ingredients: "${ingredientsText}".
    Servings specified for this recipe: ${recipeForShoppingList.servings || 'Not specified, assume 2-4'}.
    Convert each ingredient into a realistic item a person would buy at a grocery store, considering the servings.
    Also, categorize each item into common grocery sections (e.g., "Produce", "Dairy & Alternatives", "Protein", "Pantry Staples", "Frozen", "Spices & Condiments", "Beverages", "Other").
    Output this as a JSON array of objects. Each object should have:
    "originalItemName": (string), "originalQuantityInfo": (string), "realisticItemName": (string), "realisticQuantity": (string), "category": (string), "notes": (string, optional).`;
    
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
                    id: `srsli-upd-${Date.now()}-${index}`,
                    have: !!foundInInventory, 
                    selected: !foundInInventory 
                };
            });
            setSavedRecipeShoppingListModalContent(shoppingListItems);
             if (itemsFoundInInventoryCount > 0) {
                setSavedRecipeShoppingListNotification(`Compared with your inventory: ${itemsFoundInInventoryCount} item(s) you likely have are unselected.`);
            } else {
                setSavedRecipeShoppingListNotification("Shopping list ready. We checked your inventory, and it seems you need all these items.");
            }
        } else {
            setSavedRecipeShoppingListError("AI couldn't update the realistic shopping list. Raw: " + realisticListText.substring(0,200));
            setSavedRecipeShoppingListNotification(null);
            const fallbackShoppingList = recipeForShoppingList.ingredients.map((ing, index) => {
                 const foundInInventory = kitchenInventory.find(invItem => 
                    invItem.name.toLowerCase().includes(ing.name.toLowerCase()) || 
                    ing.name.toLowerCase().includes(invItem.name.toLowerCase())
                );
                return {
                    id: `fallback-srsli-${Date.now()}-${index}`,
                    originalItemName: ing.name,
                    originalQuantityInfo: `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
                    realisticItemName: ing.name, 
                    realisticQuantity: `${ing.quantity || ''} ${ing.unit || ''}`.trim(), 
                    category: "Uncategorized",
                    have: !!foundInInventory,
                    selected: !foundInInventory
                };
            });
            setSavedRecipeShoppingListModalContent(fallbackShoppingList);
        }
    } catch (err: any) {
        setSavedRecipeShoppingListError("Error updating realistic shopping list: " + (err as Error).message);
        setSavedRecipeShoppingListNotification(null);
         const fallbackShoppingList = recipeForShoppingList.ingredients.map((ing, index) => {
            const foundInInventory = kitchenInventory.find(invItem => 
                invItem.name.toLowerCase().includes(ing.name.toLowerCase()) || 
                ing.name.toLowerCase().includes(invItem.name.toLowerCase())
            );
            return {
                id: `error-srsli-${Date.now()}-${index}`,
                originalItemName: ing.name,
                originalQuantityInfo: `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
                realisticItemName: ing.name,
                realisticQuantity: `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
                category: "Uncategorized",
                have: !!foundInInventory,
                selected: !foundInInventory
            };
        });
        setSavedRecipeShoppingListModalContent(fallbackShoppingList);
    } finally {
        setIsLoadingSavedRecipeRealisticList(false);
    }
  }, [userProfile, kitchenInventory, isApiKeySet]);

  const handleOpenSavedRecipeShoppingListModal = useCallback(async () => {
    if (!selectedSavedRecipe) return;
    setShowSavedRecipeShoppingListModal(true);
    setSavedRecipeShoppingListError(null);
    setSavedRecipeShoppingListNotification(null);
    await updateSavedRecipeShoppingListBasedOnRecipe(selectedSavedRecipe);
  }, [selectedSavedRecipe, updateSavedRecipeShoppingListBasedOnRecipe]);

  const toggleSavedRecipeShoppingListItem = useCallback((itemId: string) => {
    setSavedRecipeShoppingListModalContent(prev => prev.map(item => item.id === itemId ? {...item, selected: !item.selected } : item));
  }, []);

  const handleOrderMissingSavedRecipeItems = useCallback(() => {
    const itemsToOrder = savedRecipeShoppingListModalContent.filter(item => item.selected && !item.have);
    if (itemsToOrder.length > 0 && selectedSavedRecipe) {
        onAddTask({
            title: `Grocery DRAFT for Saved Recipe: ${selectedSavedRecipe.name}`,
            description: `Request for grocery delivery. Realistic items: ${itemsToOrder.map(i => `${i.realisticItemName} (${i.realisticQuantity})`).join(', ')}. From saved recipe for ${selectedSavedRecipe.servings || 'N/A'} servings.`,
            linkedContent: JSON.stringify({recipeId: selectedSavedRecipe.id, recipeName: selectedSavedRecipe.name, servings: selectedSavedRecipe.servings, items: itemsToOrder}),
            sourceSection: "Dietary (Journal)",
            status: TaskStatus.DRAFT,
            sourceRecipeId: selectedSavedRecipe.id,
        });
        alert(`Task DRAFT created to order ${itemsToOrder.length} missing ingredients for "${selectedSavedRecipe.name}". Find it in "My Tasks" to post to Marketplace.`);
        setShowSavedRecipeShoppingListModal(false);
    } else {
        alert("No missing items selected for order, or no recipe selected.");
    }
  }, [savedRecipeShoppingListModalContent, selectedSavedRecipe, onAddTask]);

  const handleSuggestSavedRecipeAlternativesAI = useCallback(async (
    shoppingListItem: RealisticShoppingListItem | null,
    currentRecipeForContext: SavedRecipe | null
  ) => {
    if (!shoppingListItem || !currentRecipeForContext || !isApiKeySet()) {
      setAlternativesErrorForSavedRecipeShoppingItem("Cannot get alternatives. Missing item, recipe context, or API key.");
      setIsLoadingAlternativesForSavedRecipeShoppingItem(false);
      return;
    }
    setIsLoadingAlternativesForSavedRecipeShoppingItem(true);
    setAlternativesErrorForSavedRecipeShoppingItem(null);
    setAlternativeSuggestionsForSavedRecipeShoppingItem(null);

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

    const prompt = `The user is considering an alternative for the ingredient "${shoppingListItem.originalItemName}" (listed as "${shoppingListItem.realisticItemName} - ${shoppingListItem.realisticQuantity}") for the following SAVED RECIPE:
Recipe Context (JSON - NOTE: if 'imageUrl' is '${IMAGE_PLACEHOLDER_STRING}', it means an image exists):
${JSON.stringify(recipeContextForAlternatives)}

Suggest 1-2 suitable alternatives for "${shoppingListItem.originalItemName}".
For each alternative:
1. State the alternative ingredient.
2. Specify quantity changes compared to original recipe's quantity for "${shoppingListItem.originalItemName}".
3. Briefly explain potential impact on the dish.
If no good alternatives, or highly discouraged, explain why. Concise response addressing substitution.`;

    try {
      const responseText = await generateText(prompt, "You are a culinary assistant providing ingredient substitution advice for saved recipes.", false, userProfile);
      setAlternativeSuggestionsForSavedRecipeShoppingItem(responseText);
    } catch (err: any) {
      setAlternativesErrorForSavedRecipeShoppingItem("Error suggesting alternatives: " + (err as Error).message);
      setAlternativeSuggestionsForSavedRecipeShoppingItem("Sorry, I couldn't fetch alternatives at this time.");
    } finally {
      setIsLoadingAlternativesForSavedRecipeShoppingItem(false);
    }
  }, [userProfile, isApiKeySet]);

  const handleOpenAlternativesForSavedRecipeShoppingItemModal = useCallback((item: RealisticShoppingListItem) => {
    if (!selectedSavedRecipe) {
        setAlternativesErrorForSavedRecipeShoppingItem("Cannot process alternatives: The main saved recipe context is missing.");
        setShowAlternativesForSavedRecipeShoppingItemModal(true);
        setIsLoadingAlternativesForSavedRecipeShoppingItem(false); 
        setShoppingListItemForSavedRecipeAlternatives(item); 
        setAlternativeSuggestionsForSavedRecipeShoppingItem(null); 
        return;
    }
    setShoppingListItemForSavedRecipeAlternatives(item);
    setShowAlternativesForSavedRecipeShoppingItemModal(true);
    setAlternativeSuggestionsForSavedRecipeShoppingItem(null);
    setAlternativesErrorForSavedRecipeShoppingItem(null);
    handleSuggestSavedRecipeAlternativesAI(item, selectedSavedRecipe); 
  }, [selectedSavedRecipe, handleSuggestSavedRecipeAlternativesAI]);

  const handleApplySavedRecipeAlternativeAI = useCallback(async () => {
    if (!shoppingListItemForSavedRecipeAlternatives || !alternativeSuggestionsForSavedRecipeShoppingItem || !selectedSavedRecipe || !isApiKeySet()) {
        setAlternativesErrorForSavedRecipeShoppingItem("Cannot apply. Missing item, AI suggestion, recipe context, or API key.");
        return;
    }
    setIsLoadingApplySavedRecipeAlternative(true);
    setAlternativesErrorForSavedRecipeShoppingItem(null);

    const originalImageUrl = selectedSavedRecipe.imageUrl;
    const recipeContextForApplyingAlternative = {
        ...selectedSavedRecipe,
        imageUrl: selectedSavedRecipe.imageUrl ? IMAGE_PLACEHOLDER_STRING : undefined,
        cookingTechniques: (selectedSavedRecipe.cookingTechniques || []).map(ct => ({
          techniqueName: ct.techniqueName,
          description: ct.description,
          youtubeRecommendations: ct.youtubeRecommendations || []
        })),
        youtubeRecommendations: selectedSavedRecipe.youtubeRecommendations || [],
    };

    const prompt = `Given the original SAVED RECIPE (JSON - NOTE: if 'imageUrl' is '${IMAGE_PLACEHOLDER_STRING}', preserve it by keeping "imageUrl": "${IMAGE_PLACEHOLDER_STRING}" in output JSON if no image changes requested):
${JSON.stringify(recipeContextForApplyingAlternative)}

User wants to substitute: "${shoppingListItemForSavedRecipeAlternatives.originalItemName}".
AI previously suggested: "${alternativeSuggestionsForSavedRecipeShoppingItem}"

Incorporate the most suitable AI-suggested alternative. This means:
1.  Modify ingredient list (name, quantity, unit).
2.  Adjust instructions if substitution impacts cooking.
3.  Update "cookingTechniques" section if substitution changes core techniques or adds new ones (structure: [{"techniqueName": "...", "description": "...", "youtubeRecommendations": [...]}, ...]). Keep techniques relevant.
4.  Keep other elements close to original unless substitution necessitates change.
5.  "servings", "prepTime", "cookTime" might need slight adjustments.

Output the *complete, updated recipe* in the exact same JSON format (keys: "name", "description", "ingredients", "instructions", "cookingTechniques", "youtubeRecommendations", "prepTime", "cookTime", "servings", "imageUrl").
Ensure "servings" reflects original servings unless substitution logically changes it.
Preserve "youtubeRecommendations" (overall dish) and image presence if an image existed.`;

    try {
        const responseText = await generateText(prompt, "You are a recipe modification expert for saved recipes. Update JSON, preserve YouTube recommendations and image presence.", true, userProfile);
        let parsedRecipe = parseGeminiJsonResponse<Recipe>(responseText);
        if (parsedRecipe && parsedRecipe.ingredients && parsedRecipe.instructions) {
            parsedRecipe = cleanRecipeDescriptionField(parsedRecipe) as Recipe;
            let finalImageUrl = undefined;
            if (parsedRecipe.imageUrl === IMAGE_PLACEHOLDER_STRING) {
                finalImageUrl = originalImageUrl; 
            } else if (parsedRecipe.imageUrl) {
                finalImageUrl = parsedRecipe.imageUrl;
            }

            const fullyUpdatedSavedRecipe: SavedRecipe = {
                ...selectedSavedRecipe,
                ...parsedRecipe,
                cookingTechniques: (parsedRecipe.cookingTechniques || selectedSavedRecipe.cookingTechniques || []).map(ct => ({
                    techniqueName: ct.techniqueName || "Unknown Technique",
                    description: ct.description || "No description provided.",
                    youtubeRecommendations: ct.youtubeRecommendations || []
                })),
                youtubeRecommendations: parsedRecipe.youtubeRecommendations || selectedSavedRecipe.youtubeRecommendations || [],
                imageUrl: finalImageUrl,
            };
            
            onUpdateSavedRecipes(savedRecipes.map(r => r.id === selectedSavedRecipe.id ? fullyUpdatedSavedRecipe : r));
            setSelectedSavedRecipe(fullyUpdatedSavedRecipe); 
            setSavedRecipeImageUploadSuccessMessage("Recipe updated with AI's suggested alternative!");
            setShowAlternativesForSavedRecipeShoppingItemModal(false); 

            if (showSavedRecipeShoppingListModal) { 
              await updateSavedRecipeShoppingListBasedOnRecipe(fullyUpdatedSavedRecipe);
            }
        } else {
            setAlternativesErrorForSavedRecipeShoppingItem("AI failed to apply alternative. Malformed response. Raw: " + responseText.substring(0, 300));
        }
    } catch (err: any) {
        setAlternativesErrorForSavedRecipeShoppingItem("Error applying alternative: " + (err as Error).message);
    } finally {
        setIsLoadingApplySavedRecipeAlternative(false);
    }
  }, [shoppingListItemForSavedRecipeAlternatives, alternativeSuggestionsForSavedRecipeShoppingItem, selectedSavedRecipe, userProfile, isApiKeySet, showSavedRecipeShoppingListModal, updateSavedRecipeShoppingListBasedOnRecipe, onUpdateSavedRecipes, savedRecipes]);


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

  const groupedSavedRecipeShoppingList = getGroupedShoppingList(savedRecipeShoppingListModalContent);

  const renderSavedRecipeDetails = (recipeToDisplay: SavedRecipe) => (
    <>
        <div className="flex justify-between items-start mb-3">
            <h4 className="text-2xl font-bold text-primary break-words">{recipeToDisplay.name}</h4>
            {!isAiEditingSavedRecipeMode && (
                <div className="flex-shrink-0 space-x-2">
                     <button 
                        onClick={() => handleStartAiEditForSavedRecipe(recipeToDisplay)}
                        className="p-1.5 text-blue-600 hover:text-blue-800"
                        title="Edit this recipe with AI"
                    >
                       <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleOpenSavedRecipeShoppingListModal}
                        disabled={!isApiKeySet()}
                        className="p-1.5 text-teal-500 hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Add ingredients to shopping list"
                    >
                       <PlusCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>

        {(isAiEditingSavedRecipeMode ? stagedImageUrlForSavedRecipeAiEdit : recipeToDisplay.imageUrl) && (
            <img src={(isAiEditingSavedRecipeMode ? stagedImageUrlForSavedRecipeAiEdit : recipeToDisplay.imageUrl)} alt={recipeToDisplay.name} className="w-full h-56 object-cover rounded-md mb-4 shadow-lg" />
        )}
         <div className="mb-3">
             <FileUpload 
                onFileUpload={handleImageUploadForSavedRecipe} 
                label={(isAiEditingSavedRecipeMode ? stagedImageUrlForSavedRecipeAiEdit : recipeToDisplay.imageUrl) ? "Change Recipe Image" : "Upload Recipe Image"}
                acceptedFileTypes="image/jpeg, image/png, image/gif"
            />
            {savedRecipeImageUploadSuccessMessage && <p className="text-xs text-green-600 mt-1">{savedRecipeImageUploadSuccessMessage}</p>}
        </div>

        {recipeToDisplay.description && (
            typeof recipeToDisplay.description === 'string' ?
            <p className="text-sm text-neutral mb-3 italic">{recipeToDisplay.description}</p> :
            <p className="text-sm text-neutral mb-3 italic text-red-500">{String(recipeToDisplay.description)}</p> 
        )}
        
        <div className="mb-3">
            <h5 className="font-semibold text-gray-700 mb-1">Details:</h5>
            <p className="text-xs text-gray-600">Prep: {recipeToDisplay.prepTime || 'N/A'} | Cook: {recipeToDisplay.cookTime || 'N/A'} | Servings: {recipeToDisplay.servings || 'N/A'}</p>
            {recipeToDisplay.source && <p className="text-xs text-gray-600">Source: {recipeToDisplay.source} | Saved: {new Date(recipeToDisplay.dateSaved).toLocaleDateString()}</p>}
        </div>

        <div className="mb-3">
          <h5 className="font-semibold text-gray-700 mb-1">Ingredients:</h5>
          <ul className="list-disc list-inside text-sm space-y-0.5 text-gray-600 pl-4">
            {recipeToDisplay.ingredients.map((ing, i) => (
              <li key={`ing-${i}`}>{`${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()}</li>
            ))}
          </ul>
        </div>
        <div className="mb-3">
          <h5 className="font-semibold text-gray-700 mb-1">Instructions:</h5>
          <ol className="list-decimal list-inside text-sm space-y-1 text-gray-600 pl-4">
            {recipeToDisplay.instructions.map((step, i) => (
              <li key={`inst-${i}`}>{step}</li>
            ))}
          </ol>
        </div>
        
        {recipeToDisplay.cookingTechniques && recipeToDisplay.cookingTechniques.length > 0 && (
            <div className="mb-3">
                <h5 className="font-semibold text-gray-700 mb-1">Cooking Techniques & Chef's Tips:</h5>
                <ul className="space-y-2 text-xs text-gray-600 pl-3">
                  {recipeToDisplay.cookingTechniques.map((technique, i) => (
                    <li key={`saved-tech-${i}`} className="border-l-2 border-blue-200 pl-2 py-1">
                      <strong className="text-blue-700">{technique.techniqueName}:</strong> {technique.description}
                      {technique.youtubeRecommendations && technique.youtubeRecommendations.length > 0 && (
                        <div className="mt-1 pl-2">
                          <p className="text-xs font-medium text-red-600 flex items-center">
                            <VideoCameraIcon className="w-3 h-3 mr-1"/> Technique Videos:
                          </p>
                          <ul className="list-disc list-inside ml-2 text-blue-600">
                            {technique.youtubeRecommendations.map((rec, recIdx) => (
                              <li key={`saved-tech-yt-${i}-${recIdx}`}>
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

        {recipeToDisplay.youtubeRecommendations && recipeToDisplay.youtubeRecommendations.length > 0 && (
            <div className="mb-3">
                <h5 className="font-semibold text-gray-700 text-sm mb-1 flex items-center">
                    <VideoCameraIcon className="w-4 h-4 mr-1.5 text-red-600" /> Overall Dish Video Recommendations:
                </h5>
                <ul className="space-y-1 text-xs pl-4">
                    {recipeToDisplay.youtubeRecommendations.map((rec, i) => (
                        <li key={`yt-${i}`} className="flex items-center">
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
        {recipeToDisplay.notes && (
            <div className="mt-3 pt-2 border-t border-gray-200">
                <h5 className="font-semibold text-gray-700 mb-1">My Notes:</h5>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{recipeToDisplay.notes}</p>
            </div>
        )}
    </>
  );

  const renderAiEditPanelForSavedRecipe = () => (
    <div className="mt-6 pt-4 border-t border-dashed border-blue-400">
        <h5 className="text-md font-semibold text-blue-700 mb-2">Edit Saved Recipe with AI Assistant</h5>
        <p className="text-xs text-gray-600 mb-2">Describe the changes you'd like to make to this recipe. The AI will attempt to update it for you.</p>
        
        <textarea 
            value={aiEditSavedRecipePrompt}
            onChange={(e) => setAiEditSavedRecipePrompt(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary bg-white"
            placeholder="e.g., 'Make this recipe vegan and for 2 people', 'Replace chicken with 1lb of tofu', 'Add instructions for air fryer'"
        />
        {aiEditSavedRecipeError && <p className="text-xs text-red-500 mt-1">{aiEditSavedRecipeError}</p>}
        
        <div className="mt-3 flex items-center justify-between">
            <button
                onClick={handleUpdateSavedRecipeWithAI}
                disabled={isLoadingAiUpdateForSavedRecipe || !aiEditSavedRecipePrompt.trim() || !isApiKeySet()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-60 flex items-center"
            >
                {isLoadingAiUpdateForSavedRecipe ? <LoadingSpinner size="w-4 h-4 mr-2"/> : <SparklesIcon className="w-4 h-4 mr-2"/>} Update with AI
            </button>
            <button
                onClick={handleCancelAiEditForSavedRecipe}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300"
            >
                Cancel AI Edit
            </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h6 className="text-xs font-semibold text-primary mb-1">Tips for AI Recipe Editing:</h6>
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5 pl-3">
                <li>Be specific: "Change servings to 6", "Substitute sugar with maple syrup, adjust quantity".</li>
                <li>For dietary changes: "Make it gluten-free", "Create a vegetarian version".</li>
            </ul>
        </div>
    </div>
  );


  return (
    <SectionContainer title="My Journal & Recipes" icon={<ClipboardListIcon className="w-8 h-8" />}>
      <p className="mb-6 text-neutral">
        Review your saved AI-generated meal plans and your personal recipe collection.
      </p>

      <div className="mb-12">
        <div className="flex items-center mb-4">
            <ClipboardListIcon className="w-6 h-6 mr-2 text-teal-500" />
            <h3 className="text-xl font-semibold text-gray-700">My AI Meal Plan Journal</h3>
        </div>
        {savedMealPlans.length === 0 ? (
          <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-md">
            Your meal plan journal is empty. Generate and save meal plans from the "Meal Planner" section!
          </p>
        ) : (
          <div className="space-y-4">
            {savedMealPlans.slice().sort((a,b) => new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime()).map(savedPlan => (
              <div key={savedPlan.id} className="p-4 bg-white rounded-lg shadow-md border border-base_300">
                <div className="flex justify-between items-center">
                  <h4 
                    className="text-lg font-semibold text-primary cursor-pointer hover:underline"
                    onClick={() => setExpandedSavedPlanId(expandedSavedPlanId === savedPlan.id ? null : savedPlan.id)}
                    title={`Click to ${expandedSavedPlanId === savedPlan.id ? 'collapse' : 'expand'} details`}
                  >
                    {savedPlan.title}
                  </h4>
                  <div className="space-x-2 flex-shrink-0">
                    <button 
                      onClick={() => handleLoadPlan(savedPlan)}
                      className="p-1.5 text-green-500 hover:text-green-700" 
                      title="Load this plan into planner (Future Feature)"
                    >
                      <PencilIcon className="w-4 h-4"/>
                    </button>
                    <button 
                      onClick={() => onDeleteSavedMealPlan(savedPlan.id)} 
                      className="p-1.5 text-red-500 hover:text-red-700" 
                      title="Delete this saved plan"
                    >
                      <TrashIcon className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Saved: {new Date(savedPlan.dateSaved).toLocaleDateString()}
                </p>
                {expandedSavedPlanId === savedPlan.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                    <p className="mb-1"><strong>Days:</strong> {savedPlan.numDays}, <strong>Preferences:</strong> {savedPlan.preferences}, <strong>Target Calories:</strong> ~{savedPlan.calories}/day</p>
                    <div className="mt-2 max-h-60 overflow-y-auto space-y-2 text-xs bg-gray-50 p-2 rounded">
                      {Object.entries(savedPlan.plan).map(([day, meals]) => (
                        <div key={day} className="mb-1">
                          <strong className="text-primary-700">{day}:</strong>
                          <ul className="list-disc list-inside pl-4 text-neutral">
                            {Object.entries(meals).map(([type, desc]) => desc && (
                              <li key={type}><span className="font-medium">{type}:</span> {desc as string}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 pt-6 border-t border-gray-200">
        <div className="flex items-center mb-4">
            <ForkIcon className="w-6 h-6 mr-2 text-rose-500" />
            <h3 className="text-xl font-semibold text-gray-700">My Recipe Book</h3>
        </div>
        <p className="text-sm text-neutral mb-4">
          Your personal collection of saved recipes. Select a recipe to view, edit with AI, or upload an image.
        </p>

        {savedRecipes.length === 0 ? (
          <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-md">Your recipe book is empty. Save recipes from the "Meal Planner" section!</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-6">
            <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2 space-y-3 md:border-r md:border-gray-200 md:pr-4">
              <h4 className="text-lg font-medium text-rose-600 mb-2 sticky top-0 bg-base_100 py-2 z-10">Saved Recipes ({savedRecipes.length})</h4>
              {savedRecipes.slice().sort((a,b) => new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime()).map(recipe => (
                <div 
                  key={recipe.id} 
                  onClick={() => handleSelectSavedRecipe(recipe)}
                  className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-lg 
                              ${isAiEditingSavedRecipeMode && selectedSavedRecipe?.id === recipe.id ? 'bg-blue-100 border-blue-600 shadow-xl ring-2 ring-blue-500' : 
                               selectedSavedRecipe?.id === recipe.id ? 'bg-rose-50 border-rose-400 shadow-md' : 
                               'bg-gray-50 border-gray-200 hover:border-rose-300'}`}
                >
                  <div className="flex justify-between items-start">
                      <div className="flex-grow min-w-0">
                          <h5 className="font-semibold text-gray-700 truncate" title={recipe.name}>{recipe.name}</h5>
                          <div className="flex items-center text-xs text-gray-400">
                              {recipe.imageUrl && <CameraIcon className="w-3 h-3 text-gray-400 inline-block mr-1" />}
                              <span>Saved: {new Date(recipe.dateSaved).toLocaleDateString()} {recipe.source && `(${recipe.source})`}</span>
                          </div>
                      </div>
                      <div className="flex-shrink-0 space-x-1 ml-2">
                          <button onClick={(e) => { e.stopPropagation(); handleStartAiEditForSavedRecipe(recipe); }} className="p-1 text-blue-500 hover:text-blue-700" title="Edit Recipe with AI"><PencilIcon className="w-4 h-4"/></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteSavedRecipeLocal(recipe.id); }} className="p-1 text-red-500 hover:text-red-700" title="Delete Recipe"><TrashIcon className="w-4 h-4"/></button>
                      </div>
                  </div>
                  {recipe.description && (
                        typeof recipe.description === 'string' ?
                        <p className="text-xs text-gray-500 mt-1 truncate" title={recipe.description}>{recipe.description}</p>
                        : <p className="text-xs text-red-500 mt-1 truncate" title={String(recipe.description)}>{String(recipe.description)}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="sticky top-4">
              {selectedSavedRecipe ? (
                <div className="p-4 bg-white rounded-lg shadow-xl border border-rose-400 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {renderSavedRecipeDetails(selectedSavedRecipe)}
                  {isAiEditingSavedRecipeMode && renderAiEditPanelForSavedRecipe()}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg h-full flex flex-col justify-center items-center">
                  <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  Select a recipe from the list to view its details, upload an image, or edit it with AI.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Saved Recipe Shopping List */}
      <Modal
        isOpen={showSavedRecipeShoppingListModal}
        onClose={() => setShowSavedRecipeShoppingListModal(false)}
        title={`Shopping List for: ${selectedSavedRecipe?.name || ''}`}
        footer={<>
            <button onClick={() => setShowSavedRecipeShoppingListModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Close</button>
            <button 
                onClick={handleOrderMissingSavedRecipeItems} 
                disabled={savedRecipeShoppingListModalContent.filter(item => item.selected && !item.have).length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-md disabled:opacity-60"
            >
                Draft Order ({savedRecipeShoppingListModalContent.filter(item => item.selected && !item.have).length})
            </button>
        </>}
      >
        {isLoadingSavedRecipeRealisticList ? (
            <div className="flex justify-center items-center p-4"><LoadingSpinner /> <span className="ml-2">AI preparing smart list...</span></div>
        ) : savedRecipeShoppingListError && !Object.keys(groupedSavedRecipeShoppingList).length ? ( 
            <p className="text-red-600">{savedRecipeShoppingListError}</p>
        ) : (
            <>
                {savedRecipeShoppingListNotification && (
                    <div className="mb-3 p-2 text-sm bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                        {savedRecipeShoppingListNotification}
                    </div>
                )}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                     {Object.entries(groupedSavedRecipeShoppingList).map(([category, items]) => (
                        <div key={category}>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1 sticky top-0 bg-white py-1 border-b">{category}</h5>
                            {items.map(item => (
                                <div key={item.id} className="p-2.5 border-b border-gray-100 bg-white hover:bg-gray-50">
                                   <div className="flex items-center justify-between">
                                        <label className="flex items-center cursor-pointer flex-grow mr-2">
                                            <input 
                                                type="checkbox"
                                                checked={item.selected}
                                                onChange={() => toggleSavedRecipeShoppingListItem(item.id)}
                                                className="accent-primary w-4 h-4 mr-2.5 shrink-0"
                                                aria-label={`Select ${item.realisticItemName}`}
                                            />
                                            <div className="text-sm">
                                                <span className={`font-medium ${item.have ? 'text-green-600 line-through' : 'text-gray-800'}`}>{item.realisticItemName}</span>
                                                <span className="text-gray-600"> ({item.realisticQuantity})</span>
                                                {item.have && <span className="text-xs text-green-500 ml-1">(In Inventory)</span>}
                                            </div>
                                        </label>
                                         <button 
                                            onClick={() => handleOpenAlternativesForSavedRecipeShoppingItemModal(item)}
                                            title={`Substitutes for ${item.originalItemName}`}
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
      
      {/* Modal for Alternatives for Saved Recipe Shopping List Item */}
      <Modal
        isOpen={showAlternativesForSavedRecipeShoppingItemModal}
        onClose={() => setShowAlternativesForSavedRecipeShoppingItemModal(false)}
        title={`Alternatives for: ${shoppingListItemForSavedRecipeAlternatives?.originalItemName || ''}`}
        footer={<>
            {alternativeSuggestionsForSavedRecipeShoppingItem && !alternativesErrorForSavedRecipeShoppingItem && !isLoadingAlternativesForSavedRecipeShoppingItem && (
                <button 
                    onClick={handleApplySavedRecipeAlternativeAI} 
                    disabled={isLoadingApplySavedRecipeAlternative}
                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 disabled:opacity-60 flex items-center mr-auto"
                >
                    {isLoadingApplySavedRecipeAlternative ? <LoadingSpinner size="w-3 h-3 mr-1"/> : <SparklesIcon className="w-3 h-3 mr-1"/>} Apply Alternative (AI)
                </button>
            )}
            <button onClick={() => setShowAlternativesForSavedRecipeShoppingItemModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Close</button>
        </>}
      >
        {isLoadingAlternativesForSavedRecipeShoppingItem ? (
          <div className="flex justify-center items-center p-4"><LoadingSpinner /> <span className="ml-2">AI thinking of alternatives...</span></div>
        ) : alternativesErrorForSavedRecipeShoppingItem ? (
          <p className="text-red-600">{alternativesErrorForSavedRecipeShoppingItem}</p>
        ) : (
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2">Original Ingredient: <span className="text-primary">{shoppingListItemForSavedRecipeAlternatives?.originalItemName}</span></p>
            <p className="font-medium mb-1">AI Suggested Alternatives:</p>
            <div className="whitespace-pre-wrap max-h-[40vh] overflow-y-auto p-1 bg-gray-50 rounded border">
                {alternativeSuggestionsForSavedRecipeShoppingItem || "No specific suggestions provided by AI."}
            </div>
            {isLoadingApplySavedRecipeAlternative && <p className="text-xs text-blue-600 mt-2">AI updating recipe with alternative...</p>}
             <p className="text-xs text-gray-500 mt-4 pt-2 border-t border-gray-200">
                Note: Click "Apply Alternative (AI)" to attempt updating the saved recipe.
            </p>
          </div>
        )}
      </Modal>
    </SectionContainer>
  );
};

export default JournalAndRecipesSection;