import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc'; // Import WebrtcProvider
import { useYjs as useYjsHook } from '../hooks/useYjs';
import { Lobby } from '../components/Lobby';
import NodeService from '../services/NodeService';
import SessionManager from '../services/SessionManager';
import { TurnService } from '../services/TurnService'; // Import TurnService
import { addRecentSession } from '../services/RecentSessionsManager';
import { META_KEYS } from '../types/meta';
import { useModal } from './ModalContext';

// Delay in ms to wait before assuming we are the first peer.
const INIT_DELAY = 2500; // Increased delay for more reliability

interface YjsContextType {
  ydoc: Y.Doc | null;
  isSynced: boolean;
  myPeerId: number | null;
  myUsername: string;
  signalingStatus: 'connecting' | 'connected' | 'disconnected';
  meta: Y.Map<any> | null;
  provider: WebrtcProvider | null; // Add this
  services: {
    nodeService: NodeService;
    sessionService: SessionManager;
    turnService: TurnService; // Add TurnService here
  } | null;
}

const YjsContext = createContext<YjsContextType | null>(null);

interface YjsProviderProps {
  children: React.ReactNode;
  roomId: string;
  initialSessionTitle: string | null;
}

export function YjsProvider({ children, roomId, initialSessionTitle }: YjsProviderProps) {

  
  const { showAlert } = useModal();
  
  const yjsState = useYjsHook(roomId);
  const { ydoc, isSynced, myPeerId, meta, myUsername, signalingStatus, awareness, provider } = yjsState;

  const services = useMemo(() => {
    if (!ydoc || !myPeerId || !awareness) return null; // Ensure awareness is available
    const nodeService = new NodeService(ydoc, myPeerId); // Pass myPeerId to NodeService
    const sessionService = new SessionManager(ydoc);
    const turnService = new TurnService(ydoc, awareness, myPeerId); // Instantiate TurnService
    return { nodeService, sessionService, turnService }; // Return turnService
  }, [ydoc, myPeerId, awareness]); // Add awareness to dependencies

  // Effect for deferred one-time setup of a new document.
  useEffect(() => {
    if (isSynced && services && ydoc && myPeerId !== null && awareness && meta) { // Added meta
      const initTimeout = setTimeout(() => {
        const nodesMap = ydoc.getMap('nodes');
        const peerCount = awareness.getStates().size;
        const currentHostId = meta.get(META_KEYS.HOST_ID);
        
        console.log(`YjsProvider: Final initialization check after ${INIT_DELAY}ms. Nodes map size: ${nodesMap.size}, Peer count: ${peerCount}, Host: ${currentHostId}`);

        // If, after the delay, the document is empty, we may need to initialize it.
        if (nodesMap.size === 0) {
          // If we are alone, we are creating a new session.
          if (peerCount <= 1 && initialSessionTitle !== null) {
            console.log(`YjsProvider: We are alone and intended to create. Initializing document and setting self as host.`);
            services.nodeService.addNode({ type: 'period', title: 'Start Period', isBookend: true, order: 0 });
            services.nodeService.addNode({ type: 'period', title: 'End Period', isBookend: true, order: 1 });
            
            // Also initialize the palette
            const paletteMap = ydoc.getMap('palette');
            paletteMap.set('affirmedWords', new Y.Array<string>());
            paletteMap.set('bannedWords', new Y.Array<string>());

            services.nodeService.setHostId(myPeerId); // Set self as host
            if (initialSessionTitle) {
              services.nodeService.setHistoryTitle(initialSessionTitle);
            }
            services.turnService.initializeTurn();
          } else if (peerCount > 1 && currentHostId === undefined) {
             // We are not alone, but no host is set. This means we are joining a new session simultaneously.
             // The peer with the lowest ID will become host.
             const connectedPeerIds = Array.from(awareness.getStates().keys());
             if (!connectedPeerIds.includes(myPeerId)) connectedPeerIds.push(myPeerId);
             const newHostId = Math.min(...connectedPeerIds);
             if (myPeerId === newHostId) {
                console.log(`[YjsProvider] No host found after delay. Electing self as new host: ${newHostId}`);
                services.nodeService.setHostId(newHostId);
                services.turnService.initializeTurn();
             }
          } else if (peerCount <= 1 && initialSessionTitle === null) {
            // We joined via a link, found no local data, and found no peers. This is a connection failure.
            console.error(`YjsProvider: Failed to find peers for room '${roomId}'. Displaying error.`);
            showAlert('Connection Failed\n\nCould not connect to any peers in the session. Please check the room code or your network connection and try again.');
          }
        }
      }, INIT_DELAY);

      return () => clearTimeout(initTimeout);
    }
  }, [isSynced, services, ydoc, myPeerId, awareness, meta, initialSessionTitle, roomId, showAlert]);

  // Effect to keep the 'recent sessions' list up-to-date
  useEffect(() => {
    if (isSynced && roomId && meta) {
      const handleMetaChange = () => {
        const sessionName = meta.get(META_KEYS.HISTORY_TITLE) || 'Untitled Session';
        addRecentSession(roomId, sessionName as string);
      };
      // Run once on setup and then whenever the meta map changes
      handleMetaChange();
      meta.observe(handleMetaChange);
      return () => {
        meta.unobserve(handleMetaChange);
      };
    }
  }, [isSynced, roomId, meta]);

  // Effect to handle host re-election and turn management for disconnected players
  useEffect(() => {
    if (isSynced && services && myPeerId !== null && meta && awareness && provider) { // Added provider
      const handleStateChecks = () => {
        const currentHostId = meta.get(META_KEYS.HOST_ID) as number | undefined;
        const activePlayerId = meta.get(META_KEYS.ACTIVE_PLAYER_ID) as number | undefined;
        const connectedPeerIds = Array.from(awareness.getStates().keys());
        const amHost = myPeerId === currentHostId;

        // 1. Host Re-election Logic: Only run if a host was previously set and has now disconnected.
        if (currentHostId !== undefined && !connectedPeerIds.includes(currentHostId)) {
          // Add self to candidate list if not already present
          if (!connectedPeerIds.includes(myPeerId)) {
            connectedPeerIds.push(myPeerId);
          }
          const newHostId = Math.min(...connectedPeerIds);
          // Only the peer with the lowest ID becomes the new host
          if (myPeerId === newHostId && currentHostId !== newHostId) {
            console.log(`[YjsProvider] Host ${currentHostId} disconnected. Electing new host: ${newHostId}`);
            services.nodeService.setHostId(newHostId);
          }
        }
        
        // 2. Turn re-assignment logic: if active player disconnects, host re-assigns turn.
        if (amHost && activePlayerId !== undefined && !connectedPeerIds.includes(activePlayerId)) {
          console.log(`[YjsProvider] Active player ${activePlayerId} has disconnected. Host is re-assigning turn.`);
          const nextPlayerId = services.turnService.getNextPlayerInTurn();
          if (nextPlayerId !== null) {
            // Directly set the meta key, bypassing normal turn-passing rules.
            services.nodeService.setActivePlayerId(nextPlayerId);
          }
        }
      };

      awareness.on('change', handleStateChecks);
      handleStateChecks(); // Call once to handle initial state

      return () => {
        awareness.off('change', handleStateChecks);
      };
    }
  }, [isSynced, services, myPeerId, meta, provider, awareness]); // Added provider and awareness to dependencies
  
  // Effect to manage the NodeService lifecycle
  useEffect(() => {
    return () => {
      services?.nodeService.destroy();
    };
  }, [services]);
  
  if (!ydoc || !meta || !services) {
    return <div>Loading Session...</div>;
  }

  return (
    <YjsContext.Provider value={{ ...yjsState, ydoc, meta, services, signalingStatus, provider }}>
      {children}
    </YjsContext.Provider>
  );
}

export function useYjsContext() {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjsContext must be used within a YjsProvider');
  }
  return context as YjsContextType & {
    ydoc: Y.Doc;
    meta: Y.Map<any>;
    provider: WebrtcProvider; // And this
    services: {
      nodeService: NodeService;
      sessionService: SessionManager;
      turnService: TurnService; // Add TurnService here
    };
  };
}
