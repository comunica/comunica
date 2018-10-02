module.exports = function(config) {
  config.set({
    mutator: "typescript",
    packageManager: "yarn",
    reporters: ["clear-text", "progress", "dashboard"],
    testRunner: "jest",
    transpilers: ["typescript"],
    coverageAnalysis: "off",
    tsconfigFile: "tsconfig-test-root.json",
    mutate: ["packages/*/lib/**/*.ts",]
  });
};
