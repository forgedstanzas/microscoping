import { useEffect } from 'react';
import useTheme from './hooks/useTheme';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useYjs } from './hooks/useYjs';
import { NodeService } from './services/NodeService';
import { Canvas } from './components/Canvas'; // Import the Canvas component
import './App.css';

function App() {
  // Initialize the theme logic
  useTheme();

  // Initialize Y.js and get sync status
  const { ydoc, isSynced } = useYjs();

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
      <ThemeSwitcher />
      {/* The Canvas component will only render its content when nodes are available */}
      <Canvas />
    </>
  );
}

export default App;
