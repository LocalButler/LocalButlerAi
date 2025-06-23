import React, { useEffect, useState } from 'react';
import SectionContainer from './SectionContainer';
import DemoFeelingLucky from './DemoFeelingLucky';
import { useAuth0 } from '@auth0/auth0-react';

const aiMessages = [
  "AI-powered meal & recipe generation",
  "Local service marketplace",
  "Personalized butler persona",
  "Travel & concierge assistance",
  "Smart home & kitchen tools",
  "And more!",
  "Save recipes to your journal by logging in!",
  "Try our local service marketplace—log in for more!",
  "Personalize your butler—get started now!",
  "Unlock travel & concierge features—log in!",
  "Access smart home tools—sign up for full access!",
  "Log in to unlock all features!"
];

const TYPING_SPEED = 60;

const TypingEffect: React.FC = () => {
  const messages = aiMessages;
  const [displayed, setDisplayed] = useState('');
  const [msgIdx, setMsgIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (charIdx < messages[msgIdx].length) {
      const timeout = setTimeout(() => {
        setDisplayed(messages[msgIdx].slice(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCharIdx(0);
        setMsgIdx((msgIdx + 1) % messages.length);
        setDisplayed('');
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [charIdx, msgIdx, messages]);

  return (
    <div className="mt-12 text-lg text-primary font-mono min-h-[2.5rem] animate-fadeIn">
      {displayed}
      <span className="animate-pulse">|</span>
    </div>
  );
};

const DemoScreen: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-base_100 fixed top-0 left-0 z-50">
      <SectionContainer title="Try Local Butler Ai ✨ Demo!">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary">I'm Feeling Lucky: AI Recipe Generator</h2>
          <TypingEffect />
          <DemoFeelingLucky />
          <div className="mt-8 flex flex-col gap-3 items-center">
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-base font-semibold w-full max-w-xs"
              onClick={() => loginWithRedirect()}
            >
              Login / Get Started
            </button>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
};

export default DemoScreen;
