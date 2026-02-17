
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WorkoutSession, UserSettings } from '../types';
import { getWorkouts, getUserSettings, saveUserSettings } from '../services/supabaseService';
import { useAuth } from './AuthContext';

interface AppContextType {
  workouts: WorkoutSession[];
  isLoadingWorkouts: boolean;
  settings: UserSettings;
  refreshWorkouts: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const defaultSettings: UserSettings = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  language: 'en'
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  const refreshWorkouts = useCallback(async () => {
    if (!user) return;
    setIsLoadingWorkouts(true);
    try {
      const result = await getWorkouts(user.id, 50);
      setWorkouts(result);
    } catch (err) {
      console.error('Failed to load workouts:', err);
    }
    setIsLoadingWorkouts(false);
  }, [user]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!user) return;
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      saveUserSettings(user.id, newSettings).catch(err =>
        console.error('Failed to save settings:', err)
      );
      localStorage.setItem('ft_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshWorkouts();
      // Load settings
      getUserSettings(user.id).then(s => {
        if (s) {
          setSettings(s);
          localStorage.setItem('ft_settings', JSON.stringify(s));
        } else {
          // Try localStorage fallback
          const cached = localStorage.getItem('ft_settings');
          if (cached) {
            try { setSettings(JSON.parse(cached)); } catch {}
          }
        }
      }).catch(() => {
        const cached = localStorage.getItem('ft_settings');
        if (cached) {
          try { setSettings(JSON.parse(cached)); } catch {}
        }
      });
    } else {
      setWorkouts([]);
      setSettings(defaultSettings);
    }
  }, [user, refreshWorkouts]);

  return (
    <AppContext.Provider value={{ workouts, isLoadingWorkouts, settings, refreshWorkouts, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
