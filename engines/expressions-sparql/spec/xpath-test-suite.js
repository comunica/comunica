/* eslint-disable import/no-nodejs-modules */
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { parseArgs } = require('node:util');
/* eslint-enable import/no-nodejs-modules */
const { TestSuiteRunner } = require('rdf-test-suite');
const handler = require('./expression-engine');
const { loadManifest } = require('./qt3-manifest');
const knownFailures = require('./xpath-test-suite-known-failures');

/**
 * Runs the tests of the W3C XQuery and XPath Test Suite (QT3, https://github.com/w3c/qt3tests)
 * that can be expressed in SPARQL through the expression engine,
 * using the runner and the reporting of rdf-test-suite.
 *
 * Known failures (see xpath-test-suite-known-failures.js) are still run, but are reported as skipped,
 * and are reported when they pass, so that they can be removed from that list.
 *
 * Usage: node xpath-test-suite.js [-c cacheDirectory] [-t testIriRegex] [--skip testIriRegex]
 */

// The test sets for the functions and operators that SPARQL defines in terms of XPath.
const TEST_SETS = new RegExp(`^(${[
  String.raw`fn-(abs|ceiling|floor|round|string-length|substring|substring-before|substring-after)`,
  String.raw`fn-(upper-case|lower-case|starts-with|ends-with|contains|encode-for-uri|concat|matches|replace)`,
  String.raw`fn-((year|month|day)-from-(date|dateTime)|(hours|minutes|seconds)-from-(dateTime|time))`,
  String.raw`fn-(timezone-from-dateTime|not|true|false|boolean|string)`,
  String.raw`op-numeric-(add|subtract|multiply|divide|equal|less-than|greater-than|unary-minus|unary-plus)`,
  String.raw`op-(boolean|string|date|dateTime|time|duration|dayTimeDuration|yearMonthDuration)-.*`,
  String.raw`op-(add|subtract)-.*`,
  String.raw`prod-(CastExpr|ValueComp|GeneralComp\..*|OrExpr|IfExpr|Literal|ParenthesizedExpr)`,
  String.raw`xs-(double|float)`,
].join('|')})$`, 'u');

async function main() {
  const { values: args } = parseArgs({
    options: {
      c: { type: 'string' },
      t: { type: 'string' },
      skip: { type: 'string' },
    },
  });
  const config = {
    cachePath: args.c && join(process.cwd(), args.c, '/'),
    customEngingeOptions: {},
    testRegex: args.t ? new RegExp(args.t, 'u') : undefined,
    skipRegex: args.skip ? new RegExp(args.skip, 'u') : undefined,
    timeOutDuration: 3000,
  };
  if (config.cachePath) {
    mkdirSync(config.cachePath, { recursive: true });
  }
  const knownFailureReasons = new Map(knownFailures
    .flatMap(({ reason, tests }) => tests.map(test => [ test, reason ])));
  const manifest = await loadManifest(TEST_SETS, knownFailureReasons, { cachePath: config.cachePath });

  const runner = new TestSuiteRunner();
  const results = [];
  await runner.runManifestConcrete(manifest, handler, config, results);
  runner.resultsToText(process.stdout, results, false);
  for (const { ok, test } of results) {
    if (ok && test.knownFailure) {
      process.stdout.write(`\u2714 ${test.name} passes, so it can be removed from the known failures\n`);
    }
  }
  if (results.some(({ ok, skipped }) => !ok && !skipped)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
