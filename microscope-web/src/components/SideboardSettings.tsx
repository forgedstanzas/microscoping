import React from 'react';
import { SessionManager } from '../services/SessionManager';
import { ViewSettingsService } from '../services/ViewSettingsService';
import ThemeSwitcher from './ThemeSwitcher';
import { LayoutSwitcher } from './LayoutSwitcher';
import styles from './SideboardSettings.module.css';
import type { ViewSettings } from '../types/settings';
import { useViewSettings } from '../hooks/useViewSettings';
import { useModal } from '../context/ModalContext'; // Import useModal

interface SideboardSettingsProps {
  layoutMode: 'zigzag' | 'linear';
  onLayoutChange: (newMode: 'zigzag' | 'linear') => void;
  viewSettings: ReturnType<typeof useViewSettings>;
}

export function SideboardSettings({ layoutMode, onLayoutChange, viewSettings }: SideboardSettingsProps) {
  const { applySettings, resetSettings, shareSettings } = viewSettings;
  const { showAlert, showConfirm } = useModal(); // Use the modal hook

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
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const sessionData = JSON.parse(e.target?.result as string);
            // Use the custom modal for confirmation
            showConfirm(
              'This will overwrite the current session with the contents of the selected file. Are you sure?',
              () => {
                SessionManager.applySession(sessionData);
              }
            );
          } catch (error) {
            console.error('Failed to parse session file:', error);
            showAlert('Failed to read or parse session file. Please ensure it is a valid JSON.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleUploadSettingsClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsedSettings = JSON.parse(e.target?.result as string);
            if (ViewSettingsService.isValidViewSettings(parsedSettings)) {
              applySettings(parsedSettings);
              // Success is silent
            } else {
              showAlert('Invalid View Settings file. Please ensure it has a "theme" or "layout" property.');
            }
          } catch (error) {
            console.error('Failed to parse view settings file:', error);
            showAlert('Failed to read or parse view settings file. Please ensure it is a valid JSON.');
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
          Upload View
        </button>
        <button onClick={shareSettings} className={styles.button}>
          Share View
        </button>
        <button onClick={resetSettings} className={styles.button}>
          Reset View
        </button>
      </div>
    </div>
  );
}
