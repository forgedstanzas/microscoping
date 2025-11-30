import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'serve') {
    // Dev server config
    return {
      plugins: [react()],
      base: '/',
    }
  } else {
    // Build config
    return {
      plugins: [react()],
      base: '/microscoping/',
    }
  }
})
