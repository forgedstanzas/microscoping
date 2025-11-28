import React from 'react';
import styles from './MetadataTab.module.css';
import { META_KEYS } from '../types/meta';
import { useYjsContext } from '../context/YjsContext';
import { useMeta } from '../hooks/useMeta';

interface MetadataTabProps {
  isMetadataCollapsed: boolean;
  setIsMetadataCollapsed: (isCollapsed: boolean) => void;
  isPeelOff: boolean;
}

export function MetadataTab({ isMetadataCollapsed, setIsMetadataCollapsed }: MetadataTabProps) {
  const { services, myPeerId, myUsername, peers } = useYjsContext();
  const metaState = useMeta();

  const {
    hostId,
    historyTitle = '',
    currentFocus = '',
    activePlayerId = null,
    isStrictMode = false,
  } = metaState;
  
  const isHost = hostId === myPeerId;

  // Handler for text inputs
  const handleHistoryTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    services.nodeService.setHistoryTitle(e.target.value);
  };

  const handleCurrentFocusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    services.nodeService.setCurrentFocus(e.target.value);
  };

  // Handler for Current Lens dropdown
  const handleCurrentLensChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === '' ? null : Number(e.target.value);
    services.nodeService.setActivePlayerId(value);
  };

  // Handler for Strict Mode toggle
  const handleStrictModeToggle = () => {
    services.nodeService.setIsStrictMode(!isStrictMode);
  };

  // Prepare peer options for Current Lens dropdown
  const peerOptions = Array.from(peers.entries())
    .map(([peerId, peerData]) => ({
      id: peerId,
      username: peerData.username || `Guest-${String(peerId).substring(0,4)}` // Fallback username
    }))
    .sort((a, b) => a.username.localeCompare(b.username));

  // Find host username for display purposes
  const hostUsername = hostId ? peers.get(hostId)?.username || 'N/A' : 'N/A';

  return (
    <div className={styles.metadataTab}>
      <h3 className={styles.collapsibleHeader} onClick={() => setIsMetadataCollapsed(!isMetadataCollapsed)}>
        Session Metadata {isMetadataCollapsed ? '▶' : '▼'}
      </h3>

      {!isMetadataCollapsed && (
        <>
          <div className={styles.infoGroup}>
            <strong>Your Peer ID:</strong> {myPeerId} <br />
            <strong>Your Username:</strong> {myUsername}
          </div>

          <div className={styles.infoGroup}>
            <strong>Host Status:</strong> {isHost ? 'You are the Host' : `Not Host (Current Host: ${hostUsername})`}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="historyTitle">History Title:</label>
            <input
              id="historyTitle"
              type="text"
              value={historyTitle}
              onChange={handleHistoryTitleChange}
              className={styles.textInput}
            />
          </div>
    
          <div className={styles.fieldGroup}>
            <label htmlFor="currentFocus">Current Focus:</label>
            <input
              id="currentFocus"
              type="text"
              value={currentFocus}
              onChange={handleCurrentFocusChange}
              className={styles.textInput}
            />
          </div>
    
          <div className={styles.fieldGroup}>
            <label htmlFor="currentLens">Current Lens:</label>
            <select
              id="currentLens"
              value={activePlayerId ?? ''}
              onChange={handleCurrentLensChange}
              disabled={!isHost} // Host Only
              className={styles.selectInput}
            >
              <option value="">(None)</option>
              {peerOptions.map(peer => (
                <option key={peer.id} value={peer.id}>
                  {peer.username}
                </option>
              ))}
            </select>
          </div>
    
          <div className={styles.fieldGroup}>
            <label htmlFor="strictMode">Strict Mode:</label>
            <input
              id="strictMode"
              type="checkbox"
              checked={isStrictMode}
              onChange={handleStrictModeToggle}
              disabled={!isHost} // Host Only
              className={styles.toggleSwitch}
            />
          </div>
        </>
      )}
    </div>
  );
}
