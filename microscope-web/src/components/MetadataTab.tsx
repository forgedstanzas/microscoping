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
  const { services, myPeerId, myUsername, awareness } = useYjsContext();
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
    services.nodeService.setStrictMode(!isStrictMode);
  };

  const [peerOptions, setPeerOptions] = React.useState<Array<{id: number, username: string}>>([]);
  const [hostUsername, setHostUsername] = React.useState('N/A');

  React.useEffect(() => {
    if (!awareness) return;

    const updatePeers = () => {
      const states = awareness.getStates();
      // Update peer options for dropdown
      const options = Array.from(states.entries())
        .map(([clientId, clientState]: [number, Record<string, any>]) => ({
          id: clientId,
          username: (clientState.user?.name as string) || `Guest-${String(clientId).substring(0,4)}`
        }))
        .sort((a: { id: number; username: string }, b: { id: number; username: string }) => a.username.localeCompare(b.username));
      setPeerOptions(options);

      // Update host username
      const currentHostState = hostId ? states.get(hostId) : undefined;
      setHostUsername(currentHostState?.user?.name || 'N/A');
    };

    awareness.on('change', updatePeers);
    updatePeers(); // Initial population

    return () => {
      awareness.off('change', updatePeers);
    };
  }, [awareness, hostId]);

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
