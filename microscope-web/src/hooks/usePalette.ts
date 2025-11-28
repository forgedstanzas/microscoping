import { useEffect, useState, useCallback, useMemo } from 'react';
import * as Y from 'yjs';

/**
 * A hook for interacting with the shared palette of affirmed and banned words
 * within a specific Y.js document.
 *
 * @param ydoc The Y.js document to connect to.
 * @returns An object containing the live lists of words and functions to modify them.
 */
export const usePalette = (ydoc: Y.Doc) => {
  // Use useMemo to get stable references to the Y.Arrays.
  const { yAffirmedWords, yBannedWords } = useMemo(() => {
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
  }, [ydoc]);

  const [affirmedWords, setAffirmedWords] = useState<string[]>(() => yAffirmedWords.toArray());
  const [bannedWords, setBannedWords] = useState<string[]>(() => yBannedWords.toArray());

  useEffect(() => {
    const handleAffirmedChange = () => setAffirmedWords(yAffirmedWords.toArray());
    const handleBannedChange = () => setBannedWords(yBannedWords.toArray());

    yAffirmedWords.observe(handleAffirmedChange);
    yBannedWords.observe(handleBannedChange);

    // Initial sync
    handleAffirmedChange();
    handleBannedChange();

    return () => {
      yAffirmedWords.unobserve(handleAffirmedChange);
      yBannedWords.unobserve(handleBannedChange);
    };
  }, [yAffirmedWords, yBannedWords]);

  const addAffirmedWord = useCallback((word: string) => {
    if (word && !yAffirmedWords.toArray().includes(word)) {
      ydoc.transact(() => {
        yAffirmedWords.push([word]);
      });
    }
  }, [ydoc, yAffirmedWords]);

  const removeAffirmedWord = useCallback((word: string) => {
    const index = yAffirmedWords.toArray().indexOf(word);
    if (index > -1) {
      ydoc.transact(() => {
        yAffirmedWords.delete(index, 1);
      });
    }
  }, [ydoc, yAffirmedWords]);

  const addBannedWord = useCallback((word: string) => {
    if (word && !yBannedWords.toArray().includes(word)) {
      ydoc.transact(() => {
        yBannedWords.push([word]);
      });
    }
  }, [ydoc, yBannedWords]);

  const removeBannedWord = useCallback((word: string) => {
    const index = yBannedWords.toArray().indexOf(word);
    if (index > -1) {
      ydoc.transact(() => {
        yBannedWords.delete(index, 1);
      });
    }
  }, [ydoc, yBannedWords]);

  return {
    affirmedWords,
    bannedWords,
    addAffirmedWord,
    removeAffirmedWord,
    addBannedWord,
    removeBannedWord,
  };
};
