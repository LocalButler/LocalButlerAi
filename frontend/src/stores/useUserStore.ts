import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferences?: any;
}

interface UserPreferences {
  // Define your preferences structure here
  [key: string]: any;
}

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  preferences: UserPreferences;
  setUser: (user: User) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  preferences: {},
  setUser: (user: User) => set(() => ({ user, isAuthenticated: true, preferences: user.preferences || {} })),
  updatePreferences: (preferences: Partial<UserPreferences>) => set((state) => ({ preferences: { ...state.preferences, ...preferences } })),
  logout: () => set(() => ({ user: null, isAuthenticated: false, preferences: {} })),
}));
