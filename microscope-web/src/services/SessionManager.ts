import type { TimelineNode } from '../types/timeline';
import * as Y from 'yjs';

// Define the structure of the session data for import/export.
export interface SessionData {
  meta: Record<string, any>;
  nodes: Record<string, TimelineNode>;
  palette: Record<string, any>;
}

/**
 * SessionManager provides methods for exporting the current application
 * state to a file and importing a state from a file.
 * An instance of this class is scoped to a specific Y.Doc.
 */
export default class SessionManager {
  private ydoc: Y.Doc;
  private metaMap: Y.Map<any>;
  private nodesMap: Y.Map<TimelineNode>;
  private paletteMap: Y.Map<any>;

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
    this.metaMap = ydoc.getMap<any>('meta');
    this.nodesMap = ydoc.getMap<TimelineNode>('nodes');
    this.paletteMap = ydoc.getMap<any>('palette');
  }

  /**
   * Serializes the entire application state from the Y.Doc into a
   * JSON object and triggers a browser download.
   */
  public exportSession() {
    const sessionData: SessionData = {
      meta: this.metaMap.toJSON(),
      nodes: this.nodesMap.toJSON(),
      palette: this.paletteMap.toJSON(),
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
  public applySession(sessionData: SessionData) {
    try {
      if (!sessionData.nodes || !sessionData.meta || !sessionData.palette) {
        throw new Error('Invalid session data format.');
      }

      this.ydoc.transact(() => {
        // Nuke: Clear all existing data from the maps.
        this.metaMap.clear();
        this.nodesMap.clear();
        this.paletteMap.clear();

        // Rehydrate Meta and Nodes
        Object.entries(sessionData.meta).forEach(([key, value]) => {
          this.metaMap.set(key, value);
        });
        Object.entries(sessionData.nodes).forEach(([key, value]) => {
          this.nodesMap.set(key, value);
        });

        // Rehydrate Palette correctly by converting plain arrays back to Y.Arrays
        Object.entries(sessionData.palette).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            const yArray = new Y.Array<string>();
            yArray.push(...value);
            this.paletteMap.set(key, yArray);
          }
        });
      });

      console.log('SessionManager: Session applied successfully.');
      // Force a reload to ensure all components re-render with the new state.
      window.location.reload();
    } catch (error) {
      console.error('SessionManager: Failed to apply session data.', error);
      throw error;
    }
  }
}
