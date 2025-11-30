import { useState, useEffect } from 'react';
import { useYjsContext } from '../context/YjsContext';
import styles from './StatusIndicator.module.css';

export function StatusIndicator() {
  const { signalingStatus, isSynced } = useYjsContext();
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let currentMessage = '';
    if (signalingStatus === 'connecting') {
      currentMessage = 'Waking signaling server...';
    } else if (signalingStatus === 'disconnected') {
      currentMessage = 'Connection lost. Reconnecting...';
    } else if (!isSynced) {
      currentMessage = 'Syncing document...';
    }

    setMessage(currentMessage);
    setIsVisible(!!currentMessage);
  }, [signalingStatus, isSynced]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.statusIndicator}>
      {message}
    </div>
  );
}
