
import React from 'react';
import { isApiKeySet } from '../services/geminiService';
import SectionContainer from './SectionContainer';
import { CogIcon } from './Icons';

const SettingsSection: React.FC = () => {
  const apiKeyIsSet = isApiKeySet();

  return (
    <SectionContainer title="Settings" icon={<CogIcon className="w-8 h-8" />}>
      <div className="p-4 bg-white rounded-lg shadow animate-fadeIn">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Gemini API Key Status</h3>
        {apiKeyIsSet ? (
          <div className="flex items-center p-3 bg-green-100 text-green-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Gemini API Key is configured and active. AI features should be operational.</span>
          </div>
        ) : (
          <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Gemini API Key is NOT configured. AI features will be disabled. Please set the <code>API_KEY</code> environment variable for this application to function correctly.</span>
          </div>
        )}
        <p className="mt-4 text-sm text-gray-600">
          This application requires a Google Gemini API key to utilize its artificial intelligence capabilities. 
          The key must be provided as an environment variable named <code>API_KEY</code> in the environment where this application is run.
          This application does not store your API key or ask for it directly in the user interface. Ensure the environment variable is correctly set up for the AI features to work.
        </p>
      </div>
       <div className="mt-6 p-4 bg-white rounded-lg shadow animate-fadeIn">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Authentication & Data</h3>
         <p className="text-sm text-gray-600">
          Currently, user profile information is stored in your browser's local storage for personalization. 
          For a production environment with multiple users or persistent data across devices, integration with an authentication service like Auth0 and a backend database would be necessary. This would enable secure user accounts and data storage.
        </p>
      </div>
    </SectionContainer>
  );
};

export default SettingsSection;