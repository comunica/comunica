/* eslint-disable import/no-nodejs-modules */
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { parseArgs } = require('node:util');
/* eslint-enable import/no-nodejs-modules */
const { ErrorTest, TestSuiteRunner } = require('rdf-test-suite');
const knownFailures = require('./xpath-known-failures');

/**
 * Runs the XPath test suite (https://sparql-manifest-xpath-tests.jitsedesmet.be/) with rdf-test-suite.
 * Known failures (see xpath-known-failures.js) are reported as skipped when they fail,
 * and fail the run when they pass, so that they are removed from that list.
 *
 * Usage: node xpath-spec.js path/to/sparql-engine.js manifest-url... [-c cacheDirectory] [-m urlToFileMapping] [-t testRegex]
 */
async function main() {
  const { values: args, positionals: [ enginePath, ...manifests ] } = parseArgs({
    allowPositionals: true,
    options: { c: { type: 'string' }, m: { type: 'string' }, t: { type: 'string' }},
  });
  const runner = new TestSuiteRunner();
  const config = {
    cachePath: args.c && join(process.cwd(), args.c, '/'),
    customEngingeOptions: {},
    exitWithStatusCode0: false,
    outputFormat: 'detailed',
    testRegex: args.t ? new RegExp(args.t, 'u') : undefined,
    timeOutDuration: 3000,
    urlToFileMapping: args.m,
  };
  if (config.cachePath) {
    mkdirSync(config.cachePath, { recursive: true });
  }
  const engine = require(join(process.cwd(), enginePath));
  const results = [];
  for (const manifest of manifests) {
    results.push(...await runner.runManifest(manifest, engine, config));
  }

  const reasons = new Map(knownFailures.flatMap(({ reason, tests }) => tests.map(test => [ test, reason ])));
  for (const result of results) {
    const reason = reasons.get(result.test.name);
    if (reason && result.ok) {
      Object.assign(result, {
        ok: false,
        error: new ErrorTest(`${result.test.name} passes, so it can be removed from the known failures`),
      });
    } else if (reason && !result.skipped) {
      Object.assign(result, { skipped: true, error: new Error(`Known failure: ${reason}`) });
    }
  }
  runner.resultsToText(process.stdout, results, false);
  if (results.some(({ ok, skipped }) => !ok && !skipped)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
