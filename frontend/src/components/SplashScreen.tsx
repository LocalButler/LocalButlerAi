import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import SectionContainer from './SectionContainer';

const splashCommands = [
  'Pick up laundry',
  'Order groceries',
  'Clean the car',
  'Clean the house',
  'Order food',
  'Give me a recipe',
  'Book a handyman',
  'Plan my meals',
  'Find a pet sitter',
  'Get travel help',
];

const TYPING_SPEED = 60;

const TypingEffect: React.FC = () => {
  const [displayed, setDisplayed] = useState('');
  const [msgIdx, setMsgIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (charIdx < splashCommands[msgIdx].length) {
      const timeout = setTimeout(() => {
        setDisplayed(splashCommands[msgIdx].slice(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCharIdx(0);
        setMsgIdx((msgIdx + 1) % splashCommands.length);
        setDisplayed('');
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [charIdx, msgIdx]);

  return (
    <div className="mt-10 text-lg text-primary font-mono min-h-[2.5rem] animate-fadeIn">
      {displayed}
      <span className="animate-pulse">|</span>
    </div>
  );
};

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-primary to-blue-100 fixed top-0 left-0 z-50 relative">
      <SectionContainer title="Welcome to Local Butler Ai ✨!">
        <div className="w-full max-w-2xl bg-white/80 rounded-2xl shadow-xl px-2 sm:px-6 py-6 md:py-8 flex flex-col items-center mx-auto my-4 md:my-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary text-center">
            What do you want to get done today?
          </h2>
          <div className="flex justify-center w-full mb-2">
            <TypingEffect />
          </div>
          <p className="mb-4 text-base md:text-lg text-neutral text-center">
            Local Butler AI helps you manage your home, discover local services, plan meals, and more. Try a demo or log in to unlock your personalized assistant!
          </p>
          <div className="mb-6 w-full flex flex-col items-center">
            <button
              className="px-4 py-2 md:px-6 md:py-3 bg-secondary text-white rounded-lg shadow-lg hover:bg-emerald-700 transition-colors text-base md:text-lg font-semibold mb-3 w-full max-w-xs"
              onClick={() => navigate('/demo')}
            >
              Try a Quick Demo
            </button>
            <button
              className="px-4 py-2 md:px-6 md:py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-base md:text-lg font-semibold w-full max-w-xs"
              onClick={() => loginWithRedirect()}
            >
              Login / Get Started
            </button>
          </div>
        </div>
      </SectionContainer>
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 mt-6 mb-2 px-2">
        <div className="bg-white/60 rounded-xl shadow p-4 md:p-6 max-w-md w-full">
          <p className="text-center text-xs md:text-sm text-gray-700 font-semibold mb-2">Features you can explore:</p>
          <ul className="list-disc list-inside text-left mx-auto text-xs md:text-sm text-gray-700">
            <li>AI-powered meal planning & recipes</li>
            <li>Local service marketplace</li>
            <li>Personalized butler persona</li>
            <li>Travel & concierge assistance</li>
            <li>And more!</li>
          </ul>
          <p className="mt-4 text-center text-xs md:text-sm font-bold text-red-600 animate-pulse">Please Log in For Full App Access</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
