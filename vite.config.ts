/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Scans assets/sprites/ at build/serve time and exposes all characters
 * as a virtual module so no files need to move out of the public directory.
 *
 * Usage: import characters from 'virtual:characters';
 * Returns: Array<{ id: string; name: string; spriteKey: string }>
 */
function charactersPlugin(): Plugin {
  const virtualModuleId = 'virtual:characters';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'vite-plugin-characters',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return;

      const spritesDir = path.resolve(import.meta.dirname, 'assets/sprites');
      const characters = fs.readdirSync(spritesDir, { withFileTypes: true })
        .filter((d: fs.Dirent) => d.isDirectory())
        .map((d: fs.Dirent) => {
          const metaPath = path.join(spritesDir, d.name, 'metadata.json');
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            return { id: d.name, name: (meta.character.name as string).toUpperCase(), spriteKey: d.name };
          } catch {
            return null;
          }
        })
        .filter((x): x is { id: string; name: string; spriteKey: string } => x !== null)
        .sort((a, b) => (a.id < b.id ? -1 : 1));

      return `export default ${JSON.stringify(characters)};`;
    },
  };
}

export default defineConfig({
  plugins: [charactersPlugin()],

  // Set to repo name for GitHub Pages — assets resolve correctly at:
  // https://<org>.github.io/buster_games/
  base: '/buster_games/',

  // Serve the root assets/ folder as static files.
  // Vite copies its contents to dist/ root, so Phaser load paths
  // must omit the 'assets/' prefix (e.g. 'backgrounds/foo.png').
  publicDir: 'assets',

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
