import { ydoc } from '../hooks/useYjs';
import type { TimelineNode } from '../types/timeline';
import * as Y from 'yjs';

// Define the structure of the session data for import/export.
interface SessionData {
  meta: Record<string, any>;
  nodes: Record<string, TimelineNode>;
  palette: Record<string, any>;
}

// Get references to the Y.js shared maps.
// It's assumed 'meta' and 'palette' maps will be created if they don't exist.
const metaMap = ydoc.getMap<any>('meta');
const nodesMap = ydoc.getMap<TimelineNode>('nodes');
const paletteMap = ydoc.getMap<any>('palette');

/**
 * SessionManager provides static methods for exporting the current application
 * state to a file and importing a state from a file.
 */
export class SessionManager {
  /**
   * Serializes the entire application state (meta, nodes, palette) into a
   * JSON object and triggers a browser download.
   */
  static exportSession() {
    const sessionData: SessionData = {
      meta: metaMap.toJSON(),
      nodes: nodesMap.toJSON(),
      palette: paletteMap.toJSON(),
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json',
    });

    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0];
    const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `microscope-session-${formattedDate}_${formattedTime}.microscope`;

    // Create a temporary anchor element to trigger the download.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    console.log('SessionManager: Session exported.', sessionData);
  }

  /**
   * Applies a session data object to the Y.js document, overwriting all
   * existing data. This function should be called after user confirmation.
   * @param sessionData - The parsed session data to apply.
   */
  static applySession(sessionData: SessionData) {
    try {
      if (!sessionData.nodes || !sessionData.meta || !sessionData.palette) {
        throw new Error('Invalid session data format.');
      }

      // Use a single transaction to perform all mutations atomically.
      ydoc.transact(() => {
        // Nuke: Clear all existing data from the maps.
        metaMap.clear();
        nodesMap.clear();
        paletteMap.clear();

        // Rehydrate Meta and Nodes
        Object.entries(sessionData.meta).forEach(([key, value]) => {
          metaMap.set(key, value);
        });
        Object.entries(sessionData.nodes).forEach(([key, value]) => {
          nodesMap.set(key, value);
        });

        // Rehydrate Palette correctly by converting plain arrays back to Y.Arrays
        Object.entries(sessionData.palette).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            const yArray = new Y.Array<string>();
            yArray.push(...value); // Spread the items into the new Y.Array
            paletteMap.set(key, yArray); // Set the Y.Array, not the plain array
          }
        });
      });

      console.log('SessionManager: Session applied successfully.');
      // Force a reload to ensure all components re-render with the new state.
      window.location.reload();
    } catch (error) {
      console.error('SessionManager: Failed to apply session data.', error);
      // The error alert will be handled by the UI component that calls this.
      throw error; // Re-throw the error so the caller can handle it.
    }
  }
}
