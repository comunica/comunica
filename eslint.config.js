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
    // Karma config and Lerna custom script because they have identical rules
    files: [
      'lerna-custom-script.js',
    ],
    rules: {
      'ts/no-var-requires': 'off',
      'ts/no-require-imports': 'off',
      'import/no-nodejs-modules': 'off',
    },
  },
  {
    // Karma setup script
    files: [
      'karma.setup.ts',
    ],
    rules: {
      'import/no-extraneous-dependencies': 'off',
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
      // The performance combination files are auto-generated
      'performance/*/combinations/**',
      // TODO: Remove this once solid-client-authn supports node 18.
      'engines/query-sparql/test/QuerySparql-solid-test.ts',
      // Dev-only files that are not checked in
      '**/bintest/**',
      '**/componentsjs-error-state.json',
      'lerna.json',
    ],
  },
]);
