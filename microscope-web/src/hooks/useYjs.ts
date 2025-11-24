import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

// --- Singleton Y.js Setup ---
// This code block runs only once when the module is first imported, creating
// a single Y.js document and providers that are shared across the entire app.

/**
 * The shared Y.js document that holds our application state.
 */
export const ydoc = new Y.Doc();

// The room name defines the "space" for collaboration. All clients in the
// same room will share data. This is static for now.
const roomName = 'microscope-default-room';

/**
 * The persistence provider that stores the Y.js document data in IndexedDB,
 * enabling offline functionality.
 */
export const persistence = new IndexeddbPersistence(roomName, ydoc);

/**
 * The WebRTC provider that enables peer-to-peer communication between clients
 * for real-time collaboration.
 */
export const webrtcProvider = new WebrtcProvider(roomName, ydoc, {
  // We use public signaling servers for better network traversal and discovery.
  signaling: [
    'wss://signaling.y-webrtc.dev',
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://y-webrtc-signaling-us.herokuapp.com',
  ],
});

// --- React Hook for Y.js ---

/**
 * `useYjs` is a custom hook that provides access to the shared Y.js
 * document and tracks the status of its persistence.
 *
 * @returns An object containing the Y.js document (`ydoc`), the providers,
 *          and a boolean `isSynced` which is true when the document has
 *          been successfully loaded from IndexedDB.
 */
export const useYjs = () => {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    const handleSync = (synced: boolean) => {
      if (synced) {
        setIsSynced(true);
        console.log('Y.js content has been synced with IndexedDB.');
      }
    };

    // Listen for the 'synced' event from the persistence provider.
    persistence.on('synced', handleSync);

    // If the data is already synced when the hook first runs, update the state.
    if (persistence.synced) {
      setIsSynced(true);
    }

    return () => {
      // The providers are singletons and should live for the lifetime of the app,
      // so we don't destroy them here. Cleanup would happen at the top app level.
      persistence.off('synced', handleSync);
    };
  }, []);

  return { ydoc, persistence, webrtcProvider, isSynced };
};
