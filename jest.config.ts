import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/test/',
    '/node_modules/',
    'engine-default.js',
    'index.js',
  ],
  coverageProvider: 'babel',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/engines/*/test/**/*-test.ts',
    '<rootDir>/packages/*/test/**/*-test.ts',
  ],
  testPathIgnorePatterns: [
    // TODO: Remove this once solid-client-authn supports node 18.
    'QuerySparql-solid-test.ts',
  ],
  transform: {
    '\\.ts$': [ 'ts-jest', {
      // Enabling this can fix issues when using prereleases of typings packages
      // isolatedModules: true
    }],
  },
  // The default test timeout is not enough for engine tests, but is enough for packages
  testTimeout: 20_000,
};

export default config;
