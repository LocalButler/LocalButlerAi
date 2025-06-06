
import React, { useState, useCallback } from 'react';
import { generateText, isApiKeySet } from '../services/geminiService';
import { ServiceType, UserProfile, WithUserProfile, Task, TaskStatus } from '../types';
import { AVAILABLE_SERVICE_TYPES, FORT_MEADE_AREA_INFO } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import SectionContainer from './SectionContainer';
import { BriefcaseIcon, SparklesIcon, PlusCircleIcon } from './Icons';

interface ServiceOrganizerSectionProps extends WithUserProfile {
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { status?: TaskStatus }) => void;
}

// Styles for input elements with dark background and white text
const inputStyle = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";
const selectStyle = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white border-gray-600 focus:ring-primary focus:border-primary";
const textareaStyle = "mt-1 block w-full p-2 border rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:ring-primary focus:border-primary";

// Style for labels (dark text on light background)
const labelStyle = "block text-sm font-medium text-gray-700";


const ServiceOrganizerSection: React.FC<ServiceOrganizerSectionProps> = ({ userProfile, onAddTask }) => {
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [customServiceType, setCustomServiceType] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  
  const [editableDraftContent, setEditableDraftContent] = useState<string>(''); 
  const [aiDraftWasGenerated, setAiDraftWasGenerated] = useState<boolean>(false); 

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMapInfo, setShowMapInfo] = useState<boolean>(false);

  const handleAIDraftRequest = useCallback(async () => {
     if (!isApiKeySet()) {
      setError("API Key not configured. Please set it up to use AI features.");
      setSuccessMessage(null);
      return;
    }
    
    const finalServiceType = serviceType === ServiceType.OTHER ? customServiceType : serviceType;

    if (!finalServiceType) {
      setError("Please select or specify a service type.");
      setSuccessMessage(null);
      return;
    }
    if (!details.trim()) {
      setError("Please provide some details for the service request.");
      setSuccessMessage(null);
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setEditableDraftContent(''); 
    setAiDraftWasGenerated(false);

    const prompt = `Draft a concise and polite service request message for the following:
Service Type: ${finalServiceType}
Details: ${details}
${userProfile?.butlerPersonaSummary ? `User context for tone/preferences: ${userProfile.butlerPersonaSummary}. ` : ''}
The message should be suitable for posting on a local community task board. It should be clear about the task required. Include placeholders like "[Your Preferred Contact Method]" or "[General Location/Neighborhood]" if appropriate. If it's for a specific area like Fort Meade, mention it. The user will post this for local helpers. Respond with only the drafted message text.`;

    try {
      const responseText = await generateText(prompt, "You are an assistant helping to draft clear and appealing service requests for a local marketplace.", false, userProfile);
      setEditableDraftContent(responseText); 
      setAiDraftWasGenerated(true); 
      setSuccessMessage("AI has drafted the request! Review and edit below, then save it.");
    } catch (err) {
      console.error(err);
      setError("Failed to draft service request. " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [serviceType, customServiceType, details, userProfile]);

  const handleCopyToClipboard = () => {
    if (editableDraftContent) {
      navigator.clipboard.writeText(editableDraftContent)
        .then(() => alert("Draft copied to clipboard!"))
        .catch(err => {
            console.error("Failed to copy: ", err);
            alert("Failed to copy to clipboard. Please copy manually.");
        });
    }
  };

  const handleSaveDraft = () => {
    if (!editableDraftContent.trim()) { 
        setError("The draft content is empty. Please generate or write a draft.");
        setSuccessMessage(null);
        return;
    }
    const finalServiceType = serviceType === ServiceType.OTHER ? customServiceType : serviceType;
    if (!finalServiceType) {
        setError("Service type is missing. Cannot save draft.");
        setSuccessMessage(null);
        return;
    }

    onAddTask({
      title: `DRAFT: ${finalServiceType || 'General Task'}`,
      description: editableDraftContent, 
      linkedContent: `Original user details: ${details}`, 
      sourceSection: "Services", 
      status: TaskStatus.DRAFT,
      bounty: undefined, // Bounty is not set by requester initially
    });
    setSuccessMessage(`Draft for "${finalServiceType}" saved! You can view, edit, and post it from "My Tasks" -> "My Drafts".`);
    setError(null);
    setEditableDraftContent(''); 
    setAiDraftWasGenerated(false);
    setDetails('');
    setServiceType('');
    setCustomServiceType('');
  };

  return (
    <SectionContainer title="Create a Service Task Draft" icon={<BriefcaseIcon className="w-8 h-8" />}>
      <p className="mb-4 text-neutral">Need help with a local task? Use the AI to draft a compelling request. You can then edit and save it as a draft, and post it to the Local Butler Marketplace from "My Tasks" when you're ready.</p>
      
      {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md" role="alert">{error}</p>}
      {successMessage && <p className="mb-4 text-sm text-green-600 bg-green-100 p-3 rounded-md" role="status">{successMessage}</p>}
      {!isApiKeySet() && <p className="mb-4 text-sm text-amber-700 bg-amber-100 p-3 rounded-md">API Key not set. AI features are disabled.</p>}


      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="serviceType" className={labelStyle}>Service Type</label>
          <select
            id="serviceType"
            value={serviceType}
            onChange={(e) => {
              setServiceType(e.target.value as ServiceType | '');
              if (e.target.value !== ServiceType.OTHER) setCustomServiceType('');
            }}
            className={selectStyle}
          >
            <option value="">Select a service...</option>
            {AVAILABLE_SERVICE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        {serviceType === ServiceType.OTHER && (
           <div>
            <label htmlFor="customServiceType" className={labelStyle}>Specify Service</label>
            <input
              type="text"
              id="customServiceType"
              value={customServiceType}
              onChange={(e) => setCustomServiceType(e.target.value)}
              className={inputStyle}
              placeholder="e.g., Mobile Notary, Tech Support"
            />
          </div>
        )}
        <div>
          <label htmlFor="details" className={labelStyle}>Details for Service Task</label>
          <textarea
            id="details"
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={textareaStyle}
            placeholder="e.g., 'Need pet sitter for 2 small dogs, next weekend (Fri-Sun) in Odenton. Include feeding and two 30-min walks per day.' or 'Weekly laundry pickup for 1 person in Severn, wash & fold. Needs to be hypoallergenic detergent.'"
          />
        </div>
      </div>

      <button
        onClick={handleAIDraftRequest}
        disabled={isLoading || (!serviceType && !customServiceType) || !details.trim() || !isApiKeySet()}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-accent hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
        aria-label="Use AI to Draft Service Request"
      >
        {isLoading ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
        Use AI to Draft Request
      </button>


      {aiDraftWasGenerated && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-gray-700">Review & Edit AI Draft:</h3>
             <button
                onClick={handleCopyToClipboard}
                className="px-3 py-1.5 bg-blue-100 text-primary text-xs font-medium rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-colors"
              >
                Copy Draft
            </button>
          </div>
          <textarea
            value={editableDraftContent}
            onChange={(e) => setEditableDraftContent(e.target.value)}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary mb-4 bg-white text-gray-800" 
            aria-label="Editable AI service request draft"
          />
          <button
            onClick={handleSaveDraft}
            disabled={!editableDraftContent.trim()}
            className="mt-4 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            aria-label="Save this draft"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Save Draft
          </button>
          
          <div className="mt-6 space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-semibold text-sm text-primary">Posting to Marketplace (Fort Meade Area)</h4>
              <p className="text-xs text-neutral mt-1">Once saved, you can post this draft to the marketplace from "My Tasks". {FORT_MEADE_AREA_INFO.mapPlaceholderText}</p>
              <button 
                onClick={() => setShowMapInfo(prev => !prev)} 
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                {showMapInfo ? "Hide Area Info" : "Show Area Info"}
              </button>
              {showMapInfo && <p className="text-xs text-neutral mt-1">Marketplace tasks are notionally available to helpers in areas like: {FORT_MEADE_AREA_INFO.surroundingAreas.join(', ')}.</p>}
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-semibold text-sm text-secondary">Scheduling & Payment Notes</h4>
              <p className="text-xs text-neutral mt-1">
                If your task is accepted from the marketplace, you'll coordinate details directly. Future updates aim to integrate Google Calendar for scheduling and Stripe for secure payments.
              </p>
            </div>
          </div>
        </div>
      )}
    </SectionContainer>
  );
};

export default ServiceOrganizerSection;
