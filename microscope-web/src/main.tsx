import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { ModalProvider } from './context/ModalContext.tsx'
import { YjsProvider } from './context/YjsContext.tsx'
import { UIStateProvider } from './context/UIStateContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ModalProvider>
        <YjsProvider>
          <UIStateProvider>
            <App />
          </UIStateProvider>
        </YjsProvider>
      </ModalProvider>
    </ThemeProvider>
  </StrictMode>,
)
