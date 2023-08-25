module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      // Enabling this can fix issues when using prereleases of typings packages
      //isolatedModules: true
    }],
  },
  testRegex: ['/test/.*-test.*.ts$'],
  // TODO: Remove this once solid-client-authn supports node 18.
  testPathIgnorePatterns: ['.*QuerySparql-solid-test.ts'],
  moduleFileExtensions: [
    'ts',
    'js'
  ],
  setupFilesAfterEnv: ['./setup-jest.js'],
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/mocks/',
    'index.js',
    '/engines/query-sparql/test/util.ts',
    '/test/util/'
  ],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
