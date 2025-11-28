import React, { useMemo, useRef, useEffect } from 'react';
import styles from './HighlightableText.module.css';
import { findPaletteMatches, type PaletteMatch } from '../logic/PaletteEnforcer'; // Updated import

interface HighlightableTextProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  bannedWords: string[]; // New prop
  affirmedWords: string[]; // New prop
  placeholder?: string;
}

/**
 * Renders text with specific words highlighted underneath based on palette matches.
 * @param text The full text string.
 * @param matches The array of palette matches with start/end indices and type.
 * @returns An array of React nodes (strings and styled spans).
 */
function renderPaletteHighlights(text: string, matches: PaletteMatch[]): React.ReactNode[] {
  if (matches.length === 0) {
    return [text];
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    // Add the text before the match
    if (match.startIndex > lastIndex) {
      nodes.push(text.substring(lastIndex, match.startIndex));
    }
    // Add the highlighted match with the appropriate style
    const highlightClass = match.type === 'banned' ? styles.highlightBanned : styles.highlightAffirmed;
    nodes.push(
      <span key={i} className={highlightClass}>
        {text.substring(match.startIndex, match.endIndex + 1)}
      </span>
    );
    lastIndex = match.endIndex + 1;
  });

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

export function HighlightableText({ value, onChange, onBlur, bannedWords, affirmedWords, placeholder }: HighlightableTextProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const highlightedContent = useMemo(() => {
    // Use the new findPaletteMatches function with the passed lists
    const matches = findPaletteMatches(value, bannedWords, affirmedWords);
    return renderPaletteHighlights(value, matches);
  }, [value, bannedWords, affirmedWords]); // Dependencies include new props

  // Synchronize the contentEditable div with the value prop,
  // but only if the user is not currently editing it.
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current && value !== editorRef.current.innerText) {
      editorRef.current.innerText = value;
    }
  }, [value]);

  return (
    <div className={styles.container}>
      <div className={styles.highlighter} aria-hidden="true">
        {highlightedContent}
      </div>
      <div
        ref={editorRef}
        className={styles.textarea}
        contentEditable
        onBlur={(e) => onBlur(e.currentTarget.innerText)}
        onInput={(e) => onChange(e.currentTarget.innerText)}
        // Suppress React's warning about managing contentEditable content
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
    </div>
  );
}
