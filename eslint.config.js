const config = require('@rubensworks/eslint-config');
const requireAsyncIteratorAutostartFalse = require('./packages/utils-monorepo/lib/eslint/require-async-iterator-autostart-false');

/**
 * Packages must only be imported through their package root, as deep imports
 * break whenever a package re-organizes its internal file structure.
 * Note that this only covers 'import', as 'no-restricted-imports' does not check 'require'.
 * @param allowed - Subpaths that have no equivalent on their package root, and are therefore allowed.
 *                  Following gitignore semantics, every entry also allows anything nested below it.
 * @returns An ESLint configuration for the 'no-restricted-imports' rule.
 */
function noDeepImports(...allowed) {
  const message = 'Import from the package root instead of its internal files.';
  const exceptions = scoped => allowed
    .filter(entry => entry.startsWith('@') === scoped)
    .map(entry => `!${entry}`);
  return [ 'error', {
    patterns: [
      // Unscoped packages, ignoring relative imports.
      // Scoped ones are excluded here, and handled by the group below.
      { group: [ '*/*', '!./**', '!../**', '!@*/**', ...exceptions(false) ], message },
      // Scoped packages
      { group: [ '@*/*/*', ...exceptions(true) ], message },
    ],
  }];
}

// Subpaths that have no equivalent on their package root
const allowedDeepImports = [
  // 'undici' does not re-export its cache interceptor types
  'undici/types',
  // 'cross-fetch' exposes its polyfill as a separate entry point
  'cross-fetch/polyfill',
  // The engines share their Vite build configuration via this entry point
  '@comunica/actor-init-query/vite.config.base',
];

module.exports = config([
  {
    plugins: {
      'comunica-rules': {
        rules: {
          'require-async-iterator-autostart-false': requireAsyncIteratorAutostartFalse,
        },
      },
    },
    rules: {
      'comunica-rules/require-async-iterator-autostart-false': 'error',
    },
  },
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    rules: {
      'no-restricted-imports': noDeepImports(...allowedDeepImports),

      // Default
      'unicorn/consistent-destructuring': 'off',
      'unicorn/no-array-callback-reference': 'off',

      // TODO: check if these can be enabled
      'ts/naming-convention': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',

      'ts/no-require-imports': [ 'error', { allow: [
        'process/',
        'is-stream',
        'readable-stream-node-to-web',
      ]}],
      'ts/no-var-requires': [ 'error', { allow: [
        'process/',
        'is-stream',
        'readable-stream-node-to-web',
      ]}],
    },
  },
  {
    // Specific rules for NodeJS-specific files
    files: [
      '**/test/**/*.ts',
      '**/__mocks__/*.js',
      'packages/actor-dereference-file/**/*.ts',
      'packages/actor-http-native/**/*.ts',
      'packages/logger-bunyan/**/*.ts',
      'packages/packager/**/*.ts',
    ],
    rules: {
      'import/no-nodejs-modules': 'off',
      'ts/no-require-imports': 'off',
      'ts/no-var-requires': 'off',
    },
  },
  {
    files: [
      // Browser versions of files cannot follow the camelCase naming scheme
      '**/*-browser.ts',
      // The funding YAML file needs the specific uppercase name
      '.github/FUNDING.yml',
    ],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
  {
    // Only the packager makes use of dynamic require
    files: [
      'packages/packager/bin/package.ts',
    ],
    rules: {
      'import/no-dynamic-require': 'off',
    },
  },
  {
    // The config packages use an empty index.ts
    files: [
      'engines/config-*/lib/index.ts',
    ],
    rules: {
      'import/unambiguous': 'off',
    },
  },
  {
    // Some packages make use of 'export default'
    files: [
      'packages/actor-http-*/lib/*.ts',
      'packages/jest/**/*.ts',
    ],
    rules: {
      'import/no-anonymous-default-export': 'off',
      'import/no-default-export': 'off',
    },
  },
  {
    // Test utilities are shared across packages, and are not exposed on the package root
    files: [
      '**/test/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': noDeepImports(...allowedDeepImports, '@comunica/*/test'),
    },
  },
  {
    // Some test files import 'jest-rdf' which triggers this
    // Some jest tests import '../../lib' which triggers this
    files: [
      '**/test/*-test.ts',
      '**/test/*-util.ts',
      'packages/jest/test/matchers/*-test.ts',
    ],
    rules: {
      'import/no-unassigned-import': 'off',
    },
  },
  {
    // Spec test engines
    files: [
      '**/spec/*.js',
    ],
    rules: {
      'import/extensions': 'off',
      'ts/no-var-requires': 'off',
      'ts/no-require-imports': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    // Webpack configurations
    files: [
      '**/webpack.config.js',
    ],
    rules: {
      'ts/no-var-requires': 'off',
      'ts/no-require-imports': 'off',
      'import/extensions': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    // Vite configurations
    files: [
      '**/vite.config.ts',
      '**/vite.config.base.ts',
    ],
    rules: {
      'import/extensions': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-nodejs-modules': 'off',
      'import/no-default-export': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
  {
    files: [
      'eslint.config.js',
    ],
    rules: {
      'ts/no-var-requires': 'off',
      'ts/no-require-imports': 'off',
    },
  },
  {
    ignores: [
      // The engine bundles are auto-generated code
      'engines/*/engine-default.js',
      'engines/*/engine-browser.js',
      'engines/*/comunica-browser.js',
      'engines/*/comunica-browser-vite.js',
      // The performance combination files are auto-generated
      'performance/*/combinations/**',
      // The agentic workflow lock files are compiled from their .md sources by 'gh aw compile'
      '.github/workflows/*.lock.yml',
      // TODO: Remove this once solid-client-authn supports node 18.
      'engines/query-sparql/test/QuerySparql-solid-test.ts',
      // Dev-only files that are not checked in
      '**/bintest/**',
      '**/componentsjs-error-state.json',
      'lerna.json',
    ],
  },
]);
