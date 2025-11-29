import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TabManager } from './TabManager';
import { MetadataTab } from './MetadataTab';
import { SideboardPalette } from './SideboardPalette';
import { SideboardLegacies } from './SideboardLegacies';
import { SideboardSettings } from './SideboardSettings';
import styles from './Sideboard.module.css';
import { usePalette } from '../hooks/usePalette';
import { useViewSettings } from '../hooks/useViewSettings';
import { useYjsContext } from '../context/YjsContext';
import { useUIState } from '../context/UIStateContext';

interface SideboardProps {
  palette: ReturnType<typeof usePalette>;
  viewSettings: ReturnType<typeof useViewSettings>;
}

// Define the sections in their priority order (highest to lowest)
const SECTIONS_IN_PRIORITY = ['meta', 'palette', 'legacies'];

export function Sideboard({ palette, viewSettings }: SideboardProps) {
  const { ydoc, yjsState } = useYjsContext();
  const { layoutMode, setLayoutMode, selectedLegacy, setSelectedLegacy } = useUIState();
  const sideboardRef = useRef<HTMLDivElement>(null);
  const [sideboardHeight, setSideboardHeight] = useState(0);
  const [sectionHeights, setSectionHeights] = useState<Record<string, number> | null>(null);
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isLegaciesCollapsed, setIsLegaciesCollapsed] = useState(false);


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
      // Handle meta tab separately since its height is dynamic
      const metaTabCurrentHeight = isMetadataCollapsed 
        ? 40 // Approx height of the header when collapsed
        : sectionHeights[SECTIONS_IN_PRIORITY[0]] || 0;
      
      mainTabItems.push(SECTIONS_IN_PRIORITY[0]); // 'meta'
      cumulativeHeight += metaTabCurrentHeight;

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
        case 'meta': return <MetadataTab key="meta" isMetadataCollapsed={isMetadataCollapsed} setIsMetadataCollapsed={setIsMetadataCollapsed} isPeelOff={false} />;
        case 'palette': return <SideboardPalette key="palette" palette={palette} isCollapsed={isPaletteCollapsed} setIsCollapsed={setIsPaletteCollapsed} isPeelOff={false} />;
        case 'legacies': return <SideboardLegacies key="legacies" selectedLegacy={selectedLegacy} onLegacySelect={setSelectedLegacy} isCollapsed={isLegaciesCollapsed} setIsCollapsed={setIsLegaciesCollapsed} isPeelOff={false} />;
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
          currentTabs.push({ id: 'palette', title: 'Palette', content: <SideboardPalette palette={palette} isCollapsed={isPaletteCollapsed} setIsCollapsed={setIsPaletteCollapsed} isPeelOff={true} /> });
          break;
        case 'legacies':
          currentTabs.push({ id: 'legacies', title: 'Legacies', content: <SideboardLegacies selectedLegacy={selectedLegacy} onLegacySelect={setSelectedLegacy} isCollapsed={isLegaciesCollapsed} setIsCollapsed={setIsLegaciesCollapsed} isPeelOff={true} /> });
          break;
      }
    });
    
    currentTabs.push({ 
      id: 'settings', 
      title: 'Settings', 
      content: <SideboardSettings layoutMode={layoutMode} onLayoutChange={setLayoutMode} viewSettings={viewSettings} /> 
    });

    return currentTabs;
  }, [sideboardHeight, sectionHeights, layoutMode, setLayoutMode, palette, viewSettings, selectedLegacy, setSelectedLegacy, isMetadataCollapsed, isPaletteCollapsed, isLegaciesCollapsed]);

  // A hidden container used only for measuring the initial size of components
  const measurementBox = (
    <div className={styles.measurementBox}>
      <div ref={sectionRefs.meta}><MetadataTab isMetadataCollapsed={false} setIsMetadataCollapsed={() => {}} isPeelOff={false} /></div>
      <div ref={sectionRefs.palette}><SideboardPalette palette={palette} /></div>
      <div ref={sectionRefs.legacies}><SideboardLegacies selectedLegacy={selectedLegacy} onLegacySelect={setSelectedLegacy} isCollapsed={false} setIsCollapsed={() => {}} isPeelOff={false} /></div>
    </div>
  );

  return (
    <div ref={sideboardRef} className={styles.sideboard}>
      {!sectionHeights && measurementBox}
      {sectionHeights && <TabManager tabs={tabs} />}
    </div>
  );
}
