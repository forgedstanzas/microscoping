import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

// --- Utility Functions ---
const generateDefaultUsername = () => {
  return `Guest-${Math.floor(Math.random() * 900) + 100}`;
};

// Store ydoc instance in a ref to persist across re-renders
const ydocRef = new Y.Doc();

/**
 * `useYjs` is a custom hook that provides access to a shared Y.js
 * document and tracks the status of its persistence, client identity,
 * and host status for a specific room.
 *
 * @param roomId The identifier for the collaboration room. If null, no connection is made.
 * @returns An object containing the Y.js document, providers, and state.
 */
export const useYjs = (roomId: string | null) => {
  const [isSynced, setIsSynced] = useState(false);
  const [ydoc, setYdoc] = useState<Y.Doc>(ydocRef);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const webrtcProviderRef = useRef<WebrtcProvider | null>(null);
  const myPeerId = useRef<number | null>(null);

  const [myUsername, setMyUsername] = useState<string>(() => {
    const storedUsername = localStorage.getItem('microscope-username');
    return storedUsername || generateDefaultUsername();
  });
  
  const meta = ydoc.getMap<any>('meta');
  const peers = ydoc.getMap<any>('peers');

  useEffect(() => {
    if (!roomId) {
      return; // Do not connect if there is no room ID
    }

    const newYDoc = new Y.Doc();
    setYdoc(newYDoc);

    const persistence = new IndexeddbPersistence(roomId, newYDoc);
    persistenceRef.current = persistence;

    const webrtcProvider = new WebrtcProvider(roomId, newYDoc, {
      signaling: [
        'wss://signaling.y-webrtc.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
        'wss://y-webrtc-signaling-us.herokuapp.com',
      ],
    });
    webrtcProviderRef.current = webrtcProvider;
    myPeerId.current = webrtcProvider.awareness.clientID;

    const handleSync = (synced: boolean) => {
      if (synced) {
        setIsSynced(true);
        console.log(`Y.js content has been synced with IndexedDB for room: ${roomId}.`);
        if (meta.get('hostId') === undefined) {
          meta.set('hostId', myPeerId.current);
          console.log(`Y.js: Client ${myPeerId.current} elected as host.`);
        }
        webrtcProvider.awareness.setLocalStateField('user', { name: myUsername });
      }
    };

    persistence.on('synced', handleSync);
    if (persistence.synced) {
      handleSync(true);
    }

    const awarenessChangeHandler = (changes: { added: number[], updated: number[], removed: number[] }) => {
      const states = webrtcProvider.awareness.getStates();
      states.forEach((state, clientId) => {
        if (state.user && !peers.has(clientId.toString())) {
          peers.set(clientId.toString(), state.user);
        }
      });
      changes.removed.forEach(clientId => {
        if (peers.has(clientId.toString())) {
          peers.delete(clientId.toString());
        }
      });
      console.log('Y.js: Peers updated:', Array.from(peers.entries()));
    };

    webrtcProvider.awareness.on('change', awarenessChangeHandler);
    awarenessChangeHandler({ added: Array.from(webrtcProvider.awareness.getStates().keys()), updated: [], removed: [] });

    // --- Cleanup Effect ---
    return () => {
      console.log(`Destroying Y.js instance for room: ${roomId}`);
      persistence.off('synced', handleSync);
      webrtcProvider.awareness.off('change', awarenessChangeHandler);
      webrtcProvider.destroy();
      newYDoc.destroy();
      setIsSynced(false);
    };
  }, [roomId, myUsername]); // Rerun if roomId or username changes

  // Persist username to localStorage
  useEffect(() => {
    localStorage.setItem('microscope-username', myUsername);
  }, [myUsername]);

  return { ydoc, isSynced, myPeerId: myPeerId.current, myUsername, setMyUsername, meta, peers };
};
