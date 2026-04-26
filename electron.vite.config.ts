import { join } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@': join(__dirname, 'src') }
    },
    build: {
      lib: {
        entry: join(__dirname, 'electron/main/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: join(__dirname, 'electron/preload/index.ts')
      }
    }
  },
  renderer: {
    root: join(__dirname, 'src/renderer'),
    publicDir: join(__dirname, 'src/renderer/public'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': join(__dirname, 'src') }
    }
  }
})
