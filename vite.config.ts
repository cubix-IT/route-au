import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Mirror Vercel's clean-URL behaviour for static HTML files
    rewrites: [
      { from: '/privacy', to: '/privacy.html' },
    ],
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.join(process.cwd(), 'src') + '/' },
    ],
  },
})
