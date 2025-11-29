import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

const generateDefaultUsername = () => `Guest-${Math.floor(Math.random() * 900) + 100}`;

/**
 * `useYjs` is a custom hook that manages the entire lifecycle of a Y.js document
 * for a specific room, including its providers and collaborative state.
 *
 * @param roomId The identifier for the collaboration room. If null, no connection is made.
 * @returns An object containing the Y.js document, connection state, and user info.
 */
export const useYjs = (roomId: string | null) => {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [meta, setMeta] = useState<Y.Map<any> | null>(null);
  const [peers, setPeers] = useState<Y.Map<any> | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [myPeerId, setMyPeerId] = useState<number | null>(null);
  const [signalingStatus, setSignalingStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const [myUsername, setMyUsername] = useState<string>(() => {
    return localStorage.getItem('microscope-username') || generateDefaultUsername();
  });

  useEffect(() => {
    // Persist username whenever it changes
    localStorage.setItem('microscope-username', myUsername);
  }, [myUsername]);

  useEffect(() => {
    // If there's no room, destroy any existing connection and reset state.
    if (!roomId) {
      ydoc?.destroy();
      setYdoc(null);
      return;
    }

    console.log(`useYjs: Setting up new Y.js instance for room: ${roomId}`);
    const newYDoc = new Y.Doc();
    const newMeta = newYDoc.getMap<any>('meta');
    const newPeers = newYDoc.getMap<any>('peers');

    const persistence = new IndexeddbPersistence(roomId, newYDoc);
    const webrtcProvider = new WebrtcProvider(roomId, newYDoc, {
      signaling: ['https://microscoping-signaling-server.onrender.com/'],
    });

    // --- State Updates ---
    setYdoc(newYDoc);
    setMeta(newMeta);
    setPeers(newPeers);
    setMyPeerId(webrtcProvider.awareness.clientID);
    
    // --- Event Handlers ---
    const handleSignalingStatus = (event: { status: 'connected' | 'disconnected' }) => {
      console.log(`Signaling status changed: ${event.status}`);
      setSignalingStatus(event.status);
    };

    const handleSync = (synced: boolean) => {
      if (synced) {
        setIsSynced(true);
        const currentDocSize = newYDoc.getMap('nodes').size;
        console.log(`useYjs: Synced with IndexedDB for room: ${roomId}. Document size is now: ${currentDocSize}`);
        webrtcProvider.awareness.setLocalStateField('user', { name: myUsername });
      }
    };

    const handleAwarenessChange = (changes: { added: number[], updated: number[], removed: number[] }) => {
      const states = webrtcProvider.awareness.getStates();
      newYDoc.transact(() => {
        changes.added.forEach(clientId => {
          const userState = states.get(clientId)?.user;
          if (userState) { newPeers.set(String(clientId), userState); }
        });
        changes.updated.forEach(clientId => {
          const userState = states.get(clientId)?.user;
          if (userState) { newPeers.set(String(clientId), userState); }
        });
        changes.removed.forEach(clientId => {
          newPeers.delete(String(clientId));
        });
      });
      console.log(`useYjs: Awareness change detected. Found ${states.size} total peers. Current peers map:`, Object.fromEntries(newPeers.entries()));
    };

    // --- Attach Handlers ---
    webrtcProvider.on('status', handleSignalingStatus);
    persistence.on('synced', handleSync);
    if (persistence.synced) {
      handleSync(true);
    }
    webrtcProvider.awareness.on('change', handleAwarenessChange);
          handleAwarenessChange({ added: Array.from(webrtcProvider.awareness.getStates().keys()), updated: [], removed: [] });
    
        webrtcProvider.on('synced', (synced: boolean) => {
          if (synced) {
            console.log(`useYjs: WebRTC provider has synced for room: ${roomId}.`);
          }
        });
    
        // --- Cleanup Effect ---
        return () => {      console.log(`Y.js: Destroying instance for room: ${roomId}`);
      webrtcProvider.destroy();
      persistence.destroy();
      newYDoc.destroy();
      
      // Reset all state
      setYdoc(null);
      setMeta(null);
      setPeers(null);
      setIsSynced(false);
      setMyPeerId(null);
    };
  }, [roomId, myUsername]);

  return { ydoc, isSynced, myPeerId, myUsername, setMyUsername, meta, peers, signalingStatus };
};