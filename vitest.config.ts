import { existsSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Resolves compiled JavaScript in this monorepo back to the TypeScript it was built from.
 *
 * Packages refer to each other through their 'main' field, and tests refer to their own package as
 * '..', both of which point at 'lib/index.js'. Without this, tests would run against the last build
 * instead of the working tree, and a class imported through both routes would end up with two
 * distinct identities, breaking 'instanceof'. Jest resolved this through its 'moduleFileExtensions'
 * order, which put 'ts' ahead of 'js'.
 * @returns A Vite plugin redirecting built files to their sources.
 */
function preferTypeScriptSources(): Plugin {
  return {
    name: 'comunica:prefer-typescript-sources',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && !resolved.external && resolved.id.endsWith('.js') && !resolved.id.includes('node_modules')) {
        const source = `${resolved.id.slice(0, -'.js'.length)}.ts`;
        if (existsSync(source)) {
          return { ...resolved, id: source };
        }
      }
      return resolved;
    },
  };
}

export default defineConfig({
  plugins: [ preferTypeScriptSources() ],
  resolve: {
    // Prefer TypeScript sources over their compiled siblings, mirroring the Jest 'moduleFileExtensions' order
    extensions: [ '.ts', '.js', '.mts', '.mjs', '.json' ],
  },
  test: {
    environment: 'node',
    include: [
      'engines/*/test/**/*-test.ts',
      'packages/*/test/**/*-test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      // TODO: Remove this once solid-client-authn supports node 18.
      '**/QuerySparql-solid-test.ts',
    ],
    // The default test timeout is not enough for engine tests, but is enough for packages.
    // Jest applied a single timeout to tests and hooks alike, so both are set here.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      enabled: true,
      // The V8 provider derives the implicit else-path of an `if` without an `else` by subtracting the
      // count of the consequent from that of the `if` itself, which goes negative for an `if` inside a
      // loop and is then reported as uncovered. That left 79 covered paths across 52 files counted as
      // misses, so branch coverage is measured through istanbul instead.
      // See https://github.com/AriPerkkio/ast-v8-to-istanbul/issues/148.
      provider: 'istanbul',
      // Matches the Jest defaults; CI submits 'coverage/lcov.info' to Coveralls
      reporter: [ 'clover', 'json', 'lcov', 'text' ],
      exclude: [
        '**/node_modules/**',
        '**/test/**',
        '**/spec/**',
        '**/benchmarks/**',
        '**/__mocks__/**',
        '**/*.config.{js,ts}',
        '**/engine-default.js',
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
