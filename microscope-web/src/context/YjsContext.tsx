import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
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
  peers: Y.Map<any> | null;
  services: {
    nodeService: NodeService;
    sessionService: SessionManager;
    turnService: TurnService; // Add TurnService here
  } | null;
}

const YjsContext = createContext<YjsContextType | null>(null);

interface YjsProviderProps {
  children: React.ReactNode;
}

export function YjsProvider({ children }: YjsProviderProps) {
  const [roomId, setRoomIdInternal] = useState<string | null>(null);
  const [initialSessionTitle, setInitialSessionTitle] = useState<string | null>(null);
  const { showAlert } = useModal();

  const onJoinRoom = (id: string, title?: string) => {
    console.log(`YjsProvider: Attempting to join room '${id}' with initial title: '${title || 'none'}'`);
    setInitialSessionTitle(title !== undefined ? title : null);
    setRoomIdInternal(id);
  };
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
      onJoinRoom(urlRoomId);
    }
  }, []);

  useEffect(() => {
    if (roomId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== roomId) {
        url.searchParams.set('room', roomId);
        window.history.pushState({}, '', url.toString());
      }
    }
  }, [roomId]);
  
  const yjsState = useYjsHook(roomId);
  const { ydoc, isSynced, myPeerId, meta, peers, myUsername, setMyUsername, signalingStatus, awareness } = yjsState;

  const services = useMemo(() => {
    if (!ydoc || !myPeerId || !awareness) return null; // Ensure awareness is available
    const nodeService = new NodeService(ydoc, myPeerId); // Pass myPeerId to NodeService
    const sessionService = new SessionManager(ydoc);
    const turnService = new TurnService(ydoc, awareness, myPeerId); // Instantiate TurnService
    return { nodeService, sessionService, turnService }; // Return turnService
  }, [ydoc, myPeerId, awareness]); // Add awareness to dependencies

  // Effect for deferred one-time setup of a new document.
  useEffect(() => {
    if (isSynced && services && ydoc && myPeerId !== null && peers) {
      const initTimeout = setTimeout(() => {
        const nodesMap = ydoc.getMap('nodes');
        const peerCount = peers.size; 
        
        console.log(`YjsProvider: Final initialization check after ${INIT_DELAY}ms. Nodes map size: ${nodesMap.size}, Peer count: ${peerCount}`);

        if (nodesMap.size === 0) {
          // If we are alone after the delay, our action depends on our intent.
          if (peerCount <= 1) {
            // If `initialSessionTitle` is not null, it means we *intended* to create a new room.
            if (initialSessionTitle !== null) {
              console.log(`YjsProvider: We are alone and intended to create. Initializing.`);
              services.nodeService.addNode({ type: 'period', title: 'Start Period', isBookend: true, order: 0 });
              services.nodeService.addNode({ type: 'period', title: 'End Period', isBookend: true, order: 1 });
              services.nodeService.setHostId(myPeerId);
              // Also set the title if provided
              if (initialSessionTitle) {
                services.nodeService.setHistoryTitle(initialSessionTitle);
              }
              services.turnService.initializeTurn(); // Initialize the turn
            } else {
              // We joined via a link/recent, found no local data, and found no peers. This is a connection failure.
              console.error(`YjsProvider: Failed to find peers for room '${roomId}'. Displaying error.`);
              showAlert('Connection Failed\n\nCould not connect to any peers in the session. Please check the room code or your network connection and try again.');
            }
          } else {
            // We found peers, but the document is still empty. We should just wait for the data to sync.
            console.log(`YjsProvider: Found peers, waiting for document sync from them.`);
          }
        }
      }, INIT_DELAY);

      return () => clearTimeout(initTimeout);
    }
  }, [isSynced, services, ydoc, myPeerId, peers, initialSessionTitle, roomId, showAlert]);

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

  // Effect to handle host election
  useEffect(() => {
    if (isSynced && services && myPeerId !== null && meta && peers) {
      const handleElection = () => {
        const currentHostId = meta.get(META_KEYS.HOST_ID) as number | undefined;
        const connectedPeerIds = Array.from(peers.keys());

        if (currentHostId === undefined || !connectedPeerIds.includes(String(currentHostId))) {
          const candidateIds = connectedPeerIds.map(id => parseInt(id, 10));
          // Ensure my own ID is in the running if I'm not in the peers list yet
          if (!candidateIds.includes(myPeerId)) {
            candidateIds.push(myPeerId);
          }
          
          const newHostId = Math.min(...candidateIds);

          if (myPeerId === newHostId && currentHostId !== newHostId) {
            console.log(`YjsProvider: Host ${currentHostId} not found. Electing new host: ${newHostId}`);
            services.nodeService.setHostId(newHostId);
          }
        }
      };

      peers.observe(handleElection);
      handleElection(); // Initial check

      return () => {
        peers.unobserve(handleElection);
      };
    }
  }, [isSynced, services, myPeerId, meta, peers]);
  
  // Effect to manage the NodeService lifecycle
  useEffect(() => {
    return () => {
      services?.nodeService.destroy();
    };
  }, [services]);

  if (!roomId) {
    return <Lobby onJoinRoom={onJoinRoom} myUsername={myUsername} setMyUsername={setMyUsername} />;
  }
  
  if (!ydoc || !meta || !peers || !services) {
    return <div>Loading Session...</div>;
  }

  return (
    <YjsContext.Provider value={{ ...yjsState, ydoc, meta, peers, services, signalingStatus }}>
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
    peers: Y.Map<any>;
    services: {
      nodeService: NodeService;
      sessionService: SessionManager;
      turnService: TurnService; // Add TurnService here
    };
  };
}
