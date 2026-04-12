import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  server: {
    port: 5174,
  },
})
