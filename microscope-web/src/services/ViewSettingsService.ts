import type { ViewSettings } from '../types/settings';

/**
 * ViewSettingsService provides utility functions for handling view settings.
 * The stateful logic has been moved to the useViewSettings hook.
 */
export class ViewSettingsService {
  /**
   * Validates a parsed JSON object against the ViewSettings interface.
   * @param data The JSON object to validate.
   * @returns True if the data structure is plausible for ViewSettings, false otherwise.
   */
  static isValidViewSettings(data: any): data is ViewSettings {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // It must have at least one of the valid top-level keys
    if (data.theme === undefined && data.layout === undefined) {
      return false;
    }

    // If keys exist, they must be the right type
    if (data.theme !== undefined && typeof data.theme !== 'object') {
      return false;
    }
    if (data.layout !== undefined && typeof data.layout !== 'object') {
      return false;
    }
    if (data.layout?.constants !== undefined && typeof data.layout.constants !== 'object') {
      return false;
    }

    return true;
  }
}
