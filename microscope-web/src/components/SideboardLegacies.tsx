import React, { useMemo } from 'react';
import { useNodes } from '../hooks/useNodes';
import styles from './SideboardLegacies.module.css';
import clsx from 'clsx';
import { useYjsContext } from '../context/YjsContext';
import { useUIState } from '../context/UIStateContext';

interface SideboardLegaciesProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isPeelOff: boolean;
}

export function SideboardLegacies({ isCollapsed, setIsCollapsed, isPeelOff }: SideboardLegaciesProps) {
  const { ydoc } = useYjsContext();
  const { selectedLegacy, setSelectedLegacy } = useUIState();
  const nodes = useNodes(ydoc);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach(node => {
      node.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  const isCollapsible = !isPeelOff;

  return (
    <div>
      <h3
        className={isCollapsible ? styles.collapsibleHeader : ''}
        onClick={isCollapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        Legacies {isCollapsible && (isCollapsed ? '▶' : '▼')}
      </h3>
      {(!isCollapsed || isPeelOff) && (
        <>
          {allTags.length > 0 ? (
            <ul className={styles.legaciesList}>
              {allTags.map(tag => (
                <li
                  key={tag}
                  className={clsx(styles.legacyItem, { [styles.selected]: tag === selectedLegacy })}
                  onClick={() => setSelectedLegacy(tag === selectedLegacy ? null : tag)}
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p>No legacies found. Add @tags to node descriptions to create them.</p>
          )}
        </>
      )}
    </div>
  );
}
