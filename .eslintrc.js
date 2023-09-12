module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.eslint.json'],
  },
  extends: [
    '@rubensworks',
  ],

  // TODO: Remove this once solid-client-authn supports node 18.
  ignorePatterns: ['*QuerySparql-solid-test.ts'],

  rules: {
    // Default
    'unicorn/consistent-destructuring': 'off',
    'unicorn/no-array-callback-reference': 'off',

    // TODO: Try to re-enable the following rules in the future
    'unicorn/prefer-at': 'off',
    'unicorn/prefer-string-replace-all': 'off',
    'import/no-commonjs': 'off',
    'import/group-exports': 'off',
    'import/exports-last': 'off',
    'import/extensions': 'off',
  },
  overrides: [
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
  ],
};
