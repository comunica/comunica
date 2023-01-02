module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testRegex: ['/test/.*-test.*.ts$'],
  // TODO: Remove this condition, once solid-client-authn supports node 18.
  testPathIgnorePatterns: process.versions.node.startsWith("18")
    ? ['.*QuerySparql-solid-test.ts']
    : [],
  moduleFileExtensions: [
    'ts',
    'js'
  ],
  globals: {
    'ts-jest': {
      // Enabling this can fix issues when using prereleases of typings packages
      //isolatedModules: true
    },
  },
  setupFilesAfterEnv: [ './setup-jest.js' ],
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/mocks/',
    'index.js',
    '/engines/query-sparql/test/util.ts',
    // TODO: Remove this condition, once solid-client-authn supports node 18.
    ...(process.versions.node.startsWith("18")
    ? ["/engines/query-sparql/lib/QueryEngineFactory.ts"]
    : []),
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
