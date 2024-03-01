const config = require('@rubensworks/eslint-config');

module.exports = config([
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
        'web-streams-ponyfill',
        'is-stream',
        'readable-stream-node-to-web',
        'stream-to-string',
      ]}],
      'ts/no-var-requires': [ 'error', { allow: [
        'process/',
        'web-streams-ponyfill',
        'is-stream',
        'readable-stream-node-to-web',
        'stream-to-string',
      ]}],
    },
  },
  {
    // Specific rules for NodeJS-specific files
    files: [
      '**/test/**/*.ts',
      'packages/actor-dereference-file/**/*.ts',
      'packages/actor-http-native/**/*.ts',
      'packages/logger-bunyan/**/*.ts',
      'packages/packager/**/*.ts',
    ],
    rules: {
      'import/no-nodejs-modules': 'off',
      'unused-imports/no-unused-vars': 'off',
      'ts/no-require-imports': 'off',
      'ts/no-var-requires': 'off',
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
    // Some test files import 'jest-rdf' which triggers this
    // The http actors import 'cross-fetch/polyfill' which also triggers this
    // Some jest tests import '../../lib' which triggers this
    files: [
      '**/test/*-test.ts',
      '**/test/*-util.ts',
      'packages/jest/test/matchers/*-test.ts',
      'packages/actor-http-*/lib/*.ts',
    ],
    rules: {
      'import/no-unassigned-import': 'off',
    },
  },
  {
    // Files that do not require linting
    ignores: [
      'setup-jest.js',
      '**/engine-default.js',
      '**/engine-browser.js',
      '**/comunica-browser.js',
      '.github/**',
      // TODO: Remove this once solid-client-authn supports node 18.
      '**/QuerySparql-solid-test.ts',
    ],
  },
  {
    files: [ '**/*.js' ],
    rules: {
      'ts/no-require-imports': 'off',
      'ts/no-var-requires': 'off',
      'import/no-nodejs-modules': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/extensions': 'off',
    },
  },
]);
