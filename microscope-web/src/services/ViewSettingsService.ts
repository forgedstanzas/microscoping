import type { ViewSettings } from '../types/settings';

// Function type for updating layout constants
type UpdateLayoutConstants = (newConstants: Partial<ViewSettings['layout']['constants']>) => void;

// Singleton instance to hold the layout setter
let updateLayoutConstantsRef: UpdateLayoutConstants | null = null;

/**
 * ViewSettingsService manages applying various view settings across the application,
 * including theme CSS variables and layout constants.
 */
export class ViewSettingsService {
  /**
   * Registers the layout constants setter from the useLayoutConstants hook.
   * This allows the service to update layout constants without being a React component itself.
   * @param setter The function provided by useLayoutConstants to update layout constants.
   */
  static registerLayoutConstantsSetter(setter: UpdateLayoutConstants) {
    updateLayoutConstantsRef = setter;
  }

  /**
   * Applies the given ViewSettings to the application.
   * This includes updating CSS variables for themes and dispatching updates
   * for layout constants.
   * @param settings The ViewSettings object to apply.
   */
  static applySettings(settings: ViewSettings) {
    const root = document.documentElement;

    // Apply Theme settings (CSS Variables)
    if (settings.theme) {
      console.log('ViewSettingsService: Applying theme settings:', settings.theme);
      Object.entries(settings.theme).forEach(([key, value]) => {
        // Prepend '--' if not already present, as CSS variables conventionally start with it.
        const cssVarName = key.startsWith('--') ? key : `--${key}`;
        root.style.setProperty(cssVarName, value);
      });
    }

    // Apply Layout settings (Constants)
    if (settings.layout?.constants) {
      console.log('ViewSettingsService: Applying layout constants:', settings.layout.constants);
      if (updateLayoutConstantsRef) {
        updateLayoutConstantsRef(settings.layout.constants);
      } else {
        console.warn('ViewSettingsService: Layout constants setter not registered. Layout settings will not be applied.');
      }
    }
    
    // TODO: Phase 4 Plan - Apply layout.adapter setting later.
    if (settings.layout?.adapter) {
        console.log('ViewSettingsService: Layout adapter setting found, but not yet implemented for application. Will be handled in a later step.');
    }
  }

  /**
   * Validates a parsed JSON object against the ViewSettings interface.
   * @param data The JSON object to validate.
   * @returns True if the data structure is plausible for ViewSettings, false otherwise.
   */
  static isValidViewSettings(data: any): data is ViewSettings {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // Basic structural validation
    if (data.theme !== undefined && typeof data.theme !== 'object') {
      return false;
    }
    if (data.layout !== undefined && typeof data.layout !== 'object') {
      return false;
    }
    if (data.layout?.constants !== undefined && typeof data.layout.constants !== 'object') {
      return false;
    }

    // Further validation could go here, e.g., checking types of values in constants.
    // For now, a basic structural check is sufficient.
    return true;
  }
}
