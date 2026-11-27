/* eslint-disable import/no-nodejs-modules */
const { mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { parseArgs } = require('node:util');
/* eslint-enable import/no-nodejs-modules */
const { TestSuiteRunner } = require('rdf-test-suite');
const knownFailures = require('./xpath-known-failures');

// Results depend on the host time zone (e.g., op-subtract-dates-yielding-DTD-8), so fix it to that of CI
process.env.TZ = 'UTC';

const MANIFEST_URLS = [ 'manifest.ttl', 'extensions.ttl', 'errors.ttl' ]
  .map(manifest => `https://comunica.github.io/sparql-manifest-xpath-tests/${manifest}`);
const CACHE_PATH = join(__dirname, '../../../.rdf-test-suite-cache/');

// The test suite runner reports every failed request as not found, so keep track of what the server answered
const failedStatuses = {};
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async(input, init) => {
  const response = await fetchOriginal(input, init);
  if (!response.ok) {
    failedStatuses[response.status] = (failedStatuses[response.status] ?? 0) + 1;
  }
  return response;
};
process.on('exit', () => {
  for (const [ status, count ] of Object.entries(failedStatuses)) {
    process.stderr.write(`${count} requests for test files were answered with status ${status}\n`);
  }
});

/**
 * Run the XPath test suite on the engine given as argument, optionally filtered with --test-regex.
 * Known failures (see xpath-known-failures.js for why) are reported as skipped, and warned about once they pass.
 */
async function main() {
  const { values: { 'test-regex': testRegex }, positionals: [ enginePath ] } = parseArgs({
    allowPositionals: true,
    options: { 'test-regex': { type: 'string' }},
  });
  mkdirSync(CACHE_PATH, { recursive: true });
  const engine = require(resolve(enginePath));
  const runner = new TestSuiteRunner();
  const config = { cachePath: CACHE_PATH, testRegex: testRegex && new RegExp(testRegex, 'u'), timeOutDuration: 3000 };
  const results = [];
  for (const manifestUrl of MANIFEST_URLS) {
    results.push(...await runner.runManifest(manifestUrl, engine, config));
  }

  const knownFailureNames = new Set(knownFailures.flatMap(({ tests }) => tests));
  const passingKnownFailures = results.filter(({ ok, test }) => ok && knownFailureNames.has(test.name));
  for (const result of results) {
    if (!result.ok && knownFailureNames.has(result.test.name)) {
      result.skipped = true;
    }
  }
  runner.resultsToText(process.stdout, results, false);
  // GitHub Actions annotations show up on the run without failing it
  const warningPrefix = process.env.GITHUB_ACTIONS ? '::warning::' : 'Warning: ';
  for (const { test } of passingKnownFailures) {
    process.stdout.write(`${warningPrefix}${test.name} passes, so it can be removed from the known failures\n`);
  }
  if (results.some(({ ok, skipped }) => !ok && !skipped)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
