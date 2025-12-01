import React from 'react';
import { ViewSettingsService } from '../services/ViewSettingsService';
import ThemeSwitcher from './ThemeSwitcher';
import { LayoutSwitcher } from './LayoutSwitcher';
import styles from './SideboardSettings.module.css';
import { useViewSettings } from '../hooks/useViewSettings';
import { useModal } from '../context/ModalContext';
import { useYjsContext } from '../context/YjsContext';
import { useMeta } from '../hooks/useMeta';
import { useUIState } from '../context/UIStateContext';


interface SideboardSettingsProps {
  viewSettings: ReturnType<typeof useViewSettings>;
  deferredInstallPrompt: any; // Using `any` for simplicity with PWA prompt event
}

export function SideboardSettings({ viewSettings, deferredInstallPrompt }: SideboardSettingsProps) {
  const { services, myPeerId, awareness } = useYjsContext();
  const { hostId, activePlayerId } = useMeta();

  const { layoutMode, setLayoutMode } = useUIState();
  const { applySettings, resetSettings, shareSettings } = viewSettings;
  const { showAlert, showConfirm } = useModal();
  const [selectedPeerToPassTurn, setSelectedPeerToPassTurn] = React.useState<number | null>(null);

  const handleInstallClick = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // The prompt can only be used once. The `appinstalled` event will clear the state.
    }
  };

  // --- Peer List Logic ---
  const [peerOptions, setPeerOptions] = React.useState<Array<{id: number, username: string}>>([]);
  
  const currentLensPeer = peerOptions.find(peer => peer.id === activePlayerId);
  const currentLensUsername = currentLensPeer ? currentLensPeer.username : 'N/A';
  const iHaveTheTurn = myPeerId === activePlayerId;

  const updatePeerOptions = React.useCallback(() => {
    if (!awareness) {
      setPeerOptions([]);
      return;
    };
    const options = (Array.from(awareness.getStates().entries()) as Array<[number, Record<string, any>]>)
      .map(([clientId, clientState]: [number, Record<string, any>]) => ({
        id: clientId,
        username: (clientState.user?.name as string) || `Guest-${String(clientId).substring(0,4)}`
      }))
      .sort((a: { id: number; username: string }, b: { id: number; username: string }) => a.username.localeCompare(b.username));
    setPeerOptions(options);
  }, [awareness]);

  React.useEffect(() => {
    if (!awareness) return;
    
    awareness.on('change', updatePeerOptions);
    updatePeerOptions(); // Manual call to populate initial state

    return () => {
      awareness.off('change', updatePeerOptions);
    };
  }, [awareness, updatePeerOptions]);

  React.useEffect(() => {
    if (iHaveTheTurn && peerOptions.length > 1 && services.turnService) {
        const nextPlayerId = services.turnService.getNextPlayerInTurn();
        setSelectedPeerToPassTurn(nextPlayerId);
    } else {
        setSelectedPeerToPassTurn(null);
    }
  }, [activePlayerId, peerOptions, iHaveTheTurn, services.turnService]);

  const handlePassTurn = () => {
    if (selectedPeerToPassTurn !== null) {
      services.turnService.passTurn(selectedPeerToPassTurn);
    }
  };
  // --- End Peer List Logic ---



  const handleExportClick = () => {
    services.sessionService.exportSession();
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.microscope';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const sessionData = JSON.parse(e.target?.result as string);
            showConfirm(
              'This will overwrite the current session with the contents of the selected file. Are you sure?',
              () => {
                services.sessionService.applySession(sessionData);
              }
            );
          } catch (error) {
            console.error('Failed to parse session file:', error);
            showAlert('Failed to read or parse session file. Please ensure it is a valid JSON.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleUploadSettingsClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsedSettings = JSON.parse(e.target?.result as string);
            if (ViewSettingsService.isValidViewSettings(parsedSettings)) {
              applySettings(parsedSettings);
            } else {
              showAlert('Invalid View Settings file. Please ensure it has a "theme" or "layout" property.');
            }
          } catch (error) {
            console.error('Failed to parse view settings file:', error);
            showAlert('Failed to read or parse view settings file. Please ensure it is a valid JSON.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div>
      <h3>Settings</h3>
      <div className={styles.settingsGrid}>
        <ThemeSwitcher />
        <LayoutSwitcher currentLayout={layoutMode} onLayoutChange={setLayoutMode} />
      </div>

      <hr className={styles.divider} />

      {deferredInstallPrompt && (
        <>
          <h3>Application</h3>
          <div className={styles.buttonGroup}>
            <button onClick={handleInstallClick} className={styles.button}>
              Install App
            </button>
          </div>
          <hr className={styles.divider} />
        </>
      )}

      <h3>Session Data</h3>
      <div className={styles.buttonGroup}>
        <button onClick={handleExportClick} className={styles.button}>
          Export Session
        </button>
        <button onClick={handleImportClick} className={styles.button}>
          Import Session
        </button>
      </div>

      <hr className={styles.divider} />

      {false && (
        <>
          <h3>View Configuration</h3>
          <div className={styles.buttonGroup}>
            <button onClick={handleUploadSettingsClick} className={styles.button}>
              Upload View
            </button>
            <button onClick={shareSettings} className={styles.button}>
              Share View
            </button>
            <button onClick={resetSettings} className={styles.button}>
              Reset View
            </button>
          </div>
        </>
      )}



      <h3>Connected Peers</h3>
      <p>Current Turn: <strong>{currentLensUsername}</strong> {iHaveTheTurn && '(You)'}</p>
      <ul className={styles.peerList}>
        {peerOptions.map(peer => (
          <li 
            key={peer.id} 
            className={`${styles.peerItem} ${peer.id === activePlayerId ? styles.isLens : ''}`}
          >
            {peer.username}
            {peer.id === hostId && ' (Host)'}
            {peer.id === activePlayerId && ' (Lens)'}
          </li>
        ))}
        {peerOptions.length === 0 && <li>Only you are connected.</li>}
      </ul>

      {iHaveTheTurn && peerOptions.length > 1 && (
        <div className={styles.passTurnSection}>
          <h4>Pass Turn To:</h4>
          <select 
            className={styles.select}
            value={selectedPeerToPassTurn || ''}
            onChange={(e) => setSelectedPeerToPassTurn(parseInt(e.target.value))}
          >
            {/* Default option if no peer is selected, or if the current peer is the only one */}
            <option value="" disabled>Select a peer</option>
            {peerOptions
              .filter(peer => peer.id !== myPeerId)
              .map(peer => (
                <option key={peer.id} value={peer.id}>
                  {peer.username}
                </option>
              ))}
          </select>
          <button 
            className={styles.button}
            onClick={handlePassTurn}
            disabled={!selectedPeerToPassTurn} // Disable if no peer is selected
          >
            Pass Turn
          </button>
        </div>
      )}

      <hr className={styles.divider} />

      <h3>About</h3>
      <div className={styles.infoGroup}>
        <a href="https://github.com/forgedstanzas/microscoping" target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
        <br />
        <a href={import.meta.env.BASE_URL}>
          Return to Lobby
        </a>
      </div>
    </div>
  );
}
