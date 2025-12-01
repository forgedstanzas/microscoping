import React from 'react';
import styles from './MetadataTab.module.css';
import { useYjsContext } from '../context/YjsContext';
import { useMeta } from '../hooks/useMeta';
import { useEntitlements } from '../hooks/useEntitlements';

interface MetadataTabProps {
  isMetadataCollapsed: boolean;
  setIsMetadataCollapsed: (isCollapsed: boolean) => void;
  isPeelOff: boolean;
}

export function MetadataTab({ isMetadataCollapsed, setIsMetadataCollapsed }: MetadataTabProps) {
  const { services, myPeerId, myUsername, peers } = useYjsContext();
  const metaState = useMeta();
  const { isHost, canEditMeta } = useEntitlements();

  const {
    hostId,
    historyTitle = '',
    currentFocus = '',
    activePlayerId = null,
    isStrictMode = false,
  } = metaState;

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

  const [peerOptions, setPeerOptions] = React.useState<Array<{id: string, username: string}>>([]);
  const [hostUsername, setHostUsername] = React.useState('N/A');

  React.useEffect(() => {
    if (!peers) return;

    const updatePeers = () => {
      // Update peer options for dropdown
      const options = Array.from(peers.entries())
        .map(([peerId, peerData]) => ({
          id: peerId,
          username: peerData.name || `Guest-${String(peerId).substring(0,4)}`
        }))
        .sort((a, b) => a.username.localeCompare(b.username));
      setPeerOptions(options);

      // Update host username
      const currentHostUsername = hostId ? peers.get(String(hostId))?.name || 'N/A' : 'N/A';
      setHostUsername(currentHostUsername);
    };

    peers.observe(updatePeers);
    updatePeers(); // Initial population

    return () => {
      peers.unobserve(updatePeers);
    };
  }, [peers, hostId]);

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
              disabled={!canEditMeta}
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
              disabled={!canEditMeta}
            />
          </div>
    
          <div className={styles.fieldGroup}>
            <label htmlFor="currentLens">Current Lens:</label>
            <select
              id="currentLens"
              value={activePlayerId ?? ''}
              onChange={handleCurrentLensChange}
              disabled={!canEditMeta}
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
              disabled={!canEditMeta}
              className={styles.toggleSwitch}
            />
          </div>
        </>
      )}
    </div>
  );
}
