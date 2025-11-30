import { Canvas } from './components/Canvas';
import { Sideboard } from './components/Sideboard';
import { StatusIndicator } from './components/StatusIndicator';
import { usePalette } from './hooks/usePalette';
import { useViewSettings } from './hooks/useViewSettings';
import { useYjsContext } from './context/YjsContext';
import './App.css';

function App() {
  // All Yjs logic is now in YjsProvider.
  // App now consumes the context to get what it needs.
  const { ydoc } = useYjsContext();

  // These hooks now get the ydoc from the context.
  // Note: These hooks will be called with a null ydoc on initial renders
  // before the provider is ready, so they need to be resilient.
  const paletteState = usePalette(ydoc);
  const viewSettings = useViewSettings(ydoc);

  // UI state is now in UIStateProvider.
  
  return (
    <>
      <StatusIndicator />
      <Canvas
        affirmedWords={paletteState.affirmedWords}
        bannedWords={paletteState.bannedWords}
        layoutConstants={viewSettings.layoutConstants}
      />
      <Sideboard
        palette={paletteState}
        viewSettings={viewSettings}
      />
    </>
  );
}

export default App;