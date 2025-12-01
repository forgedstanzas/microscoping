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
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [myPeerId, setMyPeerId] = useState<number | null>(null);
  const [signalingStatus, setSignalingStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const [myUsername, setMyUsername] = useState<string>(() => {
    return localStorage.getItem('microscope-username') || generateDefaultUsername();
  });

  useEffect(() => {
    localStorage.setItem('microscope-username', myUsername);
  }, [myUsername]);

  // Main effect for setting up and tearing down the Yjs connection.
  // This should only depend on the roomId.
  useEffect(() => {
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

    setYdoc(newYDoc);
    setMeta(newMeta);
    setPeers(newPeers);
    setProvider(webrtcProvider);
    setMyPeerId(webrtcProvider.awareness.clientID);
    
    const handleSignalingStatus = ({ connected }: { connected: boolean }) => {
      const status = connected ? 'connected' : 'disconnected';
      console.log(`Signaling status changed: ${status}`);
      setSignalingStatus(status);
    };

    const handlePersistenceSync = ({ synced }: { synced: boolean }) => {
      if (synced) {
        setIsSynced(true);
        console.log(`useYjs: Synced with IndexedDB for room: ${roomId}.`);
      }
    };
    
    const handleAwarenessChange = (changes: { added: number[], updated: number[], removed: number[] }) => {
      const states = webrtcProvider.awareness.getStates();
      newYDoc.transact(() => {
        changes.added.forEach(clientId => {
          const userState = states.get(clientId)?.user;
          if (userState) newPeers.set(String(clientId), userState);
        });
        changes.updated.forEach(clientId => {
          const userState = states.get(clientId)?.user;
          if (userState) newPeers.set(String(clientId), userState);
        });
        changes.removed.forEach(clientId => {
          newPeers.delete(String(clientId));
        });
      });
    };

    webrtcProvider.on('status', handleSignalingStatus);
    persistence.on('synced', handlePersistenceSync);
    webrtcProvider.awareness.on('change', handleAwarenessChange);
    
    // Immediately check sync status
    if (persistence.synced) {
      handlePersistenceSync({ synced: true });
    }

    return () => {
      console.log(`Y.js: Destroying instance for room: ${roomId}`);
      webrtcProvider.destroy();
      persistence.destroy();
      newYDoc.destroy();
      
      setYdoc(null);
      setMeta(null);
      setPeers(null);
      setProvider(null);
      setIsSynced(false);
      setMyPeerId(null);
    };
  }, [roomId]);

  // Effect to update user awareness data when username or provider changes.
  useEffect(() => {
    if (provider && myUsername && isSynced) {
      provider.awareness.setLocalStateField('user', { name: myUsername });
      console.log(`useYjs: Awareness username updated to: ${myUsername}`);
    }
  }, [myUsername, provider, isSynced]);

  return { ydoc, isSynced, myPeerId, myUsername, setMyUsername, meta, peers, signalingStatus, awareness: provider?.awareness, provider };
};