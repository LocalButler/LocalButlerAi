import React, { useState } from 'react';
import SectionContainer from './SectionContainer';
import { generateText } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { useAuth0 } from '@auth0/auth0-react';

const demoPrompts = [
  "I'm feeling lucky! Surprise me with a creative recipe.",
  "Give me a fun, easy dinner idea.",
  "Invent a healthy snack using only 3 ingredients.",
  "Show me a unique breakfast recipe."
];

const aiThinkingMessages = [
  "Save the recipe to your journal",
  "Compare kitchen inventory",
  "Order ingredients for delivery",
  "Share with a friend",
  "Add to your meal plan",
  "Explore similar recipes"
];

const DemoFeelingLucky: React.FC = () => {
  const [recipe, setRecipe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiMsgIdx, setAiMsgIdx] = useState(0);
  const [showSplit, setShowSplit] = useState(false);
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  // If authenticated, render nothing (or redirect in parent)
  if (isAuthenticated) return null;

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setAiMsgIdx((idx) => (idx + 1) % aiThinkingMessages.length);
      }, 1800);
    } else {
      setAiMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleLucky = async () => {
    setShowSplit(true);
    setLoading(true);
    setError('');
    setRecipe(null);
    const prompt = demoPrompts[Math.floor(Math.random() * demoPrompts.length)];
    try {
      const response = await generateText(prompt, "You are a creative AI chef. Respond with a fun, original recipe in markdown format.");
      setRecipe(response);
    } catch (err) {
      setError('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Replace handleLogin to use Auth0
  const handleLogin = () => {
    loginWithRedirect();
  };

  return (
    <div className={`w-full flex flex-col ${showSplit ? 'md:flex-row md:items-start md:justify-center' : 'items-center justify-center'} gap-8`}>
      {/* Left Card */}
      <div className="flex-1 min-w-[320px] max-w-xl">
        <SectionContainer title="">
          {/* Typing effect under the title */}
          <div className="flex justify-center w-full mb-4">
            <span className="text-primary text-center w-full font-mono animate-typing text-base">Please Log in for the full experience</span>
          </div>
          {!recipe && !loading && (
            <div className="text-center flex flex-col h-full justify-between">
              <button
                className="px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-lg font-semibold mb-3"
                onClick={handleLucky}
                disabled={loading}
              >
                Surprise Me With a Recipe
              </button>
              <button
                className="px-6 py-3 bg-secondary text-white rounded-lg shadow-lg hover:bg-emerald-700 transition-colors text-lg font-semibold mb-6"
                onClick={handleLogin}
                disabled={loading}
              >
                Login / Get Started
              </button>
              {error && <p className="text-red-600 mt-2">{error}</p>}
            </div>
          )}
          {(recipe || loading) && (
            <div className="flex-1 flex flex-col justify-center items-center">
              {loading && (
                <>
                  <h2 className="text-xl font-semibold text-primary mb-2 animate-pulse">{aiThinkingMessages[aiMsgIdx]}</h2>
                  <LoadingSpinner size="w-8 h-8 mb-4" />
                </>
              )}
              {!loading && (
                <button
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-blue-700 transition-colors text-base font-semibold"
                  onClick={handleLogin}
                >
                  Login / Get Started
                </button>
              )}
            </div>
          )}
        </SectionContainer>
      </div>
      {/* Right Card: AI/Recipe Modal */}
      {showSplit && (loading || recipe) && (
        <div className="flex-1 min-w-[320px] max-w-xl md:ml-0 md:mr-4">
          <div className="bg-white rounded-xl shadow-lg p-6 min-h-[200px] max-h-[400px] flex flex-col items-center justify-center animate-fadeIn">
            {loading && (
              <>
                <p className="text-primary text-lg font-semibold mb-2">{aiThinkingMessages[aiMsgIdx]}</p>
                <p className="text-gray-500 text-sm mb-2">Local Butler is working for you...</p>
                <LoadingSpinner size="w-8 h-8 mb-4" />
              </>
            )}
            {!loading && recipe && (
              <div className="mt-2 text-left w-full p-2 bg-white rounded shadow overflow-y-auto min-h-[100px] max-h-[350px] md:max-h-[400px]">
                <div dangerouslySetInnerHTML={{ __html: recipe.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoFeelingLucky;
