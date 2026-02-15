import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themes, DEFAULT_THEME } from '../themes';
import { auth } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ThemeContext = createContext();

function applyTheme(themeId) {
  const theme = themes[themeId] || themes[DEFAULT_THEME];
  const root = document.documentElement;

  // Apply all CSS variables
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Set color-scheme
  root.style.setProperty('color-scheme', theme.colorScheme);

  // Set data attribute for any CSS selectors that need it
  root.setAttribute('data-theme', theme.id);
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('theme') || DEFAULT_THEME;
  });

  // Apply theme on mount and changes
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  // Load from Firebase on auth ready
  useEffect(() => {
    const loadFromFirebase = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().theme) {
          const fbTheme = userDoc.data().theme;
          if (themes[fbTheme]) {
            setThemeId(fbTheme);
            localStorage.setItem('theme', fbTheme);
          }
        }
      } catch (e) {
        console.warn('Could not load theme preference:', e);
      }
    };

    // Wait a bit for auth to be ready
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) loadFromFirebase();
    });
    return unsubscribe;
  }, []);

  const changeTheme = useCallback(async (newThemeId) => {
    if (!themes[newThemeId]) return;
    setThemeId(newThemeId);
    localStorage.setItem('theme', newThemeId);

    // Save to Firebase
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          theme: newThemeId,
        });
      } catch (e) {
        console.warn('Could not save theme preference:', e);
      }
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
