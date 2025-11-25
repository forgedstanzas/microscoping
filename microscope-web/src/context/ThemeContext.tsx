import React, { createContext, useContext } from 'react';
import useTheme from '../hooks/useTheme';

// 1. Create the context
// The context will hold the return value of our useTheme hook.
const ThemeContext = createContext<ReturnType<typeof useTheme> | undefined>(undefined);

// 2. Create the provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Call the hook once here, this is the single source of truth
  const themeState = useTheme();

  return (
    <ThemeContext.Provider value={themeState}>{children}</ThemeContext.Provider>
  );
};

// 3. Create a custom hook for easy consumption
// This hook abstracts away the useContext call and provides a null check.
export const useSharedTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useSharedTheme must be used within a ThemeProvider');
  }
  return context;
};
