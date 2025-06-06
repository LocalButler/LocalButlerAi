
// This file's functionality has been moved into components/DietarySection.tsx
// It is no longer used directly and can be considered deprecated or removed.
// Keeping it here to avoid breaking existing file structure if not explicitly asked to delete.

import React from 'react';
const RecipeBookSubSection_DEPRECATED: React.FC = () => {
    return (
        <div>
            Recipe Book functionality has moved to the Meal Planner section.
        </div>
    );
};
export default RecipeBookSubSection_DEPRECATED;
// Original content below is commented out for reference of what was moved.
/*
import React, { useState, useCallback } from 'react';
import { SavedRecipe, RecipeIngredient, YouTubeRecommendation, Recipe } from '../types'; // Added Recipe here
import { TrashIcon, PencilIcon, BookOpenIcon, PlusCircleIcon, CameraIcon, SparklesIcon, XMarkIcon } from './Icons';
import FileUpload from './FileUpload';
import { generateText, isApiKeySet, parseGeminiJsonResponse } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface RecipeBookSubSectionProps {
  savedRecipes: SavedRecipe[];
  onUpdateRecipes: (recipes: SavedRecipe[]) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

const RecipeBookSubSection: React.FC<RecipeBookSubSectionProps> = ({ 
    savedRecipes, 
    onUpdateRecipes, 
    onDeleteRecipe,
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [isAiEditingMode, setIsAiEditingMode] = useState<boolean>(false);
  const [aiEditPrompt, setAiEditPrompt] = useState<string>('');
  const [stagedImageUrlForAiEdit, setStagedImageUrlForAiEdit] = useState<string | undefined>(undefined);
  
  const [isLoadingAiUpdate, setIsLoadingAiUpdate] = useState<boolean>(false);
  const [aiEditError, setAiEditError] = useState<string | null>(null);
  const [imageUploadSuccessMessage, setImageUploadSuccessMessage] = useState<string>('');


  const handleSelectRecipe = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    setIsAiEditingMode(false); 
    setAiEditPrompt('');
    setAiEditError(null);
    setImageUploadSuccessMessage('');
    setStagedImageUrlForAiEdit(recipe.imageUrl);
  };

  const handleDeleteRecipeLocal = (recipeId: string) => {
    // Confirmation is removed from App.tsx's onDeleteRecipe
    onDeleteRecipe(recipeId); 
    if (selectedRecipe?.id === recipeId) {
      setSelectedRecipe(null);
      setIsAiEditingMode(false);
    }
  };

  const handleStartAiEdit = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe); // Ensure the selected recipe is the one being edited
    setIsAiEditingMode(true);
    setAiEditPrompt('');
    setAiEditError(null);
    setImageUploadSuccessMessage('');
    setStagedImageUrlForAiEdit(recipe.imageUrl); // Initialize staged image with current
  };

  const handleCancelAiEdit = () => {
    setIsAiEditingMode(false);
    setAiEditPrompt('');
    setAiEditError(null);
    setImageUploadSuccessMessage('');
    // If selectedRecipe exists, reset stagedImageUrl to its actual imageUrl
    if (selectedRecipe) {
      setStagedImageUrlForAiEdit(selectedRecipe.imageUrl);
    }
  };
  
  const handleImageUploadForRecipe = (file: File, base64Data: string) => {
    if (!selectedRecipe) return;

    const newImageUrl = `data:${file.type};base64,${base64Data}`;
    
    if (isAiEditingMode) {
        // If in AI edit mode, update the staged image URL
        setStagedImageUrlForAiEdit(newImageUrl);
        setImageUploadSuccessMessage('Image staged for AI update. Describe other changes or click "Update with AI".');
    } else {
        // If in view mode, save image update immediately
        const updatedRecipeWithNewImage = { ...selectedRecipe, imageUrl: newImageUrl };
        onUpdateRecipes(savedRecipes.map(r => r.id === selectedRecipe.id ? updatedRecipeWithNewImage : r));
        setSelectedRecipe(updatedRecipeWithNewImage); // Update view immediately
        setImageUploadSuccessMessage('Recipe image updated successfully!');
        setTimeout(() => setImageUploadSuccessMessage(''), 4000);
    }
  };

  const handleUpdateRecipeWithAI = useCallback(async () => {
    if (!selectedRecipe || !aiEditPrompt.trim() || !isApiKeySet()) {
        setAiEditError("Recipe context, AI prompt, or API key is missing.");
        return;
    }
    setIsLoadingAiUpdate(true);
    setAiEditError(null);
    setImageUploadSuccessMessage('');

    // Prepare the original recipe data, including the staged image URL if it was changed during AI edit mode
    const recipeForAI: SavedRecipe = {
        ...selectedRecipe,
        imageUrl: stagedImageUrlForAiEdit, // Use the potentially updated image URL
        // Ensure cookingTechniques and youtubeRecommendations are arrays
        cookingTechniques: selectedRecipe.cookingTechniques || [],
        youtubeRecommendations: selectedRecipe.youtubeRecommendations || [],
    };

    const systemInstruction = `You are a recipe modification expert.
Given an original recipe (JSON format) and a user's modification request, update the recipe.
Your response MUST be a single JSON object representing the complete updated recipe.
The JSON object must include all original fields if they are still applicable, and reflect the requested changes.
Fields to include: "name", "description", "ingredients" (array of objects: name, quantity, unit), "instructions" (array of strings), "prepTime", "cookTime", "servings", "cookingTechniques" (array of strings), "youtubeRecommendations" (array of objects: title, url, videoId), and "imageUrl" (string).
Preserve original "youtubeRecommendations" and "imageUrl" unless the user's request directly implies changes to them.
Ensure "cookingTechniques" are relevant and beginner-friendly for any modified parts of the recipe.
If servings change, adjust ingredient quantities and potentially instructions.
If dietary changes are requested (e.g., vegan), modify ingredients and instructions accordingly.
Maintain the general structure and style of the original recipe where possible.`;

    const prompt = `Original Recipe (JSON):
${JSON.stringify(recipeForAI)}

User's modification request:
"${aiEditPrompt}"

Please provide the complete updated recipe as a JSON object.`;

    try {
        const responseText = await generateText(prompt, systemInstruction, true); // Pass userProfile if needed by generateText
        const parsedUpdatedRecipe = parseGeminiJsonResponse<Recipe>(responseText); // Expecting Recipe, not SavedRecipe, from AI

        if (parsedUpdatedRecipe && parsedUpdatedRecipe.name && parsedUpdatedRecipe.ingredients && parsedUpdatedRecipe.instructions) {
            const fullyUpdatedSavedRecipe: SavedRecipe = {
                ...selectedRecipe, // Spread original to keep id, dateSaved, source
                ...parsedUpdatedRecipe, // Spread AI's updates (name, desc, ingredients etc.)
                // Explicitly ensure cookingTechniques and youtubeRecommendations are arrays
                cookingTechniques: parsedUpdatedRecipe.cookingTechniques || [],
                youtubeRecommendations: parsedUpdatedRecipe.youtubeRecommendations || [],
                 // Ensure imageUrl from AI response is used, or fallback to staged/original if AI omits it
                imageUrl: parsedUpdatedRecipe.imageUrl !== undefined ? parsedUpdatedRecipe.imageUrl : stagedImageUrlForAiEdit,
            };
            
            onUpdateRecipes(savedRecipes.map(r => r.id === selectedRecipe.id ? fullyUpdatedSavedRecipe : r));
            setSelectedRecipe(fullyUpdatedSavedRecipe);
            setIsAiEditingMode(false);
            setAiEditPrompt('');
            setImageUploadSuccessMessage('Recipe updated successfully by AI!');
            setTimeout(() => setImageUploadSuccessMessage(''), 4000);
        } else {
            setAiEditError("AI failed to update the recipe or the response was malformed. Raw: " + responseText.substring(0,300));
        }
    } catch (err) {
        setAiEditError("Error updating recipe with AI: " + (err as Error).message);
    } finally {
        setIsLoadingAiUpdate(false);
    }
  }, [selectedRecipe, aiEditPrompt, onUpdateRecipes, savedRecipes, stagedImageUrlForAiEdit]);


  const handleUseRecipeForPlanner = (recipe: SavedRecipe) => {
    alert(`Feature to directly use "${recipe.name}" in planner coming soon! For now, you can copy its name to the 'Copycat Recipe' field in Meal Planner.`);
  };


  const renderRecipeDetails = (recipeToDisplay: SavedRecipe) => (
    <>
        <div className="flex justify-between items-start mb-3">
            <h4 className="text-2xl font-bold text-primary break-words">{recipeToDisplay.name}</h4>
            {!isAiEditingMode && (
                <div className="flex-shrink-0 space-x-2">
                     <button 
                        onClick={() => handleStartAiEdit(recipeToDisplay)}
                        className="p-1.5 text-blue-600 hover:text-blue-800"
                        title="Edit this recipe with AI"
                    >
                       <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => handleUseRecipeForPlanner(recipeToDisplay)} 
                        className="p-1.5 text-secondary hover:text-emerald-700"
                        title="Use this recipe for planning (coming soon)"
                    >
                       <PlusCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>

        {(isAiEditingMode ? stagedImageUrlForAiEdit : recipeToDisplay.imageUrl) && (
            <img src={(isAiEditingMode ? stagedImageUrlForAiEdit : recipeToDisplay.imageUrl)} alt={recipeToDisplay.name} className="w-full h-56 object-cover rounded-md mb-4 shadow-lg" />
        )}
         <div className="mb-3">
             <FileUpload 
                onFileUpload={handleImageUploadForRecipe} 
                label={(isAiEditingMode ? stagedImageUrlForAiEdit : recipeToDisplay.imageUrl) ? "Change Recipe Image" : "Upload Recipe Image"}
                acceptedFileTypes="image/jpeg, image/png, image/gif"
            />
            {imageUploadSuccessMessage && <p className="text-xs text-green-600 mt-1">{imageUploadSuccessMessage}</p>}
        </div>

        {recipeToDisplay.description && <p className="text-sm text-neutral mb-3 italic">{recipeToDisplay.description}</p>}
        
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
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 pl-4">
                    {recipeToDisplay.cookingTechniques.map((technique, i) => (
                        <li key={`tech-${i}`}>{technique}</li>
                    ))}
                </ul>
            </div>
        )}
        {recipeToDisplay.youtubeRecommendations && recipeToDisplay.youtubeRecommendations.length > 0 && (
            <div className="mb-3">
                <h5 className="font-semibold text-gray-700 text-sm mb-1 flex items-center">Video Recommendations:</h5>
                <ul className="space-y-1 text-xs pl-4">
                    {recipeToDisplay.youtubeRecommendations.map((rec, i) => (
                        <li key={`yt-${i}`} className="flex items-center">
                            <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline truncate" title={rec.title}>
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

  const renderAiEditPanel = () => (
    <div className="mt-6 pt-4 border-t border-dashed border-blue-400">
        <h5 className="text-md font-semibold text-blue-700 mb-2">Edit with AI Assistant</h5>
        <p className="text-xs text-gray-600 mb-2">Describe the changes you'd like to make to this recipe. The AI will attempt to update it for you.</p>
        
        <textarea 
            value={aiEditPrompt}
            onChange={(e) => setAiEditPrompt(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary bg-white"
            placeholder="e.g., 'Make this recipe vegan and for 2 people', 'Replace chicken with 1lb of tofu', 'Add instructions for air fryer'"
        />
        {aiEditError && <p className="text-xs text-red-500 mt-1">{aiEditError}</p>}
        
        <div className="mt-3 flex items-center justify-between">
            <button
                onClick={handleUpdateRecipeWithAI}
                disabled={isLoadingAiUpdate || !aiEditPrompt.trim() || !isApiKeySet()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-60 flex items-center"
            >
                {isLoadingAiUpdate ? <LoadingSpinner size="w-4 h-4 mr-2"/> : <SparklesIcon className="w-4 h-4 mr-2"/>} Update with AI
            </button>
            <button
                onClick={handleCancelAiEdit}
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
                <li>Flavor adjustments: "Make it spicier", "Add more herbs like basil and oregano".</li>
                <li>Technique changes: "Adapt instructions for an Instant Pot", "Add baking instructions instead of frying".</li>
            </ul>
        </div>
    </div>
  );


  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-700 mb-1">My Recipe Book</h3>
      <p className="text-sm text-neutral mb-4">
        Your personal collection of saved recipes. Add recipes from the Meal Planner, or edit them here using AI assistance, including techniques and images.
      </p>

      {savedRecipes.length === 0 ? (
        <p className="text-gray-500 text-center py-6">Your recipe book is empty. Save recipes from the Meal Planner's "Copycat Recipe" feature!</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-x-6">
          {/* Recipe List */}
          {/* <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2 space-y-3 md:border-r md:border-gray-200 md:pr-4">
            <h4 className="text-lg font-medium text-primary mb-2 sticky top-0 bg-white py-2 z-10">Saved Recipes ({savedRecipes.length})</h4>
            {savedRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                onClick={() => handleSelectRecipe(recipe)}
                className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-lg 
                            ${isAiEditingMode && selectedRecipe?.id === recipe.id ? 'bg-blue-100 border-blue-600 shadow-xl ring-2 ring-blue-500' : 
                             selectedRecipe?.id === recipe.id ? 'bg-blue-50 border-primary shadow-md' : 
                             'bg-gray-50 border-gray-200 hover:border-blue-300'}`}
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
                        <button onClick={(e) => { e.stopPropagation(); handleStartAiEdit(recipe); }} className="p-1 text-blue-500 hover:text-blue-700" title="Edit Recipe with AI"><PencilIcon className="w-4 h-4"/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRecipeLocal(recipe.id); }} className="p-1 text-red-500 hover:text-red-700" title="Delete Recipe"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                </div>
                {recipe.description && <p className="text-xs text-gray-500 mt-1 truncate" title={recipe.description}>{recipe.description}</p>}
              </div>
            ))}
          </div> */}

          {/* Selected Recipe Detail or Edit Form */}
          // <div className="sticky top-4">
          //   {selectedRecipe ? (
          //     <div className="p-4 bg-white rounded-lg shadow-xl border border-primary max-h-[calc(100vh-150px)] overflow-y-auto">
          //       {renderRecipeDetails(selectedRecipe)}
          //       {isAiEditingMode && renderAiEditPanel()}
          //     </div>
          //   ) : (
          //     <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg h-full flex flex-col justify-center items-center">
          //       <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          //       Select a recipe from the list to view its details, upload an image, or edit it with AI.
          //     </div>
          //   )}
          // </div>
        // </div>
      // )}
    // </div>
  // );
// };

// export default RecipeBookSubSection;
