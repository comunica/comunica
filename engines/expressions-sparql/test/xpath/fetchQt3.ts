/**
 * Fetches the files of the W3C XQuery and XPath Test Suite (QT3, https://github.com/w3c/qt3tests)
 * that XPathTestSuite-test.ts runs into the qt3 folder: the catalog and the test sets
 * for the functions and operators that SPARQL defines in terms of XPath.
 *
 * Usage: node test/xpath/fetchQt3.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// A fixed commit of the test suite, so that results are reproducible.
const QT3_COMMIT = '201a6e466940cdfc727f4babfedcde5332b9f578';
const QT3_BASE = `https://raw.githubusercontent.com/w3c/qt3tests/${QT3_COMMIT}/`;

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

async function fetchFile(path: string): Promise<string> {
  const response = await fetch(`${QT3_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Could not fetch ${path}: ${response.status}`);
  }
  const body = await response.text();
  const file = join(import.meta.dirname, 'qt3', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return body;
}

const catalog = await fetchFile('catalog.xml');
for (const [ , name, file ] of catalog.matchAll(/<test-set\s+name="([^"]+)"\s+file="([^"]+)"/gu)) {
  if (TEST_SETS.test(name)) {
    await fetchFile(file);
  }
}
