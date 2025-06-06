
import React, { useState, useCallback } from 'react';
import { generateTextWithImage, parseGeminiJsonResponse, isApiKeySet } from '../services/geminiService';
import { FridgeAnalysisResult, UserProfile, WithUserProfile, Task, TaskStatus, KitchenInventoryItem } from '../types';
import FileUpload from './FileUpload';
import LoadingSpinner from './LoadingSpinner';
// SectionContainer will be provided by MyKitchenSection
import { CameraIcon, SparklesIcon, PlusCircleIcon, TrashIcon } from './Icons';

interface FridgeAnalyzerSectionProps extends WithUserProfile {
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'status'> & { status?: TaskStatus }) => void;
  kitchenInventory: KitchenInventoryItem[]; // Receive inventory
  onUpdateKitchenInventory: (inventory: KitchenInventoryItem[]) => void; // Function to update inventory
}

interface StagedInventoryItem {
    id: string; // Unique ID for key prop and easier manipulation
    name: string;
    quantity: string;
    isManuallyAdded: boolean;
}

const FridgeAnalyzerSection: React.FC<FridgeAnalyzerSectionProps> = ({ userProfile, onAddTask, kitchenInventory, onUpdateKitchenInventory }) => {
  const [uploadedImage, setUploadedImage] = useState<{ file: File; base64Data: string } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FridgeAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("Suggest 3 simple meal ideas using identified items, and list 5 essential grocery items I might be missing for a well-stocked kitchen for healthy eating.");
  
  const [stagedForInventory, setStagedForInventory] = useState<StagedInventoryItem[]>([]);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemQuantity, setManualItemQuantity] = useState('');

  const [inventoryUpdateSuccessMessage, setInventoryUpdateSuccessMessage] = useState<string>('');
  const [itemStagedNotification, setItemStagedNotification] = useState<string>('');


  const handleFileUpload = useCallback((file: File, base64Data: string) => {
    setUploadedImage({ file, base64Data });
    setAnalysisResult(null); 
    setError(null);
    setStagedForInventory([]);
    setManualItemName('');
    setManualItemQuantity('');
    setInventoryUpdateSuccessMessage('');
    setItemStagedNotification('');
  }, []);

  const handleAnalyzeFridge = useCallback(async () => {
    if (!isApiKeySet()) {
      setError("API Key not configured. Please set it up to use AI features.");
      return;
    }
    if (!uploadedImage) {
      setError("Please upload an image of your fridge first.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setAnalysisResult(null);
    setStagedForInventory([]);
    setInventoryUpdateSuccessMessage(''); // Clear previous success messages
    setItemStagedNotification('');   // Clear previous staged notifications

    const prompt = `Analyze the contents of this refrigerator image.
User's request: "${customPrompt}"
${userProfile?.butlerPersonaSummary ? `User context: ${userProfile.butlerPersonaSummary}. Consider dietary preferences like '${userProfile.dietaryRestrictions}' if mentioned. ` : ''}
Identify visible food items clearly.
Based on these items and the user's request, provide your suggestions.
Structure the output as JSON with keys "identifiedItems" (array of strings), "mealIdeas" (array of objects, each with "name", "description", and optionally "ingredients" as an array of strings based on identified items), and "missingEssentials" (array of strings for a generally well-stocked kitchen, considering user's likely preferences if context available).
Example: { "identifiedItems": ["Eggs", "Milk", "Lettuce"], "mealIdeas": [{"name": "Omelette", "description": "A quick and easy omelette.", "ingredients": ["Eggs", "Milk"]}], "missingEssentials": ["Chicken breast", "Whole wheat bread"] }`;

    try {
      const responseText = await generateTextWithImage(
        prompt,
        uploadedImage.base64Data,
        uploadedImage.file.type,
        "You are a helpful kitchen assistant analyzing fridge contents.",
        true, 
        userProfile
      );
      const parsedResult = parseGeminiJsonResponse<FridgeAnalysisResult>(responseText);
      if (parsedResult) {
        setAnalysisResult(parsedResult);
        if (parsedResult.identifiedItems) {
            const aiStagedItems = parsedResult.identifiedItems.map((name, index) => ({
                id: `ai-staged-${Date.now()}-${index}`,
                name,
                quantity: '1 unit (AI identified)', // Default editable quantity
                isManuallyAdded: false,
            }));
            setStagedForInventory(aiStagedItems);
        }
      } else {
        setError("Failed to parse analysis from AI response. The response might be malformed. Raw: " + responseText.substring(0,500) + "...");
        setAnalysisResult(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze fridge contents. " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImage, customPrompt, userProfile]);

  const handleCreateTaskFromAnalysis = () => {
    if (!analysisResult) return;
    let taskDescription = "Act on fridge analysis: ";
    if (analysisResult.mealIdeas?.length) {
      taskDescription += `Consider making: ${analysisResult.mealIdeas.map(idea => idea.name).join(', ')}. `;
    }
    if (analysisResult.missingEssentials?.length) {
      taskDescription += `Possibly buy: ${analysisResult.missingEssentials.join(', ')}.`;
    }
    onAddTask({
      title: "Fridge Analysis Follow-up",
      description: taskDescription,
      linkedContent: JSON.stringify(analysisResult),
      sourceSection: "Fridge",
      // status: TaskStatus.ONGOING // status is optional, defaults in App.tsx
    });
    alert("Task created from Fridge Analysis!");
  };

  const toggleAiIdentifiedItemInStagedList = (itemName: string) => {
    setStagedForInventory(prev => {
        const existingIndex = prev.findIndex(item => item.name === itemName && !item.isManuallyAdded);
        if (existingIndex > -1) {
            return prev.filter((_, index) => index !== existingIndex); 
        } else {
            return [...prev, { id: `ai-staged-${Date.now()}-${itemName}`, name: itemName, quantity: '1 unit (AI identified)', isManuallyAdded: false }]; 
        }
    });
  };
  
  const handleAddManualItemToStagedList = () => {
    if (!manualItemName.trim()) {
        alert("Please enter a name for the item you want to add manually.");
        return;
    }
    const trimmedName = manualItemName.trim();
    if (stagedForInventory.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
        alert(`"${trimmedName}" is already staged or identified. You can adjust its quantity there if needed, or remove it and re-add if it's a different item.`);
        return;
    }
    const newItem: StagedInventoryItem = {
      id: `manual-staged-${Date.now()}-${trimmedName}`,
      name: trimmedName,
      quantity: manualItemQuantity.trim() || '1 unit (manual)',
      isManuallyAdded: true
    };
    setStagedForInventory(prev => [...prev, newItem]);
    setItemStagedNotification(`"${trimmedName}" staged for inventory.`);
    setTimeout(() => setItemStagedNotification(''), 3000);
    setManualItemName('');
    setManualItemQuantity('');
  };

  const handleRemoveFromStagedList = (itemIdToRemove: string) => {
    setStagedForInventory(prev => prev.filter(item => item.id !== itemIdToRemove));
  };

  const handleUpdateStagedItemQuantity = (itemId: string, newQuantity: string) => {
    setStagedForInventory(prev => 
        prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item)
    );
  };


  const handleConfirmAddToInventory = () => {
    if (stagedForInventory.length === 0) {
        alert("No items selected or manually added to add to inventory.");
        return;
    }
    const newInventoryItems: KitchenInventoryItem[] = stagedForInventory.map(item => ({
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${item.name.replace(/\s+/g, '')}`,
        name: item.name,
        quantity: item.quantity 
    }));

    const updatedInventory = [...kitchenInventory];
    newInventoryItems.forEach(newItem => {
        const existingIndex = updatedInventory.findIndex(existingItem => existingItem.name.toLowerCase() === newItem.name.toLowerCase());
        if (existingIndex > -1) {
            updatedInventory[existingIndex].quantity = newItem.quantity;
        } else {
            updatedInventory.push(newItem);
        }
    });
    
    onUpdateKitchenInventory(updatedInventory);
    setInventoryUpdateSuccessMessage(`${stagedForInventory.length} item(s) processed for your kitchen inventory!`);
    setTimeout(() => setInventoryUpdateSuccessMessage(''), 4000);
    setStagedForInventory([]); 
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-700 mb-1">Fridge Analyzer</h3>
      <p className="mb-4 text-neutral text-sm">Upload a picture of your fridge, and let AI suggest meals or identify missing items. You can then add identified items to your Kitchen Inventory.</p>
      
      <FileUpload onFileUpload={handleFileUpload} acceptedFileTypes="image/jpeg, image/png, image/webp" label="Upload Fridge Photo"/>

      {uploadedImage && (
        <div className="mt-4">
            <label htmlFor="customPromptFridge" className="block text-sm font-medium text-gray-700 mb-1">What should I look for or suggest?</label>
            <textarea
                id="customPromptFridge"
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-800" 
                placeholder="e.g., 'What healthy snacks can I make?', 'Any dinner ideas for tonight using these items?'"
            />
        </div>
      )}

      <button
        onClick={handleAnalyzeFridge}
        disabled={!uploadedImage || isLoading || !isApiKeySet()}
        className="mt-6 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 transition-colors"
        aria-label="Analyze my fridge contents"
      >
        {isLoading ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
        Analyze My Fridge
      </button>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md" role="alert">{error}</p>}
      {!isApiKeySet() && <p className="mt-4 text-sm text-amber-700 bg-amber-100 p-3 rounded-md">API Key not set. AI features are disabled.</p>}
      {inventoryUpdateSuccessMessage && <p className="mt-4 text-sm text-green-600 bg-green-100 p-3 rounded-md animate-fadeIn" role="status">{inventoryUpdateSuccessMessage}</p>}
      {itemStagedNotification && <p className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded-md animate-fadeIn" role="status">{itemStagedNotification}</p>}


      {analysisResult && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">Fridge Analysis:</h3>
            <button 
              onClick={handleCreateTaskFromAnalysis}
              title="Assign Fridge Analysis as Task"
              className="p-2 bg-green-100 hover:bg-green-200 rounded-full transition-colors"
              aria-label="Assign Fridge Analysis as Task"
            >
              <PlusCircleIcon className="w-5 h-5 text-secondary" />
            </button>
          </div>

           <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-700">
            <strong>Disclaimer:</strong> AI analysis might not be perfect. It can occasionally miss items or misidentify them. Please review the "Identified Items" list and the "Staged for Inventory" list carefully. Feel free to uncheck items, or use the "Manually Add Item" section below if the AI missed something.
          </div>
          
          {analysisResult.identifiedItems && analysisResult.identifiedItems.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg text-primary mb-2">AI Identified Items:</h4>
              <p className="text-xs text-gray-600 mb-2">Select items from this AI-generated list to stage them for your inventory. Uncheck items you don't want to add or that are incorrect.</p>
              <div className="space-y-1 max-h-40 overflow-y-auto mb-2 border p-2 rounded-md bg-white">
                  {analysisResult.identifiedItems.map((item, index) => (
                      <label key={`ai-check-${index}`} className="flex items-center text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded">
                          <input 
                              type="checkbox"
                              checked={stagedForInventory.some(stagedItem => stagedItem.name === item && !stagedItem.isManuallyAdded)}
                              onChange={() => toggleAiIdentifiedItemInStagedList(item)}
                              className="mr-2 accent-primary"
                          />
                          {item}
                      </label>
                  ))}
              </div>
            </div>
          )}

            <div className="mb-6 p-4 border border-blue-200 rounded-md bg-blue-50">
                <h5 className="font-medium text-primary mb-2">Manually Add Item (if AI missed something):</h5>
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-grow">
                        <label htmlFor="manualItemName" className="block text-xs font-medium text-gray-700">Item Name</label>
                        <input 
                            type="text" 
                            id="manualItemName"
                            value={manualItemName} 
                            onChange={(e) => setManualItemName(e.target.value)} 
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                            placeholder="e.g., Olive Oil"
                        />
                    </div>
                    <div className="sm:w-1/3">
                        <label htmlFor="manualItemQuantity" className="block text-xs font-medium text-gray-700">Quantity</label>
                        <input 
                            type="text" 
                            id="manualItemQuantity"
                            value={manualItemQuantity} 
                            onChange={(e) => setManualItemQuantity(e.target.value)} 
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                            placeholder="e.g., 1 bottle, 250g"
                        />
                    </div>
                    <button
                        onClick={handleAddManualItemToStagedList}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Add to Staged
                    </button>
                </div>
            </div>

            {stagedForInventory.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-semibold text-lg text-green-600 mb-2">Items Staged for Inventory:</h4>
                    <ul className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md bg-white">
                        {stagedForInventory.map((item) => (
                            <li key={item.id} className="flex justify-between items-center text-sm p-1.5 hover:bg-gray-50 rounded">
                                <div className="flex-grow">
                                    <span className="font-medium text-gray-800">{item.name}</span>
                                    {item.isManuallyAdded && <span className="text-blue-500 text-xs ml-1">(Manually Added)</span>}
                                    <input 
                                        type="text"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateStagedItemQuantity(item.id, e.target.value)}
                                        className="ml-2 text-xs text-gray-600 p-0.5 border-b border-gray-300 focus:border-primary outline-none"
                                        placeholder="Quantity"
                                    />
                                </div>
                                <button onClick={() => handleRemoveFromStagedList(item.id)} className="p-1 text-red-400 hover:text-red-600" title="Remove from staged list">
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={handleConfirmAddToInventory}
                        disabled={stagedForInventory.length === 0}
                        className="mt-3 w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 transition-colors disabled:opacity-60"
                    >
                        Confirm & Add Staged Items ({stagedForInventory.length}) to My Kitchen Inventory
                    </button>
                </div>
            )}


          {analysisResult.mealIdeas && analysisResult.mealIdeas.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg text-primary mb-2">Meal Ideas:</h4>
              <div className="space-y-4">
                {analysisResult.mealIdeas.map((idea, index) => (
                  <div key={index} className="p-4 bg-white rounded-md shadow border border-base_300">
                    <h5 className="font-bold text-gray-800">{idea.name}</h5>
                    <p className="text-sm text-neutral">{idea.description}</p>
                    {idea.ingredients && idea.ingredients.length > 0 && (
                        <p className="text-xs mt-1 text-gray-500">Key Ingredients: {idea.ingredients.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResult.missingEssentials && analysisResult.missingEssentials.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg text-primary mb-2">Missing Essentials (General):</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-neutral">
                {analysisResult.missingEssentials.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FridgeAnalyzerSection;
