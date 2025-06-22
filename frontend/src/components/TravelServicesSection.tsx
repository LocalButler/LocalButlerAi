
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateText, isApiKeySet } from '../services/geminiService';
import { UserProfile, WithUserProfile, ChatMessage, Task, TaskStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';
import SectionContainer from './SectionContainer';
import { AirplaneIcon, SparklesIcon, SendIcon, PlusCircleIcon } from './Icons'; // Changed SuitcaseIcon to AirplaneIcon

interface TravelServicesSectionProps extends WithUserProfile {
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'status'> & { status?: TaskStatus }) => void;
}

// Style for labels (dark text on light background)
const labelStyle = "block text-sm font-medium text-gray-700";
// Style for standard inputs (light background, dark text)
const textareaStyleLight = "mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-800 placeholder-gray-500";


const TravelServicesSection: React.FC<TravelServicesSectionProps> = ({ userProfile, onAddTask }) => {
  const [itinerary, setItinerary] = useState<string>('');
  const [specificNeeds, setSpecificNeeds] = useState<string>('');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(false); // For the first "Get Assistance"
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pre-fill travel preferences if available
    if (userProfile?.travelPreferences && !specificNeeds.includes(userProfile.travelPreferences)) {
      setSpecificNeeds(prevNeeds => prevNeeds ? `${prevNeeds}\nAlso, my general travel preferences: ${userProfile.travelPreferences}` : `My general travel preferences: ${userProfile.travelPreferences}`);
    }
  }, [userProfile, specificNeeds]); // Added specificNeeds to dependency array

  useEffect(() => {
    // Scroll to bottom of chat on new message
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleInitialAssistance = useCallback(async () => {
    if (!isApiKeySet()) {
      setError("API Key not configured. Please set it up to use AI features.");
      return;
    }
    if (!itinerary.trim() && !specificNeeds.trim()) {
      setError("Please provide either itinerary details or specific needs.");
      return;
    }
    setError(null);
    setIsLoadingInitial(true);
    setChatMessages([]); // Clear previous chat

    const prompt = `You are a luxury travel concierge AI. The user requires assistance with their travel plans.
Itinerary Details:
${itinerary || "Not specified."}

Specific Needs / Requests (e.g., late-night snacks, hotel room service requests, special arrangements):
${specificNeeds || "Not specified."}

${userProfile?.butlerPersonaSummary ? `User Persona Context: ${userProfile.butlerPersonaSummary}. ` : ''}
${userProfile?.dietaryRestrictions ? `User has dietary preferences: ${userProfile.dietaryRestrictions}. Keep this in mind for food-related requests. ` : ''}

Please provide helpful suggestions, draft messages (e.g., to a hotel), list available options for requests like late-night snacks based on typical high-end hotel offerings, or offer advice. Be polite, thorough, and anticipate potential needs. If drafting a message, use placeholders like "[Hotel Name]" or "[Guest Name]". Structure your response clearly. This is the start of our conversation.`;

    try {
      const responseText = await generateText(prompt, "You are a highly capable luxury travel concierge providing personalized assistance.", false, userProfile);
      setChatMessages([{ 
        id: `ai-${Date.now()}`, 
        sender: 'ai', 
        text: responseText, 
        timestamp: new Date().toISOString() 
      }]);
    } catch (err) {
      console.error(err);
      setError("Failed to get travel assistance. " + (err as Error).message);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [itinerary, specificNeeds, userProfile]);

  const handleSendChatMessage = async () => {
    if (!currentChatMessage.trim() || !isApiKeySet() || isAiTyping) return;

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: currentChatMessage,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, newUserMessage]);
    setCurrentChatMessage('');
    setIsAiTyping(true);
    setError(null);

    const conversationHistory = [...chatMessages, newUserMessage]
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Butler AI'}: ${msg.text}`)
      .join('\n\n');
    
    const prompt = `Continue the travel assistance conversation.
${userProfile?.butlerPersonaSummary ? `User Persona Context: ${userProfile.butlerPersonaSummary}. ` : ''}
${userProfile?.dietaryRestrictions ? `User has dietary preferences: ${userProfile.dietaryRestrictions}. ` : ''}
Conversation History:
${conversationHistory}

User's latest message: ${currentChatMessage}

Respond to the user's latest message, keeping the context of the entire conversation. Be helpful and maintain the concierge persona.`;

    try {
      const responseText = await generateText(prompt, "You are a highly capable luxury travel concierge continuing a conversation.", false, userProfile);
      setChatMessages(prev => [...prev, { 
        id: `ai-${Date.now()}`, 
        sender: 'ai', 
        text: responseText, 
        timestamp: new Date().toISOString() 
      }]);
    } catch (err) {
      console.error(err);
      setError("AI failed to respond. " + (err as Error).message);
       setChatMessages(prev => [...prev, { 
        id: `ai-error-${Date.now()}`, 
        sender: 'ai', 
        text: "I'm sorry, I encountered an issue trying to respond. Please try again or rephrase your request.",
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };
  
  const handleCreateTaskFromMessage = (message: ChatMessage) => {
    onAddTask({
      title: `Travel Task: ${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}`,
      description: `Task related to travel query: "${message.text}"`,
      linkedContent: JSON.stringify(message),
      sourceSection: "Travel",
      status: TaskStatus.ONGOING 
    });
    alert("Task created from travel message!"); // Confirmation alert
  };


  return (
    <SectionContainer title="Travel Concierge" icon={<AirplaneIcon className="w-8 h-8" />}> {/* Changed Icon */}
      <p className="mb-4 text-neutral">
        Your personal travel assistant. Share your itinerary and needs to start. Then, chat with your Butler AI for further assistance.
      </p>
      
      {!chatMessages.length && (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="itinerary" className={labelStyle}>Travel Itinerary</label>
              <textarea
                id="itinerary"
                rows={4}
                value={itinerary}
                onChange={(e) => setItinerary(e.target.value)}
                className={textareaStyleLight}
                placeholder="e.g., Dates, flight numbers, hotel name and address, planned activities."
              />
            </div>
            <div>
              <label htmlFor="specificNeeds" className={labelStyle}>Specific Needs & Requests (Initial)</label>
              <textarea
                id="specificNeeds"
                rows={4}
                value={specificNeeds}
                onChange={(e) => setSpecificNeeds(e.target.value)}
                className={textareaStyleLight}
                placeholder="e.g., 'Request late check-out at The Grand Hotel.', 'Need ideas for healthy late-night snacks...'"
              />
            </div>
          </div>
          <button
            onClick={handleInitialAssistance}
            disabled={isLoadingInitial || (!itinerary.trim() && !specificNeeds.trim()) || !isApiKeySet()}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
            aria-label="Get Initial Travel Assistance"
          >
            {isLoadingInitial ? <LoadingSpinner size="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
            Get Travel Assistance
          </button>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md" role="alert">{error}</p>}
      {!isApiKeySet() && <p className="mt-4 text-sm text-amber-700 bg-amber-100 p-3 rounded-md">API Key not set. AI features are disabled.</p>}

      {chatMessages.length > 0 && (
        <div className="mt-8 animate-fadeIn">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Travel Chat:</h3>
          <div 
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg shadow border border-base_300 mb-4 space-y-4"
          >
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl p-3 rounded-xl shadow ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-gray-800'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                   {msg.sender === 'ai' && (
                      <button 
                        onClick={() => handleCreateTaskFromMessage(msg)}
                        title="Assign this AI response as a task"
                        className="mt-2 p-1 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                        aria-label="Assign as task"
                      >
                        <PlusCircleIcon className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                </div>
              </div>
            ))}
            {isAiTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs p-3 rounded-lg bg-white text-gray-800 shadow">
                  <LoadingSpinner size="w-5 h-5" />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <textarea
              value={currentChatMessage}
              onChange={(e) => setCurrentChatMessage(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); }}}
              placeholder="Ask a follow-up question or make a request..."
              rows={2}
              className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary resize-none bg-white text-gray-800"
              disabled={isAiTyping || !isApiKeySet()}
            />
            <button
              onClick={handleSendChatMessage}
              disabled={isAiTyping || !currentChatMessage.trim() || !isApiKeySet()}
              className="p-3 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
              aria-label="Send chat message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
           <button
            onClick={() => { setChatMessages([]); setItinerary(''); setSpecificNeeds(''); setError(null);}}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Start New Travel Query
          </button>
        </div>
      )}
    </SectionContainer>
  );
};

export default TravelServicesSection;
