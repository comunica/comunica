export default {
  transform: {
    '^.+\\.ts$': 'babel-jest',
  },
  testRegex: [ '/test/.*-test.*.ts$' ],
  testPathIgnorePatterns: [
    '.*.d.ts',
    // TODO: Remove this once solid-client-authn supports node 18.
    '.*QuerySparql-solid-test.ts',
    'engines/',
    'packages/actor-http-native',
    'packages/actor-init-query'
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
    'engine-default.js',
  ],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
