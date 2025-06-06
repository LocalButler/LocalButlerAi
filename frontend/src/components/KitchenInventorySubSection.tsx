
import React, { useState, useCallback, useEffect } from 'react';
import { KitchenInventoryItem, UserProfile, WithUserProfile } from '../types';
import { generateText, isApiKeySet, parseGeminiJsonResponse } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { PlusCircleIcon, SparklesIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from './Icons';

interface KitchenInventorySubSectionProps extends WithUserProfile {
  inventory: KitchenInventoryItem[];
  onUpdateInventory: (inventory: KitchenInventoryItem[]) => void;
}

const inputStyleDark = "flex-grow p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const quantityInputStyleDark = "sm:w-1/3 p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const editInputStyleDark = "flex-grow p-1 border rounded-md text-sm mr-2 bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const editQuantityInputStyleDark = "w-1/4 p-1 border rounded-md text-sm mr-2 bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";

const labelStyle = "block text-sm font-medium text-gray-700";


const KitchenInventorySubSection: React.FC<KitchenInventorySubSectionProps> = ({ inventory, onUpdateInventory, userProfile }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState('');

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [recipeIdeas, setRecipeIdeas] = useState<Array<{ name: string; description: string; ingredientsUsed?: string[] }>>([]);
  const [missingForStock, setMissingForStock] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const [newIdeasClickCount, setNewIdeasClickCount] = useState(0);
  const [showIngredientSelectionForIdeas, setShowIngredientSelectionForIdeas] = useState(false);
  const [selectedIngredientsForIdeas, setSelectedIngredientsForIdeas] = useState<string[]>([]);

  const [categorizedInventoryDisplay, setCategorizedInventoryDisplay] = useState<{ [category: string]: KitchenInventoryItem[] } | null>(null);
  const [isLoadingCategorization, setIsLoadingCategorization] = useState(false);
  const [categorizationError, setCategorizationError] = useState<string | null>(null);

  const handleCategorizeInventory = useCallback(async () => {
    if (!isApiKeySet()) {
      setCategorizationError("API Key not set. Cannot categorize inventory.");
      return;
    }
    if (inventory.length === 0) {
      setCategorizedInventoryDisplay(null);
      setCategorizationError(null);
      return;
    }
    setIsLoadingCategorization(true);
    setCategorizationError(null);

    const inventoryListForPrompt = inventory.map(item => ({ id: item.id, name: item.name, quantity: item.quantity }));

    const prompt = `Given these kitchen inventory items: ${JSON.stringify(inventoryListForPrompt)}.
Categorize each item into common grocery sections (e.g., "Produce", "Dairy & Alternatives", "Proteins", "Grains & Pasta", "Canned Goods", "Baking Supplies", "Spices & Seasonings", "Condiments & Sauces", "Snacks", "Beverages", "Frozen Foods", "Other").
Output as JSON: \`{[category: string]: {id: string, name: string, quantity: string}[]}\`.
The keys of the main JSON object should be the category names. Each value should be an array of item objects belonging to that category.
It's crucial that you include the original 'id', 'name', and 'quantity' for each item in your categorized output. Do not invent new items or omit existing ones.
If an item is hard to categorize, use "Other".`;

    try {
      const responseText = await generateText(prompt, "You are an expert kitchen inventory organizer. Categorize items into common grocery sections.", true, userProfile);
      const parsedCategorization = parseGeminiJsonResponse<{ [category: string]: KitchenInventoryItem[] }>(responseText);
      if (parsedCategorization && typeof parsedCategorization === 'object' && !Array.isArray(parsedCategorization)) {
        // Validate that all original items are present in the categorized list
        const allCategorizedItemIds = Object.values(parsedCategorization).flat().map(item => item.id);
        const originalItemIds = inventory.map(item => item.id);
        const missingItemIds = originalItemIds.filter(id => !allCategorizedItemIds.includes(id));

        if (missingItemIds.length > 0) {
            console.warn("AI categorization missed some items. Original:", inventory, "Categorized:", parsedCategorization);
            setCategorizationError("AI categorization was incomplete. Some items might be missing from categories. Displaying raw list.");
            setCategorizedInventoryDisplay(null); // Fallback to non-categorized display
        } else {
            setCategorizedInventoryDisplay(parsedCategorization);
        }
      } else {
        setCategorizationError("Failed to parse inventory categorization from AI. Displaying raw list.");
        setCategorizedInventoryDisplay(null); // Fallback
      }
    } catch (error) {
      setCategorizationError("Error categorizing inventory: " + (error as Error).message + ". Displaying raw list.");
      setCategorizedInventoryDisplay(null); // Fallback
    } finally {
      setIsLoadingCategorization(false);
    }
  }, [inventory, userProfile]);

  useEffect(() => {
    handleCategorizeInventory();
  }, [inventory, handleCategorizeInventory]);


  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: KitchenInventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: newItemName.trim(),
      quantity: newItemQuantity.trim() || '1 unit',
    };
    onUpdateInventory([...inventory, newItem]);
    setNewItemName('');
    setNewItemQuantity('');
  };

  const handleRemoveItem = (id: string) => {
    onUpdateInventory(inventory.filter(item => item.id !== id));
  };

  const handleStartEdit = (item: KitchenInventoryItem) => {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemQuantity(item.quantity);
  };

  const handleSaveEdit = () => {
    if (!editItemId || !editItemName.trim()) return;
    onUpdateInventory(
      inventory.map(item =>
        item.id === editItemId ? { ...item, name: editItemName.trim(), quantity: editItemQuantity.trim() || '1 unit' } : item
      )
    );
    setEditItemId(null);
    setEditItemName('');
    setEditItemQuantity('');
  };
  
  const handleGetAISuggestions = useCallback(async (isNewIdeasRequest = false, useSelectedItems = false) => {
    if (!isApiKeySet()) {
        setAiError("API Key not configured. AI suggestions disabled.");
        return;
    }
    if (inventory.length === 0 && !useSelectedItems) { 
        setAiError("Your inventory is empty. Add some items to get suggestions!");
        return;
    }
    
    setIsLoadingSuggestions(true);
    setRecipeIdeas([]);
    setMissingForStock([]);
    setAiError(null);

    if (isNewIdeasRequest) {
        setNewIdeasClickCount(prev => prev + 1);
    } else { 
        setNewIdeasClickCount(0);
        setShowIngredientSelectionForIdeas(false);
        setSelectedIngredientsForIdeas([]);
    }

    let currentInventoryList = inventory;
    if (useSelectedItems && selectedIngredientsForIdeas.length > 0) {
        currentInventoryList = inventory.filter(item => selectedIngredientsForIdeas.includes(item.id));
        if (currentInventoryList.length === 0) {
            setAiError("No items selected for focused ideas. Please select some items or try with all inventory.");
            setIsLoadingSuggestions(false);
            return;
        }
    }
    
    const inventoryListText = currentInventoryList.map(item => `${item.name} (${item.quantity})`).join(', ');

    let prompt = `Based on the user's current kitchen inventory: [${inventoryListText || 'No specific items selected, consider general pantry staples'}].
1. Suggest 2-3 simple recipe ideas using primarily these items. For each recipe, provide a name, a brief description, and list which inventory items are key.
2. Suggest 3-5 common grocery items the user might be missing for a generally well-stocked kitchen.
Structure your response as a JSON object with two keys: "recipeIdeas" (array of objects with "name", "description", "ingredientsUsed" which is an array of strings) and "missingForStock" (array of strings).
Example: { "recipeIdeas": [{"name": "Quick Scramble", "description": "A simple egg scramble.", "ingredientsUsed": ["Eggs", "Milk"]}], "missingForStock": ["Whole Wheat Bread", "Olive Oil"] }`;

    if (isNewIdeasRequest) {
        prompt = `Please provide *different* suggestions than before. ${prompt}`;
    }
    if (useSelectedItems && selectedIngredientsForIdeas.length > 0) {
        prompt = `Focusing on these selected items: [${inventoryListText}]. ${prompt}`;
    }

    try {
        const responseText = await generateText(prompt, "You are a helpful kitchen AI providing recipe ideas and stocking suggestions.", true, userProfile);
        const parsedResult = parseGeminiJsonResponse<{recipeIdeas: Array<{name:string; description:string; ingredientsUsed?:string[]}>; missingForStock: string[]}>(responseText);

        if (parsedResult) {
            setRecipeIdeas(parsedResult.recipeIdeas || []);
            setMissingForStock(parsedResult.missingForStock || []);
            if (isNewIdeasRequest && newIdeasClickCount + 1 >= 3 && !showIngredientSelectionForIdeas && inventory.length > 0) { 
                setShowIngredientSelectionForIdeas(true);
            }
        } else {
            setAiError("Failed to parse AI suggestions. Response: " + responseText.substring(0, 200));
        }
    } catch (error) {
        setAiError("Error getting AI suggestions: " + (error as Error).message);
    } finally {
        setIsLoadingSuggestions(false);
    }
  }, [inventory, userProfile, isApiKeySet, newIdeasClickCount, showIngredientSelectionForIdeas, selectedIngredientsForIdeas]);

  const toggleSelectedIngredientForIdeas = (itemId: string) => {
    setSelectedIngredientsForIdeas(prev => 
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleGetIdeasFromSelected = () => {
    if (selectedIngredientsForIdeas.length === 0) {
        alert("Please select at least one ingredient to focus ideas on.");
        return;
    }
    handleGetAISuggestions(true, true); 
  };

  const handleKeepTryingWithAll = () => {
    setShowIngredientSelectionForIdeas(false);
    setSelectedIngredientsForIdeas([]);
    handleGetAISuggestions(true, false); 
  };

  const renderInventoryItem = (item: KitchenInventoryItem, categoryName?: string) => (
    <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-between">
      {editItemId === item.id ? (
        <>
          <input
            type="text"
            value={editItemName}
            onChange={(e) => setEditItemName(e.target.value)}
            className={editInputStyleDark}
            aria-label="Edit item name"
          />
          <input
            type="text"
            value={editItemQuantity}
            onChange={(e) => setEditItemQuantity(e.target.value)}
            className={editQuantityInputStyleDark}
            aria-label="Edit item quantity"
          />
          <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:text-green-800" aria-label="Save edit">
             <CheckIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setEditItemId(null)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Cancel edit">
             <XMarkIcon className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <div>
            <span className="font-medium text-gray-700">{item.name}</span>
            <span className="text-sm text-gray-500 ml-2">({item.quantity})</span>
          </div>
          <div className="space-x-2">
            <button onClick={() => handleStartEdit(item)} className="p-1 text-blue-600 hover:text-blue-800" aria-label="Edit item">
              <PencilIcon className="w-4 h-4" />
            </button>
            <button onClick={() => handleRemoveItem(item.id)} className="p-1 text-red-500 hover:text-red-700" aria-label="Remove item">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );


  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-700 mb-1">My Kitchen Inventory</h3>
      <p className="text-sm text-neutral mb-4">
        Keep track of what's in your kitchen. This helps your Butler AI provide more personalized meal ideas, recipes, and shopping lists.
      </p>

      <div className="mb-6 p-4 border border-base_300 rounded-md bg-gray-50">
        <h4 className={`${labelStyle} mb-2`}>Add New Item</h4> 
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name (e.g., Flour, Eggs)"
            className={inputStyleDark}
            aria-label="New inventory item name"
          />
          <input
            type="text"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
            placeholder="Quantity (e.g., 1kg, 1 dozen)"
            className={quantityInputStyleDark}
            aria-label="New inventory item quantity"
          />
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            aria-label="Add item to inventory"
          >
            <PlusCircleIcon className="w-5 h-5 mr-1 sm:mr-2" /> Add
          </button>
        </div>
      </div>

      {isLoadingCategorization && (
        <div className="flex justify-center items-center py-6">
            <LoadingSpinner /> <p className="ml-2 text-neutral">AI is organizing your inventory...</p>
        </div>
      )}
      {categorizationError && (
        <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-3">{categorizationError}</p>
      )}

      {!isLoadingCategorization && inventory.length === 0 && (
        <p className="text-gray-500 text-center py-4">Your kitchen inventory is currently empty. Add some items!</p>
      )}
      
      {!isLoadingCategorization && inventory.length > 0 && (
        <div className="mb-6">
            {categorizedInventoryDisplay ? (
                Object.entries(categorizedInventoryDisplay).map(([category, items]) => (
                    items.length > 0 && (
                        <div key={category} className="mb-4">
                            <h4 className="text-md font-semibold text-primary mb-2 border-b border-blue-200 pb-1">{category} ({items.length})</h4>
                            <div className="space-y-3">
                                {items.map(item => renderInventoryItem(item, category))}
                            </div>
                        </div>
                    )
                ))
            ) : !categorizationError ? ( // Not loading, no error, but no categorized display (could be initial state or fallback)
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    <h4 className="text-md font-semibold text-gray-600 mb-2 border-b pb-1">All Items (Uncategorized)</h4>
                    {inventory.map(item => renderInventoryItem(item))}
                </div>
            ) : null // Error already shown, no categories means flat list was shown due to error
            }
        </div>
      )}
      
      <div className="mt-6 border-t pt-6">
        <h4 className="text-md font-semibold text-gray-700 mb-3">AI Kitchen Helper</h4>
        {aiError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-3">{aiError}</p>}
        {!isApiKeySet() && <p className="text-sm text-amber-700 bg-amber-100 p-2 rounded-md mb-3">API Key not set. AI suggestions are disabled.</p>}
        
        <div className="flex flex-col sm:flex-row gap-2">
            <button
                onClick={() => handleGetAISuggestions(false)} 
                disabled={isLoadingSuggestions || inventory.length === 0 || !isApiKeySet()}
                className="flex-1 flex items-center justify-center px-4 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 transition-colors"
                aria-label="Get AI recipe ideas and stocking suggestions"
              >
                {isLoadingSuggestions && !recipeIdeas.length ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                Get Ideas & Tips
            </button>
            {(recipeIdeas.length > 0 || missingForStock.length > 0) && (
                <button
                    onClick={() => handleGetAISuggestions(true)} 
                    disabled={isLoadingSuggestions || !isApiKeySet()}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                    {isLoadingSuggestions && recipeIdeas.length > 0 ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                    Get New Ideas ({newIdeasClickCount})
                </button>
            )}
        </div>


        {isLoadingSuggestions && <p className="text-sm text-neutral mt-2 text-center">AI is thinking...</p>}
        
        {showIngredientSelectionForIdeas && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700 mb-2">You've asked for new ideas a few times! Would you like to select specific ingredients to focus the next suggestions?</p>
                <div className="max-h-40 overflow-y-auto space-y-1 mb-3 border p-2 rounded-md bg-white">
                    {inventory.map(item => (
                        <label key={item.id} className="flex items-center text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded">
                            <input 
                                type="checkbox"
                                checked={selectedIngredientsForIdeas.includes(item.id)}
                                onChange={() => toggleSelectedIngredientForIdeas(item.id)}
                                className="mr-2 accent-primary"
                            />
                            {item.name} ({item.quantity})
                        </label>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={handleGetIdeasFromSelected}
                        disabled={isLoadingSuggestions || selectedIngredientsForIdeas.length === 0}
                        className="flex-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-60"
                    >
                        Get Ideas from Selected ({selectedIngredientsForIdeas.length})
                    </button>
                     <button
                        onClick={handleKeepTryingWithAll}
                        disabled={isLoadingSuggestions}
                        className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 disabled:opacity-60"
                    >
                        No, Keep Trying with All Items
                    </button>
                </div>
            </div>
        )}

        {(recipeIdeas.length > 0 || missingForStock.length > 0) && !isLoadingSuggestions && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-md">
                {recipeIdeas.length > 0 && (
                    <div>
                        <h5 className="font-semibold text-primary mb-2">Recipe Ideas Based on Your Inventory:</h5>
                        <div className="grid md:grid-cols-2 gap-3">
                        {recipeIdeas.map((idea, index) => (
                            <div key={index} className="p-3 bg-white rounded shadow border border-base_300">
                                <p className="font-bold text-gray-700">{idea.name}</p>
                                <p className="text-xs text-neutral mb-1">{idea.description}</p>
                                {idea.ingredientsUsed && <p className="text-xs text-gray-500">Uses: {idea.ingredientsUsed.join(', ')}</p>}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                 {missingForStock.length > 0 && (
                    <div className="mt-3">
                        <h5 className="font-semibold text-primary mb-2">Consider Adding to Your Pantry:</h5>
                        <ul className="list-disc list-inside text-sm text-neutral space-y-1">
                           {missingForStock.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default KitchenInventorySubSection;
