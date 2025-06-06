
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { generateText, isApiKeySet } from '../services/geminiService';
import SectionContainer from './SectionContainer';
import { UserCircleIcon, SparklesIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';
import { DIETARY_PREFERENCES_OPTIONS, AVAILABLE_SERVICE_TYPES, COOKING_COMPLEXITY_OPTIONS } from '../constants';

interface UserProfileSectionProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile | null) => void;
  onLoginChange: (loggedIn: boolean) => void; // To simulate login based on profile presence
}

const inputStyle = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const selectStyle = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white border-gray-600 focus:ring-primary focus:border-primary";
const textareaStyle = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const labelStyle = "block text-sm font-medium text-gray-700";


const UserProfileSection: React.FC<UserProfileSectionProps> = ({ userProfile, onProfileUpdate, onLoginChange }) => {
  const [mainGoals, setMainGoals] = useState(userProfile?.mainGoals || '');
  const [dietaryRestrictions, setDietaryRestrictions] = useState(userProfile?.dietaryRestrictions || '');
  const [customDietary, setCustomDietary] = useState('');
  const [frequentServices, setFrequentServices] = useState(userProfile?.frequentServices || '');
  const [travelPreferences, setTravelPreferences] = useState(userProfile?.travelPreferences || '');
  const [butlerPersonaSummary, setButlerPersonaSummary] = useState(userProfile?.butlerPersonaSummary || '');
  
  const [avoidIngredients, setAvoidIngredients] = useState(userProfile?.avoidIngredients || '');
  const [cookingComplexity, setCookingComplexity] = useState(userProfile?.cookingComplexity || 'No Preference');
  const [favoriteCuisines, setFavoriteCuisines] = useState(userProfile?.favoriteCuisines || '');

  const [isLoadingPersona, setIsLoadingPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.dietaryRestrictions) {
        if (!DIETARY_PREFERENCES_OPTIONS.includes(userProfile.dietaryRestrictions)) {
            setDietaryRestrictions("Other");
            setCustomDietary(userProfile.dietaryRestrictions);
        } else {
            setDietaryRestrictions(userProfile.dietaryRestrictions);
        }
    } else {
        setDietaryRestrictions(''); 
        setCustomDietary('');
    }
    setMainGoals(userProfile?.mainGoals || '');
    setFrequentServices(userProfile?.frequentServices || '');
    setTravelPreferences(userProfile?.travelPreferences || '');
    setButlerPersonaSummary(userProfile?.butlerPersonaSummary || '');
    setAvoidIngredients(userProfile?.avoidIngredients || '');
    setCookingComplexity(userProfile?.cookingComplexity || 'No Preference');
    setFavoriteCuisines(userProfile?.favoriteCuisines || '');
  }, [userProfile]);

  const handleSaveProfile = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    const finalDietary = dietaryRestrictions === "Other" ? customDietary : dietaryRestrictions;
    const updatedProfile: UserProfile = {
      mainGoals,
      dietaryRestrictions: finalDietary,
      frequentServices,
      travelPreferences,
      butlerPersonaSummary,
      avoidIngredients,
      cookingComplexity,
      favoriteCuisines,
    };
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    onProfileUpdate(updatedProfile);
    onLoginChange(true); 
    setSuccessMessage("Profile saved successfully! Your Local Butler AI is now more personalized.");
    window.scrollTo(0, 0);
  }, [mainGoals, dietaryRestrictions, customDietary, frequentServices, travelPreferences, butlerPersonaSummary, avoidIngredients, cookingComplexity, favoriteCuisines, onProfileUpdate, onLoginChange]);
  
  const handleGeneratePersona = useCallback(async () => {
    if (!isApiKeySet()) {
      setError("API Key not configured. Cannot generate persona.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsLoadingPersona(true);
    
    const finalDietary = dietaryRestrictions === "Other" ? customDietary : dietaryRestrictions;
    const profileInfo = `
      Main Goals: ${mainGoals || "Not specified"}
      Dietary Restrictions/Preferences: ${finalDietary || "None specified"}
      Ingredients to Always Avoid: ${avoidIngredients || "None specified"}
      Preferred Cooking Complexity: ${cookingComplexity || "No Preference"}
      Favorite Cuisines: ${favoriteCuisines || "None specified"}
      Frequently Used Services: ${frequentServices || "Not specified"}
      Travel Preferences: ${travelPreferences || "Not specified"}
    `;

    const prompt = `Based on the following user preferences:
${profileInfo}
Create a concise "Butler Persona Profile" summary (max 100 words, written in a friendly, slightly formal butler tone). This summary will help the Local Butler AI understand and assist the user better. Focus on key characteristics, needs, and preferences indicated. Example: "It appears Madam/Sir is focused on [main goal], prefers [dietary style] cuisine, avoiding [avoid ingredients], and enjoys [complexity] cooking of [cuisines]. They often require assistance with [services]. Travel preferences lean towards [travel style]. I shall endeavor to provide efficient and personalized support accordingly."`;

    try {
      const summary = await generateText(prompt, "You are an AI that creates concise user persona summaries for a virtual butler service.");
      setButlerPersonaSummary(summary);
      setSuccessMessage("Butler Persona Profile generated!");
    } catch (err) {
      console.error(err);
      setError("Failed to generate persona summary. " + (err as Error).message);
    } finally {
      setIsLoadingPersona(false);
    }
  }, [mainGoals, dietaryRestrictions, customDietary, frequentServices, travelPreferences, avoidIngredients, cookingComplexity, favoriteCuisines]);
  
  const handleClearProfile = useCallback(() => {
    localStorage.removeItem('userProfile');
    onProfileUpdate(null);
    onLoginChange(false); 
    setSuccessMessage("Profile cleared. You can set it up again anytime.");
    window.scrollTo(0, 0);
  }, [onProfileUpdate, onLoginChange]);

  return (
    <SectionContainer title="My Profile" icon={<UserCircleIcon className="w-8 h-8" />}>
      <p className="mb-6 text-neutral">
        Help your Local Butler AI understand your needs better. Your preferences are saved locally in your browser.
      </p>

      {successMessage && <p className="mb-4 text-sm text-green-600 bg-green-100 p-3 rounded-md" role="status">{successMessage}</p>}
      {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md" role="alert">{error}</p>}

      <div className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        <div>
          <label htmlFor="mainGoals" className={labelStyle}>What are your main goals for using Local Butler AI?</label>
          <textarea
            id="mainGoals"
            rows={3}
            value={mainGoals}
            onChange={(e) => setMainGoals(e.target.value)}
            className={textareaStyle}
            placeholder="e.g., Save time on meal planning, organize household services, get travel assistance."
          />
        </div>

        <div>
          <label htmlFor="dietaryRestrictions" className={labelStyle}>Dietary Preferences/Restrictions</label>
          <select
            id="dietaryRestrictions"
            value={dietaryRestrictions}
            onChange={(e) => {
              setDietaryRestrictions(e.target.value);
              if (e.target.value !== "Other") setCustomDietary('');
            }}
            className={selectStyle}
          >
            <option value="">Select or specify...</option>
            {DIETARY_PREFERENCES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            <option value="Other">Other (Specify below)</option>
          </select>
        </div>
        {dietaryRestrictions === "Other" && (
          <div>
            <label htmlFor="customDietary" className={labelStyle}>Specify Dietary Preference</label>
            <input
              type="text"
              id="customDietary"
              value={customDietary}
              onChange={(e) => setCustomDietary(e.target.value)}
              className={inputStyle}
              placeholder="e.g., Low FODMAP, specific allergies"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="avoidIngredients" className={labelStyle}>Ingredients to Always Avoid</label>
          <input
            type="text"
            id="avoidIngredients"
            value={avoidIngredients}
            onChange={(e) => setAvoidIngredients(e.target.value)}
            className={inputStyle}
            placeholder="e.g., cilantro, mushrooms, shellfish (comma-separated)"
          />
        </div>

        <div>
          <label htmlFor="cookingComplexity" className={labelStyle}>Preferred Cooking Complexity</label>
          <select
            id="cookingComplexity"
            value={cookingComplexity}
            onChange={(e) => setCookingComplexity(e.target.value)}
            className={selectStyle}
          >
            {COOKING_COMPLEXITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="favoriteCuisines" className={labelStyle}>Favorite Cuisines</label>
          <input
            type="text"
            id="favoriteCuisines"
            value={favoriteCuisines}
            onChange={(e) => setFavoriteCuisines(e.target.value)}
            className={inputStyle}
            placeholder="e.g., Italian, Mexican, Thai, Indian (comma-separated)"
          />
        </div>


        <div>
          <label htmlFor="frequentServices" className={labelStyle}>What local services do you use or anticipate using most frequently?</label>
          <input
            type="text"
            id="frequentServices"
            value={frequentServices}
            onChange={(e) => setFrequentServices(e.target.value)}
            className={inputStyle}
            placeholder={`e.g., ${AVAILABLE_SERVICE_TYPES[0]}, ${AVAILABLE_SERVICE_TYPES[1]}`}
          />
        </div>
        
        <div>
          <label htmlFor="travelPreferences" className={labelStyle}>Any specific travel preferences or needs?</label>
          <textarea
            id="travelPreferences"
            rows={3}
            value={travelPreferences}
            onChange={(e) => setTravelPreferences(e.target.value)}
            className={textareaStyle}
            placeholder="e.g., Prefer window seats, need hypoallergenic bedding, enjoy boutique hotels, specific late-night snack requests."
          />
        </div>

        {butlerPersonaSummary && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="text-md font-semibold text-primary mb-2">My Butler Persona Profile:</h4>
            <p className="text-sm text-gray-700 italic">{butlerPersonaSummary}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleGeneratePersona}
            disabled={isLoadingPersona || !isApiKeySet()}
            className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 transition-colors"
            aria-label="Generate Butler Persona Profile based on inputs"
          >
            {isLoadingPersona ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
            {butlerPersonaSummary ? "Regenerate" : "Generate"} Persona
          </button>
          <button
            onClick={handleSaveProfile}
            className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            aria-label="Save Profile Information"
          >
            Save Profile
          </button>
        </div>
         <button
            onClick={handleClearProfile}
            className="mt-4 w-full sm:w-auto px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            aria-label="Clear all profile information"
          >
            Clear Profile & Logout (Simulated)
          </button>
      </div>
    </SectionContainer>
  );
};

export default UserProfileSection;
