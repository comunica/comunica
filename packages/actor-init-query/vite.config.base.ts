import * as path from 'node:path';
import type { UserConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Creates a shared Vite configuration for building a browser bundle of a Comunica engine.
 *
 * This mirrors the shared webpack configuration ({@link ./webpack.config.js}),
 * but uses Vite as the bundler. It exposes the engine as a global `Comunica`
 * variable and includes polyfills for `process`, which is required by some dependencies.
 *
 * @param packagePath The absolute path to the engine package that is being bundled.
 */
export default function createConfig(packagePath: string): UserConfig {
  // Match all files inside the engine package (its compiled `lib/*.js` and the
  // generated `engine-default.js`/`engine-browser.js`), so they are transformed
  // from CommonJS as well.
  const packagePathRegex = new RegExp(escapeRegExp(packagePath), 'u');

  return {
    plugins: [
      tsconfigPaths(),
      nodePolyfills({
        globals: {
          process: true,
        },
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: {
        // Needed to resolve "TypeError: process.nextTick is not a function" in comunica dependency.
        'process/': 'process/browser',
      },
    },
    build: {
      // Keep the source next to the webpack bundle, without wiping other files.
      outDir: packagePath,
      emptyOutDir: false,
      sourcemap: true,
      // The Comunica packages and generated engine files are CommonJS. Vite only
      // transforms CommonJS inside node_modules by default, but in this monorepo the
      // workspace packages resolve (through symlinks) to the `packages/` directory,
      // and the engine itself (including the generated `engine-default.js` with all
      // its actor `require()`s) lives in the engine package directory.
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [ /node_modules/u, /packages\//u, packagePathRegex ],
      },
      lib: {
        // Bundle the compiled CommonJS entry so the entire actor graph (loaded via
        // dynamic `require()`s in `engine-default.js`) gets bundled statically.
        entry: path.resolve(packagePath, 'lib', 'index-browser.js'),
        name: 'Comunica',
        formats: [ 'iife' ],
        fileName: () => 'comunica-browser-vite.js',
      },
    },
  };
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
