export default {
  transform: {
    '^.+\\.ts$': [ 'ts-jest', {
      // Enabling this can fix issues when using prereleases of typings packages
      // isolatedModules: true
    }],
  },
  resolver: 'ts-jest-resolver',
  testRegex: [ '/test/.*-test.*.ts$' ],
  testPathIgnorePatterns: [
    '.*.d.ts',
    // TODO: Remove this once solid-client-authn supports node 18.
    '.*QuerySparql-solid-test.ts',
    'engines/',
    'packages/actor-http-native',
    'packages/actor-init-query',
  ],
  moduleFileExtensions: [
    'ts',
    'cjs',
    'js',
  ],
  setupFilesAfterEnv: [ './setup-jest.js' ],
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/mocks/',
    'index.js',
    '/engines/query-sparql/test/util.ts',
    '/test/util/',
    'engine-default.cjs',
    '.cjs',
  ],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 98,
      functions: 97,
      lines: 98,
      statements: 98,
    },
  },
};
