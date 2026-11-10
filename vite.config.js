import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { offlinePlugin } from './build/offline.js'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs let one build run at a domain root, a project subpath
  // (GitHub Pages) or any other directory without touching this file.
  base: './',
  plugins: [
    vue(),
    offlinePlugin([
      'convbin.svg',
      // Parser samples stay available offline; EDA samples are large and cached on use.
      'samples/akd-eeprom.bin',
      'samples/limx-tron2.bin',
      // Preset replay skeletons are small enough to precache.
      'robots/luna.urdf',
      'robots/oli.urdf',
      'robots/tron2a.urdf',
    ]),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
