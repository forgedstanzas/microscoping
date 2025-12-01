import { useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';

/**
 * A hook for interacting with the shared palette of affirmed and banned words
 * within a specific Y.js document. This hook is reactive to the asynchronous
 * creation of the palette data structures.
 *
 * @param ydoc The Y.js document to connect to.
 * @returns An object containing the live lists of words and functions to modify them.
 */
export const usePalette = (ydoc: Y.Doc | null) => {
  const [yAffirmedWords, setYAffirmedWords] = useState<Y.Array<string> | null>(null);
  const [yBannedWords, setYBannedWords] = useState<Y.Array<string> | null>(null);

  const [affirmedWords, setAffirmedWords] = useState<string[]>([]);
  const [bannedWords, setBannedWords] = useState<string[]>([]);

  // Effect 1: Observe the paletteMap and set the Y.Array states
  useEffect(() => {
    if (!ydoc) return;

    const paletteMap = ydoc.getMap('palette');

    const checkAndSetArrays = () => {
      const affirmed = paletteMap.get('affirmedWords') as Y.Array<string> | undefined;
      const banned = paletteMap.get('bannedWords') as Y.Array<string> | undefined;

      if (affirmed) {
        setYAffirmedWords(affirmed);
        setAffirmedWords(affirmed.toArray());
      }
      if (banned) {
        setYBannedWords(banned);
        setBannedWords(banned.toArray());
      }
    };

    // Check immediately and also observe for future changes (when YjsProvider initializes it)
    checkAndSetArrays();
    paletteMap.observe(checkAndSetArrays);

    return () => {
      paletteMap.unobserve(checkAndSetArrays);
    };
  }, [ydoc]);

  // Effect 2: Observe the Y.Arrays once they are available
  useEffect(() => {
    if (!yAffirmedWords) return;
    const handleAffirmedChange = () => setAffirmedWords(yAffirmedWords.toArray());
    yAffirmedWords.observe(handleAffirmedChange);
    return () => yAffirmedWords.unobserve(handleAffirmedChange);
  }, [yAffirmedWords]);

  useEffect(() => {
    if (!yBannedWords) return;
    const handleBannedChange = () => setBannedWords(yBannedWords.toArray());
    yBannedWords.observe(handleBannedChange);
    return () => yBannedWords.unobserve(handleBannedChange);
  }, [yBannedWords]);


  const addAffirmedWord = useCallback((word: string) => {
    if (word && yAffirmedWords && !yAffirmedWords.toArray().includes(word)) {
      yAffirmedWords.doc?.transact(() => {
        yAffirmedWords.push([word]);
      });
    }
  }, [yAffirmedWords]);

  const removeAffirmedWord = useCallback((word: string) => {
    if (yAffirmedWords) {
      const index = yAffirmedWords.toArray().indexOf(word);
      if (index > -1) {
        yAffirmedWords.doc?.transact(() => {
          yAffirmedWords.delete(index, 1);
        });
      }
    }
  }, [yAffirmedWords]);

  const addBannedWord = useCallback((word: string) => {
    if (word && yBannedWords && !yBannedWords.toArray().includes(word)) {
      yBannedWords.doc?.transact(() => {
        yBannedWords.push([word]);
      });
    }
  }, [yBannedWords]);

  const removeBannedWord = useCallback((word: string) => {
    if (yBannedWords) {
      const index = yBannedWords.toArray().indexOf(word);
      if (index > -1) {
        yBannedWords.doc?.transact(() => {
          yBannedWords.delete(index, 1);
        });
      }
    }
  }, [yBannedWords]);

  return {
    affirmedWords,
    bannedWords,
    addAffirmedWord,
    removeAffirmedWord,
    addBannedWord,
    removeBannedWord,
  };
};
