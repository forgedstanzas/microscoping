import { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Sideboard } from './components/Sideboard';
import { StatusIndicator } from './components/StatusIndicator';
import { usePalette } from './hooks/usePalette';
import { useViewSettings } from './hooks/useViewSettings';
import { YjsProvider, useYjsContext } from './context/YjsContext';
import { Lobby } from './components/Lobby';
import { UIStateProvider } from './context/UIStateContext';
import './App.css';

// Define the BeforeInstallPromptEvent for TypeScript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// This is the actual application content, which needs the Yjs context.
function MainApp({ deferredInstallPrompt }: { deferredInstallPrompt: BeforeInstallPromptEvent | null }) {
  const { ydoc } = useYjsContext();
  const paletteState = usePalette(ydoc);
  const viewSettings = useViewSettings(ydoc);

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
        deferredInstallPrompt={deferredInstallPrompt}
      />
    </>
  );
}


function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [initialSessionTitle, setInitialSessionTitle] = useState<string | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // This effect runs once to check the URL for a room ID.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
      setRoomId(urlRoomId);
    }
  }, []);

  // This effect keeps the URL in sync with the current room ID.
  useEffect(() => {
    if (roomId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== roomId) {
        url.searchParams.set('room', roomId);
        window.history.pushState({}, '', url.toString());
      }
    }
  }, [roomId]);

  // Effect to capture the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Effect to clear the deferred prompt after app is installed
  useEffect(() => {
    const handler = () => {
      setDeferredInstallPrompt(null);
      console.log('PWA was installed!');
    };

    window.addEventListener('appinstalled', handler);

    return () => {
      window.removeEventListener('appinstalled', handler);
    };
  }, []);

  // Effect to handle plain text copy from contentEditable elements
  useEffect(() => {
    const handlePlainTextCopy = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;

      // Check if the copy event originated from within a contentEditable element
      if (target.closest('[contenteditable="true"]')) {
        event.preventDefault();
        const selection = window.getSelection();
        if (selection && event.clipboardData) {
          event.clipboardData.setData('text/plain', selection.toString());
        }
      }
    };

    document.addEventListener('copy', handlePlainTextCopy);

    return () => {
      document.removeEventListener('copy', handlePlainTextCopy);
    };
  }, []);

  const handleJoinRoom = (id: string, title?: string) => {
    setInitialSessionTitle(title ?? null);
    setRoomId(id);
  };
  
  // A username state is needed for the lobby
const generateDefaultUsername = () => {
  const num = Math.floor(Math.random() * 1000); // 0-999
  return `Guest-${String(num).padStart(3, '0')}`;
};

  const [myUsername, setMyUsername] = useState(generateDefaultUsername());

  if (!roomId) {
    return <Lobby onJoinRoom={handleJoinRoom} myUsername={myUsername} setMyUsername={setMyUsername} />;
  }

  // If we have a roomId, we render the provider and the main app.
  return (
    <YjsProvider roomId={roomId} initialSessionTitle={initialSessionTitle}>
      <UIStateProvider>
        <MainApp 
          deferredInstallPrompt={deferredInstallPrompt} 
        />
      </UIStateProvider>
    </YjsProvider>
  );
}

export default App;