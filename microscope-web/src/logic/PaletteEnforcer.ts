import Fuse from 'fuse.js';

// Fuse.js options for fuzzy searching.
const fuseOptions: Fuse.IFuseOptions<WordWithIndex> = {
  includeScore: true,
  includeMatches: true,
  findAllMatches: true,
  threshold: 0.2,
  keys: ['word'],
};

export interface PaletteMatch {
  startIndex: number;
  endIndex: number;
  word: string;
  type: 'banned' | 'affirmed';
}

interface WordWithIndex {
  word: string;
  startIndex: number;
}

/**
 * Finds words in a block of text that are a fuzzy match for the affirmed and banned lists.
 * @param text The text to search within.
 * @param bannedList An array of words to mark as 'banned'.
 * @param affirmedList An array of words to mark as 'affirmed'.
 * @returns An array of match objects for both types. Banned matches take precedence.
 */
export function findPaletteMatches(
  text: string,
  bannedList: string[] = [],
  affirmedList: string[] = []
): PaletteMatch[] {
  if (!text || (!bannedList.length && !affirmedList.length)) {
    return [];
  }

  // 1. Create an array of words with their original start indices.
  const wordsWithIndices: WordWithIndex[] = [];
  const regex = /\b[\w'-]+\b/g; // Regex to find word-like segments
  let match;
  while ((match = regex.exec(text)) !== null) {
    wordsWithIndices.push({
      word: match[0],
      startIndex: match.index,
    });
  }

  if (wordsWithIndices.length === 0) {
    return [];
  }

  const fuse = new Fuse(wordsWithIndices, fuseOptions);
  const allMatches: Map<string, PaletteMatch> = new Map(); // Use Map to handle duplicates

  // 2. Search for affirmed words first.
  for (const affirmedWord of affirmedList) {
    const results = fuse.search(affirmedWord);
    if (results.length > 0) {
      for (const result of results) {
        if (result && result.item) {
          const { word, startIndex } = result.item;
          const key = `${startIndex}-${word}`;
          if (!allMatches.has(key)) {
            allMatches.set(key, {
              startIndex,
              endIndex: startIndex + word.length - 1,
              word,
              type: 'affirmed',
            });
          }
        }
      }
    }
  }

  // 3. Search for banned words. These will overwrite any affirmed matches on the same word.
  for (const bannedWord of bannedList) {
    const results = fuse.search(bannedWord);
    if (results.length > 0) {
      for (const result of results) {
        if (result && result.item) {
          const { word, startIndex } = result.item;
          const key = `${startIndex}-${word}`;
          // Prioritize 'banned': always set/overwrite.
          allMatches.set(key, {
            startIndex,
            endIndex: startIndex + word.length - 1,
            word,
            type: 'banned',
          });
        }
      }
    }
  }

  // 4. Convert map values to an array and sort by start index.
  return Array.from(allMatches.values()).sort((a, b) => a.startIndex - b.startIndex);
}
