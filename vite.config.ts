import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Vite marks the entry script as an ES module, but a browser refuses to load
 * modules over the file:// protocol. The bundle is already a single classic
 * script (see `format` below), so the tag is rewritten to match.
 *
 * `defer` is essential: modules are deferred automatically, classic scripts
 * are not, and without it the game would start before the page exists.
 * `crossorigin` is dropped because a crossorigin stylesheet is refused over
 * file://.
 */
function classicScriptForFileProtocol(): Plugin {
  return {
    name: 'classic-script-for-file-protocol',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html
          .replace(
            /<script type="module" crossorigin src="([^"]+)"><\/script>/,
            '<script defer src="$1"></script>',
          )
          .replace(
            /<link rel="stylesheet" crossorigin(?:="")? href=/,
            '<link rel="stylesheet" href=',
          )
      },
    },
  }
}

export default defineConfig({
  // Relative asset paths, so the built game opens from the filesystem
  // without a server. See docs/adr/0002-static-web-no-backend.md
  base: './',
  plugins: [classicScriptForFileProtocol()],
  build: {
    outDir: 'dist',
    target: 'es2023',
    // One classic script with no dynamic imports is what lets the finished
    // game be opened by double-clicking it: nothing installed, nothing
    // running, no server.
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/game.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
