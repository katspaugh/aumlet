import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        worklet: resolve(__dirname, 'src/worklet/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'worklet') {
            return 'assets/modular-processor.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@types': resolve(__dirname, './src/types'),
      '@worklet': resolve(__dirname, './src/worklet'),
    },
  },
});
