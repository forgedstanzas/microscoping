import { useState, useEffect } from 'react';
import { useYjs } from './hooks/useYjs';
import { NodeService } from './services/NodeService';
import { Canvas } from './components/Canvas';
import { Sideboard } from './components/Sideboard';
import { usePalette } from './hooks/usePalette';
import { useViewSettings } from './hooks/useViewSettings';
import { Modal } from './components/Modal'; // Import Modal
import './App.css';

function App() {
  // Initialize Y.js and get sync status
  const { ydoc, isSynced } = useYjs();
  // Call hooks for shared state once, here in the common ancestor
  const paletteState = usePalette();
  const viewSettings = useViewSettings();

  // State for layout mode, lifted to App
  const [layoutMode, setLayoutMode] = useState<'zigzag' | 'linear'>('zigzag');

  useEffect(() => {
    // Only run this logic once when the Y.js document is synced and ready
    if (isSynced && ydoc) {
      const nodesMap = ydoc.getMap('nodes');
      // If no nodes exist, initialize with Start and End periods
      if (nodesMap.size === 0) {
        console.log('Initializing Y.js document with Start and End Periods...');
        NodeService.addNode({
          type: 'period',
          title: 'Start Period',
          isBookend: true,
          order: 0,
        });
        NodeService.addNode({
          type: 'period',
          title: 'End Period',
          isBookend: true,
          order: 1,
        });
      }
    }
  }, [isSynced, ydoc]);

  return (
    <>
      <Canvas
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        affirmedWords={paletteState.affirmedWords}
        bannedWords={paletteState.bannedWords}
        layoutConstants={viewSettings.layoutConstants} // Pass layout constants
      />
      <Sideboard
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        palette={paletteState}
        viewSettings={viewSettings} // Pass all view settings and functions
      />
      <Modal />
    </>
  );
}

export default App;
