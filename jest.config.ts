import type { Config } from '@jest/types';

const moduleFileExtensions: string[] = [ 'ts', 'js' ];

const transform: Record<string, Config.TransformerConfig> = {
  '\\.ts$': [ 'ts-jest', {
    // Enabling this can fix issues when using prereleases of typings packages
    // isolatedModules: true
  }],
};

const config: Config.InitialOptions = {
  collectCoverage: true,
  coverageProvider: 'babel',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  projects: [
    {
      // This combined test runs both the package unit tests and the engine system tests,
      // and produces the original 100% coverage across the entire monorepo,
      // because the package tests rely on the engine tests to reach their coverage target
      displayName: 'combined',
      moduleFileExtensions,
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/engines/*/test/**/*-test.ts',
        '<rootDir>/packages/*/test/**/*-test.ts',
      ],
      testPathIgnorePatterns: [
        // TODO: Remove this once solid-client-authn supports node 18.
        'QuerySparql-solid-test.ts',
      ],
      transform,
      coveragePathIgnorePatterns: [
        '<rootDir>/engines/query-sparql/test/util.ts',
        '<rootDir>/packages/expression-evaluator/test/util/',
        'engine-default.js',
        'index.js',
        'node_modules',
      ],
    },
    {
      // This will only run the system tests for engines
      displayName: 'engines',
      moduleFileExtensions,
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/engines/*/test/**/*-test.ts',
      ],
      testPathIgnorePatterns: [
        // TODO: Remove this once solid-client-authn supports node 18.
        'QuerySparql-solid-test.ts',
      ],
      transform,
      coveragePathIgnorePatterns: [
        '<rootDir>/engines/query-sparql/test/util.ts',
        '<rootDir>/packages/',
        'engine-default.js',
        'node_modules',
      ],
    },
    {
      // This will only run the unit tests for packages
      displayName: 'packages',
      moduleFileExtensions,
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/*/test/**/*-test.ts',
      ],
      transform,
      coveragePathIgnorePatterns: [
        '<rootDir>/engines/',
        'node_modules',
      ],
    },
  ],
  // The default test timeout is not enough for engine tests, but is enough for packages
  testTimeout: 20_000,
};

export default config;
