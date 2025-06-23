import React, { useState } from 'react';
import SectionContainer from './SectionContainer';
import { CogIcon } from './Icons';
import { useAuth0 } from '@auth0/auth0-react';

const SettingsSection: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth0();
  const [isEditing, setIsEditing] = useState(false);
  const [editTagline, setEditTagline] = useState('');

  const handleSave = () => {
    // In a real app, you would send this to your backend or update Auth0 profile
    setIsEditing(false);
  };

  return (
    <SectionContainer title="Settings" icon={<CogIcon className="w-8 h-8" />}>
      {isAuthenticated && user && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 rounded-lg shadow animate-fadeIn">
          {user.picture ? (
            <img src={user.picture} alt="Profile" className="w-14 h-14 rounded-full border-2 border-primary" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold border-2 border-primary">
              {user.name ? user.name[0] : 'A'}
            </div>
          )}
          <div className="flex-1">
            {isEditing ? (
              <>
                <input
                  className="block w-full mb-2 px-2 py-1 border rounded bg-gray-100"
                  value={user.name || ''}
                  disabled
                  placeholder="Name"
                />
                <input
                  className="block w-full mb-2 px-2 py-1 border rounded bg-gray-100"
                  value={user.email || ''}
                  disabled
                  placeholder="Email"
                />
                <input
                  className="block w-full mb-2 px-2 py-1 border rounded"
                  value={editTagline}
                  onChange={e => setEditTagline(e.target.value)}
                  placeholder="Tagline / Role (e.g. Digital Nomad)"
                />
                <button
                  onClick={handleSave}
                  className="mr-2 text-xs bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="font-bold text-lg text-primary">{user.name}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                <div className="text-sm text-blue-700 italic mb-2">{editTagline || <span className='text-gray-400'>No tagline yet</span>}</div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-2 mr-2 text-xs bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="mt-2 text-xs bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Log Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </SectionContainer>
  );
};

export default SettingsSection;