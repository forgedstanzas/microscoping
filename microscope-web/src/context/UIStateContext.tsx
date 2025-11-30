import React, { createContext, useContext, useState } from 'react';

// 1. Define the shape of the context data
export type LayoutMode = 'zigzag' | 'linear';

interface UIStateContextType {
  layoutMode: LayoutMode;
  setLayoutMode: React.Dispatch<React.SetStateAction<LayoutMode>>;
  selectedLegacy: string | null;
  setSelectedLegacy: React.Dispatch<React.SetStateAction<string | null>>;
}

// Create the context
const UIStateContext = createContext<UIStateContextType | null>(null);

// 2. Create the Provider component
interface UIStateProviderProps {
  children: React.ReactNode;
}

export function UIStateProvider({ children }: UIStateProviderProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('zigzag');
  const [selectedLegacy, setSelectedLegacy] = useState<string | null>(null);

  const value = {
    layoutMode,
    setLayoutMode,
    selectedLegacy,
    setSelectedLegacy,
  };

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
}

// 3. Create the custom hook for consuming the context
export function useUIState() {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}
