import { useState, useCallback, useMemo } from 'react';
import type { ViewSettings } from '../types/settings';

const DEFAULT_LAYOUT_CONSTANTS: Required<ViewSettings['layout']['constants']> = {
  cardWidth: 300,
  zigzagOffset: 250,
  gapSize: 50,
};

/**
 * A hook for managing and providing layout constants for the canvas.
 * It allows components to get the current layout constants and to update them.
 */
export const useLayoutConstants = () => {
  const [layoutConstants, setLayoutConstantsState] = useState(DEFAULT_LAYOUT_CONSTANTS);

  // Memoize the setter function to prevent unnecessary re-renders of consumers
  const updateLayoutConstants = useCallback(
    (newConstants: Partial<ViewSettings['layout']['constants']>) => {
      setLayoutConstantsState(prevConstants => ({
        ...prevConstants,
        ...newConstants,
      }));
    },
    []
  );

  return useMemo(() => ({
    layoutConstants,
    updateLayoutConstants,
  }), [layoutConstants, updateLayoutConstants]);
};
