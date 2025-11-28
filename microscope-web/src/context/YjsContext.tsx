import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { useYjs as useYjsHook } from '../hooks/useYjs';
import { Lobby } from '../components/Lobby';
import NodeService from '../services/NodeService';
import SessionManager from '../services/SessionManager';
import { addRecentSession } from '../services/RecentSessionsManager';
import { META_KEYS } from '../types/meta';

// 1. Define the shape of the context data
interface YjsContextType {
  ydoc: Y.Doc;
  isSynced: boolean;
  myPeerId: number | null;
  myUsername: string;
  meta: Y.Map<any>;
  peers: Y.Map<any>;
  services: {
    nodeService: NodeService;
    sessionService: SessionManager;
  };
}

const YjsContext = createContext<YjsContextType | null>(null);

// 2. Create the Provider component
interface YjsProviderProps {
  children: React.ReactNode;
}

export function YjsProvider({ children }: YjsProviderProps) {
  const [roomId, setRoomIdInternal] = useState<string | null>(null);
  const [initialSessionTitle, setInitialSessionTitle] = useState<string | null>(null);

  const onJoinRoom = (id: string, title?: string) => {
    setRoomIdInternal(id);
    if (title) {
      setInitialSessionTitle(title);
    }
  };
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
      onJoinRoom(urlRoomId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  const yjsState = useYjsHook(roomId);
  const { ydoc, isSynced, myPeerId, meta, peers } = yjsState;

  // Create service instances once ydoc is available
  const services = useMemo(() => {
    if (!ydoc) return null;
    
    const nodeService = new NodeService(ydoc);
    const sessionService = new SessionManager(ydoc);

    return { nodeService, sessionService };
  }, [ydoc]);

  // Effect for one-time setup of a new document.
  // This MUST run after the document is synced to prevent race conditions.
  useEffect(() => {
    if (isSynced && services) {
      const nodesMap = ydoc.getMap('nodes');
      if (nodesMap.size === 0) {
        console.log('YjsProvider: Synced and empty, initializing new document...');
        services.nodeService.addNode({ type: 'period', title: 'Start Period', isBookend: true, order: 0 });
        services.nodeService.addNode({ type: 'period', title: 'End Period', isBookend: true, order: 1 });
        if (myPeerId !== null) {
          services.nodeService.setHostId(myPeerId);
        }
      }
    }
  }, [isSynced, services, ydoc, myPeerId]);

  // Effect for session management (setting initial title)
  useEffect(() => {
    if (isSynced && services && initialSessionTitle && !meta.get(META_KEYS.HISTORY_TITLE)) {
      services.nodeService.setHistoryTitle(initialSessionTitle);
      setInitialSessionTitle(null);
    }
  }, [isSynced, services, initialSessionTitle, meta]);

  // Effect to keep the 'recent sessions' list up-to-date
  useEffect(() => {
    if (isSynced && roomId) {
      const handleMetaChange = (event: Y.YMapEvent<any>) => {
        if (event.keysChanged.has(META_KEYS.HISTORY_TITLE) || !event.keysChanged.size) { // Also run on initial observe
          const sessionName = meta.get(META_KEYS.HISTORY_TITLE) || 'Untitled Session';
          addRecentSession(roomId, sessionName as string);
        }
      };

      // Run once on setup and then whenever the meta map changes
      handleMetaChange({ keysChanged: new Set() } as any); // Initial run
      meta.observe(handleMetaChange);

      return () => {
        meta.unobserve(handleMetaChange);
      };
    }
  }, [isSynced, roomId, meta]);

  // Effect to handle host election
  useEffect(() => {
    if (isSynced && services && myPeerId !== null) {
      const currentHostId = meta.get(META_KEYS.HOST_ID);
      const connectedPeerIds = Array.from(peers.keys());
      if (!currentHostId || !connectedPeerIds.includes(currentHostId)) {
        services.nodeService.setHostId(myPeerId);
      }
    }
  }, [isSynced, services, peers, myPeerId, meta]);
  
  // Effect to manage the NodeService lifecycle
  useEffect(() => {
    // When services are created, this effect runs.
    // When the component unmounts, the cleanup function will run.
    return () => {
      services?.nodeService.destroy();
    };
  }, [services]);

  if (!roomId || !ydoc || !services) {
    return <Lobby onJoinRoom={onJoinRoom} />;
  }

  return (
    <YjsContext.Provider value={{ ...yjsState, ydoc, services }}>
      {isSynced ? children : <div>Loading...</div>}
    </YjsContext.Provider>
  );
}

// 3. Create the custom hook for consuming the context
export function useYjsContext() {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjsContext must be used within a YjsProvider');
  }
  return context;
}
