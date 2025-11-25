import { useEffect, useState, useCallback, useMemo } from 'react';
import { ydoc } from './useYjs';
import * as Y from 'yjs';
import { useYjs } from './useYjs';

/**
 * A hook for interacting with the shared palette of affirmed and banned words.
 *
 * @returns An object containing the live lists of words and functions to modify them.
 */
export const usePalette = () => {
  const { isSynced } = useYjs();

  // Use useMemo to get stable references to the Y.Arrays, BUT only after the doc is synced.
  const { yAffirmedWords, yBannedWords } = useMemo(() => {
    if (!isSynced) {
      // Return temporary, non-functional Y.Arrays if not synced.
      // This prevents the app from crashing on the initial render.
      return {
        yAffirmedWords: new Y.Array<string>(),
        yBannedWords: new Y.Array<string>(),
      };
    }
    const paletteMap = ydoc.getMap('palette');
    if (!paletteMap.has('affirmedWords')) {
      paletteMap.set('affirmedWords', new Y.Array<string>());
    }
    if (!paletteMap.has('bannedWords')) {
      paletteMap.set('bannedWords', new Y.Array<string>());
    }
    const yAffirmed = paletteMap.get('affirmedWords') as Y.Array<string>;
    const yBanned = paletteMap.get('bannedWords') as Y.Array<string>;
    return { yAffirmedWords: yAffirmed, yBannedWords: yBanned };
  }, [isSynced]);

  const [affirmedWords, setAffirmedWords] = useState<string[]>([]);
  const [bannedWords, setBannedWords] = useState<string[]>([]);

  useEffect(() => {
    // When the hook first runs or when the Y.Array references change (after sync),
    // update the React state and attach observers.
    if (isSynced) {
      setAffirmedWords(yAffirmedWords.toArray());
      setBannedWords(yBannedWords.toArray());

      const handleAffirmedChange = () => setAffirmedWords(yAffirmedWords.toArray());
      const handleBannedChange = () => setBannedWords(yBannedWords.toArray());

      yAffirmedWords.observe(handleAffirmedChange);
      yBannedWords.observe(handleBannedChange);

      return () => {
        yAffirmedWords.unobserve(handleAffirmedChange);
        yBannedWords.unobserve(handleBannedChange);
      };
    }
  }, [yAffirmedWords, yBannedWords, isSynced]); // Rerun when isSynced is true

  const addAffirmedWord = useCallback((word: string) => {
    if (word && isSynced && !yAffirmedWords.toArray().includes(word)) {
      ydoc.transact(() => {
        yAffirmedWords.push([word]);
      });
    }
  }, [yAffirmedWords, isSynced]);

  const removeAffirmedWord = useCallback((word: string) => {
    if (!isSynced) return;
    const index = yAffirmedWords.toArray().indexOf(word);
    if (index > -1) {
      ydoc.transact(() => {
        yAffirmedWords.delete(index, 1);
      });
    }
  }, [yAffirmedWords, isSynced]);

  const addBannedWord = useCallback((word: string) => {
    if (word && isSynced && !yBannedWords.toArray().includes(word)) {
      ydoc.transact(() => {
        yBannedWords.push([word]);
      });
    }
  }, [yBannedWords, isSynced]);

  const removeBannedWord = useCallback((word: string) => {
    if (!isSynced) return;
    const index = yBannedWords.toArray().indexOf(word);
    if (index > -1) {
      ydoc.transact(() => {
        yBannedWords.delete(index, 1);
      });
    }
  }, [yBannedWords, isSynced]);

  return {
    affirmedWords,
    bannedWords,
    addAffirmedWord,
    removeAffirmedWord,
    addBannedWord,
    removeBannedWord,
  };
};
