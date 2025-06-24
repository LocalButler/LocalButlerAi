import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginScreen: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-primary">Welcome! Please log in to continue</h1>
      <button
        className="px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
        onClick={() => loginWithRedirect()}
      >
        Login with Auth0
      </button>
    </div>
  );
};

export default LoginScreen;
