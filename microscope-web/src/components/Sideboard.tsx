import React, { useState, useEffect, useRef } from 'react';
import { TabManager } from './TabManager';
import { SideboardMeta } from './SideboardMeta';
import { SideboardPalette } from './SideboardPalette';
import { SideboardLegacies } from './SideboardLegacies';
import { SideboardSettings } from './SideboardSettings';
import styles from './Sideboard.module.css';
import { usePalette } from '../hooks/usePalette'; // For type definition
import { useLayoutConstants } from '../hooks/useLayoutConstants'; // For type definition

// Approximate heights for content sections (used in peel-off logic)
const APPROX_HEIGHTS = {
  meta: 200,
  palette: 300,
  legacies: 300,
  settings: 200, // Even though settings is always pinned, good to have its height
};

interface SideboardProps {
  layoutMode: 'zigzag' | 'linear';
  setLayoutMode: React.Dispatch<React.SetStateAction<'zigzag' | 'linear'>>;
  palette: ReturnType<typeof usePalette>;
  updateLayoutConstants: ReturnType<typeof useLayoutConstants>['updateLayoutConstants']; // New prop
}

export function Sideboard({ layoutMode, setLayoutMode, palette, updateLayoutConstants }: SideboardProps) {
  const sideboardRef = useRef<HTMLDivElement>(null);
  const [sideboardHeight, setSideboardHeight] = useState(0);
  const [tabs, setTabs] = useState<any[]>([]); // Array of tabs for TabManager

  // Observe the height of the sideboard container
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const { height } = entries[0].contentRect;
      setSideboardHeight(height);
    });

    if (sideboardRef.current) {
      observer.observe(sideboardRef.current);
    }

    return () => {
      if (sideboardRef.current) {
        observer.unobserve(sideboardRef.current);
      }
    };
  }, []);

  // Implement the "Peel-Off" logic based on available height
  useEffect(() => {
    const currentTabs: any[] = [];
    let mainTabContent: string[] = [];

    // Prioritize Meta, then Palette, then Legacies
    if (sideboardHeight > (APPROX_HEIGHTS.meta + APPROX_HEIGHTS.palette + APPROX_HEIGHTS.legacies)) {
      // All fit in main tab
      mainTabContent = ['meta', 'palette', 'legacies'];
    } else if (sideboardHeight > (APPROX_HEIGHTS.meta + APPROX_HEIGHTS.palette)) {
      // Meta and Palette fit, Legacies peel off
      mainTabContent = ['meta', 'palette'];
      currentTabs.push({ id: 'legacies', title: 'Legacies', content: <SideboardLegacies /> });
    } else {
      // Only Meta fits, Palette and Legacies peel off
      mainTabContent = ['meta'];
      currentTabs.push({ id: 'palette', title: 'Palette', content: <SideboardPalette palette={palette} /> });
      currentTabs.push({ id: 'legacies', title: 'Legacies', content: <SideboardLegacies /> });
    }

    // Add main tab if it has content
    if (mainTabContent.length > 0) {
      // Map content strings to actual components
      const mainContentComponents = mainTabContent.map(item => {
        switch (item) {
          case 'meta': return <SideboardMeta key="meta" />;
          case 'palette': return <SideboardPalette key="palette" palette={palette} />;
          case 'legacies': return <SideboardLegacies key="legacies" />;
          default: return null;
        }
      });
      currentTabs.unshift({ id: 'main', title: 'Main', content: <div>{mainContentComponents}</div>, defaultActive: true });
    }

    // Always append Settings tab at the end
    currentTabs.push({ 
      id: 'settings', 
      title: 'Settings', 
      content: <SideboardSettings layoutMode={layoutMode} onLayoutChange={setLayoutMode} updateLayoutConstants={updateLayoutConstants} /> 
    });
    
    setTabs(currentTabs);
  }, [sideboardHeight, layoutMode, setLayoutMode, palette, updateLayoutConstants]); // Add updateLayoutConstants to dependencies

  return (
    <div ref={sideboardRef} className={styles.sideboard}>
      <TabManager tabs={tabs} />
    </div>
  );
}
