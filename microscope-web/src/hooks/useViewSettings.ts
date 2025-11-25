import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ydoc } from './useYjs';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import type { ViewSettings } from '../types/settings';
import { useModal } from '../context/ModalContext'; // Import useModal

const DEFAULT_LAYOUT_CONSTANTS: Required<ViewSettings['layout']['constants']> = {
  cardWidth: 348,
  zigzagOffset: 250,
  gapSize: 50,
};

// --- Y.js Shared Data Setup ---
const metaMap = ydoc.getMap('meta');
const getSharedSettingsLog = () => {
  if (!metaMap.has('shared-settings-log')) {
    metaMap.set('shared-settings-log', new Y.Array());
  }
  return metaMap.get('shared-settings-log') as Y.Array<any>;
};

interface SharedSettingsEvent {
  senderId: number;
  settings: ViewSettings;
  timestamp: number;
  eventId: string;
}

/**
 * A comprehensive hook to manage local and shared view settings, including
 * theme colors and layout constants.
 */
export const useViewSettings = () => {
  const { showAlert, showConfirm } = useModal();
  const [layoutConstants, setLayoutConstants] = useState(DEFAULT_LAYOUT_CONSTANTS);
  const [appliedTheme, setAppliedTheme] = useState<Record<string, string>>({});
  const processedEvents = useRef(new Set<string>());

  // --- Core Functions (defined before useEffect that uses them) ---
  const applySettings = useCallback((settings: ViewSettings) => {
    // 1. Apply Theme Settings
    if (settings.theme) {
      const root = document.documentElement;
      const newTheme: Record<string, string> = {};
      Object.entries(settings.theme).forEach(([key, value]) => {
        const cssVarName = key.startsWith('--') ? key : `--${key}`;
        root.style.setProperty(cssVarName, value);
        newTheme[cssVarName] = value;
      });
      // Store only the successfully applied theme properties
      setAppliedTheme(prev => ({ ...prev, ...newTheme }));
    }

    // 2. Apply Layout Constants
    if (settings.layout?.constants) {
      setLayoutConstants(prev => ({ ...prev, ...settings.layout.constants }));
    }

    // TODO: Apply layout adapter change if present in settings
  }, []);

  // --- Listener for Shared Settings ---
  useEffect(() => {
    const sharedSettingsLog = getSharedSettingsLog();

    const observer = (event: Y.YArrayEvent<any>) => {
      event.changes.added?.forEach((item: any) => {
        const content: SharedSettingsEvent = item.content.getContent()[0];
        if (content && content.senderId !== ydoc.clientID && !processedEvents.current.has(content.eventId)) {
          processedEvents.current.add(content.eventId);
          // Use the custom modal for confirmation
          showConfirm(
            `Another user wants to share their view settings with you. Apply them?`,
            () => applySettings(content.settings)
          );
        }
      });
    };

    sharedSettingsLog.observe(observer);
    return () => {
      sharedSettingsLog.unobserve(observer);
    };
  }, [applySettings, showConfirm]); // Add dependencies

  const resetSettings = useCallback(() => {
    // 1. Reset Theme
    const root = document.documentElement;
    Object.keys(appliedTheme).forEach(key => {
      root.style.removeProperty(key);
    });
    setAppliedTheme({});

    // 2. Reset Layout Constants
    setLayoutConstants(DEFAULT_LAYOUT_CONSTANTS);
  }, [appliedTheme]);

  const shareSettings = useCallback(() => {
    const sharedSettingsLog = getSharedSettingsLog();
    const currentSettings: ViewSettings = {
      theme: appliedTheme,
      layout: { constants: layoutConstants },
    };
    
    sharedSettingsLog.push([{
      senderId: ydoc.clientID,
      settings: currentSettings,
      timestamp: Date.now(),
      eventId: uuidv4(),
    }]);

    showAlert('Your view settings have been shared!'); // Use custom alert
  }, [appliedTheme, layoutConstants, showAlert]);

  return useMemo(() => ({
    layoutConstants,
    applySettings,
    resetSettings,
    shareSettings,
  }), [layoutConstants, applySettings, resetSettings, shareSettings]);
};
