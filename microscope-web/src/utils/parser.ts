/**
 * Extracts unique tags from a given string.
 * A tag is defined as a word starting with '@' and can contain letters, numbers, and hyphens.
 *
 * @param text The text to parse.
 * @returns A unique array of tags found in the text.
 */
export const extractTags = (text: string): string[] => {
  const regex = /@([\w-]+)/g;
  const matches = text.match(regex);

  if (!matches) {
    return [];
  }

  // Return unique tags
  return [...new Set(matches)];
};
