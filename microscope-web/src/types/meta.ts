/**
 * Defines standardized keys for the Y.js 'meta' map to prevent
 * inconsistencies when accessing shared metadata.
 */
export const META_KEYS = {
  /** The peerId of the client currently designated as the host. */
  HOST_ID: 'hostId',

  /** The title of the history/session, e.g., "The Rise and Fall of the Spice Guild". */
  HISTORY_TITLE: 'historyTitle',

  /** A description of the current focus of the game. */
  CURRENT_FOCUS: 'currentFocus',

  /** The peerId of the client who is the current "Lens". */
  ACTIVE_PLAYER_ID: 'activePlayerId',

  /** A boolean flag indicating if strict turn-based rules are enforced. */
  IS_STRICT_MODE: 'isStrictMode',

  /** The key for the Y.Array that logs shared view settings events. */
  SHARED_SETTINGS_LOG: 'shared-settings-log',
} as const;

/**
 * Provides a typed schema for the data stored in the Y.js 'meta' map.
 */
export interface MetaMapSchema {
  [META_KEYS.HOST_ID]: number | null;
  [META_KEYS.HISTORY_TITLE]: string;
  [META_KEYS.CURRENT_FOCUS]: string;
  [META_KEYS.ACTIVE_PLAYER_ID]: number | null;
  [META_KEYS.IS_STRICT_MODE]: boolean;
}
