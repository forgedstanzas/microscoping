import React, { useState } from 'react';
import { usePalette } from '../hooks/usePalette';
import styles from './SideboardPalette.module.css';

interface SideboardPaletteProps {
  palette: ReturnType<typeof usePalette>;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isPeelOff: boolean;
}

export function SideboardPalette({ palette, isCollapsed, setIsCollapsed, isPeelOff }: SideboardPaletteProps) {
  const {
    affirmedWords,
    bannedWords,
    addAffirmedWord,
    removeAffirmedWord,
    addBannedWord,
    removeBannedWord,
  } = palette;

  const [affirmedInput, setAffirmedInput] = useState('');
  const [bannedInput, setBannedInput] = useState('');

  const handleAffirmedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAffirmedWord(affirmedInput);
      setAffirmedInput('');
    }
  };

  const handleBannedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBannedWord(bannedInput);
      setBannedInput('');
    }
  };

  const isCollapsible = !isPeelOff;

  return (
    <div className={isPeelOff ? styles.peeledOff : ''}>
      <h3 
        className={isCollapsible ? styles.collapsibleHeader : ''} 
        onClick={isCollapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        Palette {isCollapsible && (isCollapsed ? '▶' : '▼')}
      </h3>
      {(!isCollapsed || isPeelOff) && (
        <div className={styles.paletteContainer}>
          {/* Affirmed Words Column */}
          <div className={styles.listColumn}>
            <h4>Affirmed Words</h4>
            <ul className={styles.wordList}>
              {affirmedWords.map((word) => (
                <li key={word} onClick={() => setAffirmedInput(word)}>
                  {word}
                </li>
              ))}
            </ul>
            <input
              type="text"
              className={styles.wordInput}
              value={affirmedInput}
              onChange={(e) => setAffirmedInput(e.target.value)}
              onKeyDown={handleAffirmedKeyDown}
              placeholder="Type a word..."
            />
            <div className={styles.buttonGroup}>
              <button
                className={styles.button}
                onClick={() => {
                  addAffirmedWord(affirmedInput);
                  setAffirmedInput('');
                }}
              >
                +
              </button>
              <button
                className={styles.button}
                onClick={() => {
                  removeAffirmedWord(affirmedInput);
                  setAffirmedInput('');
                }}
              >
                -
              </button>
            </div>
          </div>

          {/* Banned Words Column */}
          <div className={styles.listColumn}>
            <h4>Banned Words</h4>
            <ul className={styles.wordList}>
              {bannedWords.map((word) => (
                <li key={word} onClick={() => setBannedInput(word)}>
                  {word}
                </li>
              ))}
            </ul>
            <input
              type="text"
              className={styles.wordInput}
              value={bannedInput}
              onChange={(e) => setBannedInput(e.target.value)}
              onKeyDown={handleBannedKeyDown}
              placeholder="Type a word..."
            />
            <div className={styles.buttonGroup}>
              <button
                className={styles.button}
                onClick={() => {
                  addBannedWord(bannedInput);
                  setBannedInput('');
                }}
              >
                +
              </button>
              <button
                className={styles.button}
                onClick={() => {
                  removeBannedWord(bannedInput);
                  setBannedInput('');
                }}
              >
                -
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}