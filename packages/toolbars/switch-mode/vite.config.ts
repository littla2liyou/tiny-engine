import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'TinyEngineToolbarsSwitchMode',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['vue', '@opentiny/vue'],
      output: {
        globals: {
          vue: 'Vue',
          '@opentiny/vue': 'TinyVue'
        }
      }
    }
  }
})
