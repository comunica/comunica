import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import MagicString from 'magic-string';
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

/**
 * Loads the engines that componentsjs compiles into 'engine-default.js' through Vite instead of Node.
 *
 * These engines, and the engine classes wrapping them, obtain their actors through 'require',
 * which Vitest leaves to Node, unlike Jest, which loaded required modules through its own module system.
 * That would run the engine tests against the last build instead of the working tree,
 * with copies of the classes that are distinct from those imported by tests,
 * and without counting them towards coverage.
 * @returns A Vite plugin turning each 'require' of, and within, such an engine into an import.
 */
function importCompiledEngines(): Plugin {
  return {
    name: 'comunica:import-compiled-engines',
    enforce: 'pre',
    transform(code, id) {
      // Within an engine, 'require' obtains the exports of a package, and outside of it, the engine itself
      const [ requires, importClause ] = id.endsWith('/engine-default.js') ?
          [ /require\('([^']+)'\)/gu, (name: string) => `* as ${name}` ] :
          [ /require\('(\.\.\/engine-default\.js)'\)/gu, (name: string) => name ];
      const output = new MagicString(code);
      const names = new Map<string, string>();
      for (const match of code.matchAll(requires)) {
        if (!names.has(match[1])) {
          names.set(match[1], `__comunica_require_${names.size}`);
        }
        output.overwrite(match.index, match.index + match[0].length, names.get(match[1])!);
      }
      if (names.size === 0) {
        return null;
      }
      output.prepend([ ...names ].map(([ source, name ]) => `import ${importClause(name)} from '${source}';\n`).join(''));
      return { code: output.toString(), map: output.generateMap({ hires: true, source: id }) };
    },
  };
}

export default defineConfig({
  plugins: [ preferTypeScriptSources(), importCompiledEngines() ],
  resolve: {
    // Prefer TypeScript sources over their compiled siblings, mirroring the Jest 'moduleFileExtensions' order
    extensions: [ '.ts', '.js', '.mts', '.mjs', '.json' ],
    alias: [
      // 'asynciterator' ships separate CommonJS and ESM builds, and code checks its iterators with 'instanceof'.
      // Node loads the CommonJS build for everything outside of Vite, such as dependencies like 'rdf-stores' and the
      // actors that componentsjs instantiates from a config at runtime, so what Vite imports must use that build too.
      { find: /^asynciterator$/u, replacement: createRequire(import.meta.url).resolve('asynciterator') },
    ],
  },
  test: {
    environment: 'node',
    // Expose the test API globally, so that test files do not have to import it, like jest did
    globals: true,
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
