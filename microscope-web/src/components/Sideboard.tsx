import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TabManager } from './TabManager';
import { SideboardMeta } from './SideboardMeta';
import { SideboardPalette } from './SideboardPalette';
import { SideboardLegacies } from './SideboardLegacies';
import { SideboardSettings } from './SideboardSettings';
import styles from './Sideboard.module.css';
import { usePalette } from '../hooks/usePalette';
import { useViewSettings } from '../hooks/useViewSettings';

interface SideboardProps {
  layoutMode: 'zigzag' | 'linear';
  setLayoutMode: React.Dispatch<React.SetStateAction<'zigzag' | 'linear'>>;
  palette: ReturnType<typeof usePalette>;
  viewSettings: ReturnType<typeof useViewSettings>;
}

// Define the sections in their priority order (highest to lowest)
const SECTIONS_IN_PRIORITY = ['meta', 'palette', 'legacies'];

export function Sideboard({ layoutMode, setLayoutMode, palette, viewSettings }: SideboardProps) {
  const sideboardRef = useRef<HTMLDivElement>(null);
  const [sideboardHeight, setSideboardHeight] = useState(0);
  const [sectionHeights, setSectionHeights] = useState<Record<string, number> | null>(null);

  // --- Measurement Phase ---
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    meta: useRef<HTMLDivElement>(null),
    palette: useRef<HTMLDivElement>(null),
    legacies: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const sbObserver = new ResizeObserver(entries => {
      const { height } = entries[0].contentRect;
      setSideboardHeight(height);
    });

    const currentSbRef = sideboardRef.current;
    if (currentSbRef) {
      sbObserver.observe(currentSbRef);
    }

    return () => {
      if (currentSbRef) {
        sbObserver.unobserve(currentSbRef);
      }
    };
  }, []);

  // Effect to measure the initial height of all sections.
  useEffect(() => {
    // Only measure if we haven't already.
    if (!sectionHeights) {
      const measuredHeights: Record<string, number> = {};
      let allMeasured = true;
      for (const id of SECTIONS_IN_PRIORITY) {
        const ref = sectionRefs[id];
        if (ref.current) {
          // Add a small margin to account for spacing between elements
          measuredHeights[id] = ref.current.offsetHeight + 10; 
        } else {
          allMeasured = false;
          break;
        }
      }
      if (allMeasured) {
        setSectionHeights(measuredHeights);
      }
    }
  }, [sectionHeights, sectionRefs.meta, sectionRefs.palette, sectionRefs.legacies]);


  // --- Calculation & Render Phase ---
  const tabs = useMemo(() => {
    const availableHeight = sideboardHeight 
      - 50 // Approx height for tab headers
      - 50; // Approx height for settings tab button + padding

    const mainTabItems: string[] = [];
    const peeledOffItems: string[] = [];

    // Only perform calculation if we have all the measurements
    if (sectionHeights && sideboardHeight > 0) {
      let cumulativeHeight = 0;
      // Always keep the first, highest-priority item in the main tab
      mainTabItems.push(SECTIONS_IN_PRIORITY[0]);
      cumulativeHeight += sectionHeights[SECTIONS_IN_PRIORITY[0]] || 0;

      // Iterate through the rest of the items to see if they fit
      for (let i = 1; i < SECTIONS_IN_PRIORITY.length; i++) {
        const id = SECTIONS_IN_PRIORITY[i];
        cumulativeHeight += sectionHeights[id] || 0;
        if (cumulativeHeight < availableHeight) {
          mainTabItems.push(id);
        } else {
          peeledOffItems.push(id);
        }
      }
    } else {
      // Before measurements are ready, just put everything in the main tab
      mainTabItems.push(...SECTIONS_IN_PRIORITY);
    }

    const currentTabs: any[] = [];
    
    // --- Render Logic ---
    const mainContentComponents = mainTabItems.map(id => {
      switch (id) {
        case 'meta': return <SideboardMeta key="meta" />;
        case 'palette': return <SideboardPalette key="palette" palette={palette} />;
        case 'legacies': return <SideboardLegacies key="legacies" />;
        default: return null;
      }
    });

    if (mainTabItems.length > 0) {
      currentTabs.push({
        id: 'main',
        title: 'Main',
        content: <div>{mainContentComponents}</div>,
        defaultActive: true,
      });
    }

    peeledOffItems.forEach(id => {
       switch (id) {
        case 'palette': 
          currentTabs.push({ id: 'palette', title: 'Palette', content: <SideboardPalette palette={palette} /> });
          break;
        case 'legacies':
          currentTabs.push({ id: 'legacies', title: 'Legacies', content: <SideboardLegacies /> });
          break;
      }
    });
    
    currentTabs.push({ 
      id: 'settings', 
      title: 'Settings', 
      content: <SideboardSettings layoutMode={layoutMode} onLayoutChange={setLayoutMode} viewSettings={viewSettings} /> 
    });

    return currentTabs;
  }, [sideboardHeight, sectionHeights, layoutMode, setLayoutMode, palette, viewSettings]);

  // A hidden container used only for measuring the initial size of components
  const measurementBox = (
    <div className={styles.measurementBox}>
      <div ref={sectionRefs.meta}><SideboardMeta /></div>
      <div ref={sectionRefs.palette}><SideboardPalette palette={palette} /></div>
      <div ref={sectionRefs.legacies}><SideboardLegacies /></div>
    </div>
  );

  return (
    <div ref={sideboardRef} className={styles.sideboard}>
      {!sectionHeights && measurementBox}
      {sectionHeights && <TabManager tabs={tabs} />}
    </div>
  );
}
