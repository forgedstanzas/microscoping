import { useMemo } from 'react';
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

  const legaciesWithCounts = useMemo(() => {
    const tagCounts = new Map<string, number>();
    nodes.forEach(node => {
      node.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
          {legaciesWithCounts.length > 0 ? (
            <ul className={styles.legaciesList}>
              {legaciesWithCounts.map(legacy => (
                <li
                  key={legacy.name}
                  className={clsx(styles.legacyItem, { [styles.selected]: legacy.name === selectedLegacy })}
                  onClick={() => setSelectedLegacy(legacy.name === selectedLegacy ? null : legacy.name)}
                >
                  {legacy.name} ({legacy.count} {legacy.count === 1 ? 'node' : 'nodes'})
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
