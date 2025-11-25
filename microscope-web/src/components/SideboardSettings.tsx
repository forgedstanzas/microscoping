import React, { useEffect } from 'react';
import { SessionManager } from '../services/SessionManager';
import { ViewSettingsService } from '../services/ViewSettingsService';
import ThemeSwitcher from './ThemeSwitcher';
import { LayoutSwitcher } from './LayoutSwitcher';
import styles from './SideboardSettings.module.css';
import type { ViewSettings } from '../types/settings'; // Import the type

interface SideboardSettingsProps {
  layoutMode: 'zigzag' | 'linear';
  onLayoutChange: (newMode: 'zigzag' | 'linear') => void;
  updateLayoutConstants: (newConstants: Partial<ViewSettings['layout']['constants']>) => void; // New prop
}

export function SideboardSettings({ layoutMode, onLayoutChange, updateLayoutConstants }: SideboardSettingsProps) {
  // Register the layout constants setter with the service on mount
  useEffect(() => {
    ViewSettingsService.registerLayoutConstantsSetter(updateLayoutConstants);
  }, [updateLayoutConstants]); // Re-register if setter changes (should be stable)

  const handleExportClick = () => {
    SessionManager.exportSession();
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.microscope';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        SessionManager.importSession(file);
      }
    };
    input.click();
  };

  const handleUploadSettingsClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json'; // Accept JSON files
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsedSettings: ViewSettings = JSON.parse(e.target?.result as string);
            if (ViewSettingsService.isValidViewSettings(parsedSettings)) {
              ViewSettingsService.applySettings(parsedSettings);
              alert('View settings applied successfully!');
            } else {
              alert('Invalid View Settings file. Please ensure it follows the correct schema.');
            }
          } catch (error) {
            console.error('Failed to parse view settings file:', error);
            alert('Failed to read or parse view settings file. Please ensure it is a valid JSON.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div>
      <h3>Settings</h3>
      <div className={styles.settingsGrid}>
        <ThemeSwitcher />
        <LayoutSwitcher currentLayout={layoutMode} onLayoutChange={onLayoutChange} />
      </div>

      <hr className={styles.divider} />

      <h3>Session Data</h3>
      <div className={styles.buttonGroup}>
        <button onClick={handleExportClick} className={styles.button}>
          Export Session
        </button>
        <button onClick={handleImportClick} className={styles.button}>
          Import Session
        </button>
      </div>

      <hr className={styles.divider} />

      <h3>View Configuration</h3>
      <div className={styles.buttonGroup}>
        <button onClick={handleUploadSettingsClick} className={styles.button}>
          Upload View Settings
        </button>
      </div>
    </div>
  );
}
