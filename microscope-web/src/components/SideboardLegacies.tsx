import React, { useMemo } from 'react';
import { useNodes } from '../hooks/useNodes';
import styles from './SideboardLegacies.module.css';
import clsx from 'clsx';

interface SideboardLegaciesProps {
  selectedLegacy: string | null;
  onLegacySelect: (legacy: string | null) => void;
}

export function SideboardLegacies({ selectedLegacy, onLegacySelect }: SideboardLegaciesProps) {
  const nodes = useNodes();

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach(node => {
      node.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  return (
    <div>
      <h3>Legacies</h3>
      {allTags.length > 0 ? (
        <>
          <ul className={styles.legaciesList}>
            {allTags.map(tag => (
              <li
                key={tag}
                className={clsx(styles.legacyItem, { [styles.selected]: tag === selectedLegacy })}
                onClick={() => onLegacySelect(tag === selectedLegacy ? null : tag)}
              >
                {tag}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No legacies found. Add @tags to node descriptions to create them.</p>
      )}
    </div>
  );
}
