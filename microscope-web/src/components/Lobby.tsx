import React, { useState, useEffect } from 'react';
import styles from './Lobby.module.css';
import { ConnectionManager } from '../services/ConnectionManager';
import {
  getRecentSessions,
  removeRecentSession,
  type RecentSession,
} from '../services/RecentSessionsManager';
import ThemeSwitcher from './ThemeSwitcher';


interface LobbyProps {
  onJoinRoom: (roomId: string, initialTitle?: string) => void;
}

export function Lobby({ onJoinRoom }: LobbyProps) {
  const [joinCode, setJoinCode] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    getRecentSessions().then(setRecentSessions);
  }, []);


  const handleCreateRoom = () => {
    const { roomId } = ConnectionManager.createRoom();
    console.log(`Room created! Join at: ${ConnectionManager.getRoomUrl(roomId)}`);
    onJoinRoom(roomId, newSessionTitle);
  };

  const handleJoinRoom = () => {
    if (joinCode) {
      onJoinRoom(joinCode);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent the session from being joined
    await removeRecentSession(sessionId);
    setRecentSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.themeSwitcherWrapper}>
        <ThemeSwitcher />
      </div>
      <div className={styles.lobbyBox}>
        <h1>Microscope</h1>
        <p>A fractal history game.</p>
        
        <div className={styles.actionSection}>
          <h2>Create a New Game</h2>
          <input
            type="text"
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            placeholder="Enter history title (optional)..."
            className={styles.input}
          />
          <button onClick={handleCreateRoom} className={styles.button}>
            Create Room
          </button>
        </div>

        <div className={styles.actionSection}>
          <h2>Join a Game</h2>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter room code..."
            className={styles.input}
          />
          <button onClick={handleJoinRoom} className={styles.button}>
            Join
          </button>
        </div>

        {recentSessions.length > 0 && (
          <div className={styles.actionSection}>
            <h2>Recent Sessions</h2>
            <ul className={styles.recentList}>
              {recentSessions.map((session) => (
                <li key={session.id} className={styles.recentItem} onClick={() => onJoinRoom(session.id)}>
                  <div className={styles.sessionInfo}>
                    <span className={styles.recentName}>{session.name}</span>
                    <span className={styles.recentDate}>
                      {new Date(session.lastAccessed).toLocaleString()}
                    </span>
                  </div>
                  <button 
                    className={styles.deleteButton}
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    title="Remove from list"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
