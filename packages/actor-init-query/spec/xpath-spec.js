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

// GitHub Pages answers with status 429 once a client sent too many requests, and keeps doing so for a while
const RATE_LIMIT_PAUSES = [ 15, 30, 60, 120, 120, 120, 120 ];
const fetchOriginal = globalThis.fetch;
const failedStatuses = {};
const pending = new Map();
let pausedUntil = 0;

/**
 * Fetch a URL, and when the server limits the rate of requests, pause all requests before trying again.
 * @param url The URL to fetch.
 * @returns The response and its body, which still has status 429 if the server keeps limiting after all pauses.
 */
async function fetchPatiently(url) {
  for (const pause of [ ...RATE_LIMIT_PAUSES, 0 ]) {
    while (Date.now() < pausedUntil) {
      await new Promise(resolvePause => setTimeout(resolvePause, pausedUntil - Date.now()));
    }
    const response = await fetchOriginal(url);
    const body = await response.arrayBuffer();
    if (response.status !== 429 || pause === 0) {
      return { response, body };
    }
    if (Date.now() >= pausedUntil) {
      const seconds = Number(response.headers.get('retry-after')) || pause;
      process.stderr.write(`Too many requests for test files (retry-after: ${
        response.headers.get('retry-after')}), pausing for ${seconds} seconds\n`);
      pausedUntil = Date.now() + seconds * 1000;
    }
  }
}

// The test suite runner requests a file again for every test that uses it as long as it is not cached, retries
// right away when the rate of requests is limited, and reports every failed request as not found
globalThis.fetch = async(input) => {
  const url = String(input);
  if (!pending.has(url)) {
    pending.set(url, fetchPatiently(url));
  }
  const { response, body } = await pending.get(url);
  if (!response.ok) {
    pending.delete(url);
    failedStatuses[response.status] = (failedStatuses[response.status] ?? 0) + 1;
  }
  return new Response(body.byteLength > 0 ? body : null, response);
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
