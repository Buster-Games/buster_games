/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Set to repo name for GitHub Pages — assets resolve correctly at:
  // https://<org>.github.io/buster_games/
  base: '/buster_games/',

  server: {
    host: true,  // exposes to local network so you can test on a real phone
    port: 3000,
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Split Phaser into its own chunk — big library, cache it separately
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },

  test: {
    // Pure Node environment — tests don't need a browser or Phaser running
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
