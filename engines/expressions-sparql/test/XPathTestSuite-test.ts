import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { ISuperTypeProvider } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { KnownLiteralTypes } from '@comunica/utils-expression-evaluator';
import { isNonLexicalLiteral, isSubTypeOf, TermTransformer } from '@comunica/utils-expression-evaluator';
import type * as RDF from '@rdfjs/types';
import type { Expression } from '@traqula/rules-sparql-1-1';
import { evaluateXPathToFirstNode, evaluateXPathToNodes, evaluateXPathToString } from 'fontoxpath';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import type { Document, Element } from 'slimdom';
import { parseXmlDocument } from 'slimdom';
import { ExpressionEngine } from '../lib/ExpressionEngine';
import { KNOWN_FAILURES } from './xpath/knownFailures';
import { sparqlVariable, UnsupportedError, xpathToAlgebra, xpathToSparql, XSD } from './xpath/xpathToAlgebra';

/**
 * Runs the tests of the W3C XQuery and XPath Test Suite (QT3, https://github.com/w3c/qt3tests)
 * for the functions and operators that SPARQL defines in terms of XPath, which are in xpath/qt3 (see fetchQt3.ts).
 *
 * SPARQL 1.2 uses XPath and XQuery Functions and Operators 3.1 with XSD 1.1,
 * so tests are selected for XPath 3.1 and XSD 1.1.
 * Tests that cannot be expressed in SPARQL, or that depend on unsupported features, are left out.
 * Known failures (see xpath/knownFailures.ts) are run as failing tests.
 */

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);
const QT3_DIR = join(__dirname, 'xpath', 'qt3');

/**
 * The test cases that an XPath 3.1 and XSD 1.1 implementation without optional features can run,
 * and that have their test in the test set itself.
 */
const TEST_CASES_QUERY = `
/test-set/test-case[
  (every $dependency in (../dependency, dependency) satisfies
    (if ($dependency/@type = 'spec') then
      (some $spec in tokenize($dependency/@value) satisfies
        ($spec = 'XP31' or (matches($spec, '^XP\\d\\d\\+$') and xs:integer(substring($spec, 3, 2)) le 31)))
    else if ($dependency/@type = 'xsd-version') then $dependency/@value = '1.1'
    else false()) = not($dependency/@satisfied = 'false'))
  and not(test/@file)]`;

/**
 * Parse an XML file of the test suite.
 */
function parseXml(file: string): Document {
  return parseXmlDocument(readFileSync(join(QT3_DIR, file), 'utf8'));
}

/**
 * Determine whether an XPath expression can be expressed in SPARQL.
 */
function isExpressible(xpath: string, variables: Record<string, Expression>): boolean {
  try {
    xpathToSparql(xpath, variables);
    return true;
  } catch (error: unknown) {
    if (error instanceof UnsupportedError) {
      return false;
    }
    throw error;
  }
}

/**
 * Determine whether an assertion of the test suite can be checked.
 */
function isSupported(assertion: Element, variables: Record<string, Expression>): boolean {
  switch (assertion.localName) {
    case 'error':
    case 'assert-true':
    case 'assert-false':
    case 'assert-string-value':
      return true;
    case 'all-of':
    case 'any-of':
    case 'not':
      return assertion.children.every(child => isSupported(child, variables));
    case 'assert-eq':
    case 'assert-deep-eq':
      return isExpressible(assertion.textContent!, variables);
    case 'assert':
      return isExpressible(assertion.textContent!, { ...variables, result: sparqlVariable('result') });
    case 'assert-type':
      return /^xs:\w+$/u.test(assertion.textContent!.trim());
    default:
      return false;
  }
}

/**
 * Determine the SPARQL expressions of the variables of the environment of a test case,
 * or undefined if the environment is not supported.
 */
function environmentVariables(testCase: Element, catalog: Document): Record<string, Expression> | undefined {
  const variables: Record<string, Expression> = {};
  for (const environment of evaluateXPathToNodes<Element>('environment', testCase)) {
    const ref = environment.getAttribute('ref');
    const definition = ref ?
      evaluateXPathToFirstNode<Element>('/test-set/environment[@name = $ref]', testCase, null, { ref }) ??
      evaluateXPathToFirstNode<Element>('/catalog/environment[@name = $ref]', catalog, null, { ref }) :
      environment;
    if (!definition) {
      return;
    }
    for (const param of definition.children) {
      const select = param.getAttribute('select');
      if (param.localName !== 'param' || !select || !isExpressible(select, variables)) {
        return;
      }
      variables[param.getAttribute('name')!] = xpathToSparql(select, variables);
    }
  }
  return variables;
}

interface IResult {
  term?: RDF.Term;
  error?: Error;
}

function describeResult({ term, error }: IResult): string {
  if (error) {
    return `error: ${error.message.split('\n')[0]}`;
  }
  return term!.termType === 'Literal' ? `"${term!.value}"^^<${term!.datatype.value}>` : `<${term!.value}>`;
}

function describeAssertion(assertion: Element): string {
  const content = assertion.children.length > 0 ?
    assertion.children.map(child => describeAssertion(child)).join(', ') :
      (assertion.getAttribute('code') ?? assertion.textContent!.trim());
  return `${assertion.localName}(${content})`;
}

describe('the XPath test suite', () => {
  const engine = new ExpressionEngine();
  // The implicit timezone is implementation-defined, so it is fixed to make results reproducible.
  const context = new ActionContext({
    [KeysExpressionEvaluator.defaultTimeZone.name]: { zoneHours: 0, zoneMinutes: 0 },
  });
  // Only built-in datatypes occur, so no other super types have to be discovered.
  const superTypeProvider: ISuperTypeProvider = { cache: new LRUCache({ max: 1_000 }), discoverer: () => 'term' };
  const termTransformer = new TermTransformer(superTypeProvider);
  const knownFailures = new Map(KNOWN_FAILURES.flatMap(({ reason, tests }) => tests.map(test => [ test, reason ])));

  async function evaluate(expression: Algebra.Expression, bindings: Record<string, RDF.Term> = {}): Promise<IResult> {
    try {
      const evaluator = await engine.createEvaluator(expression, context);
      const term = await evaluator.evaluate(BF.fromRecord(bindings));
      // A typed literal is returned as is, while constructing a value with an invalid lexical form is an error.
      if (term.termType === 'Literal' && isNonLexicalLiteral(termTransformer.transformLiteral(term))) {
        return { error: new Error(`Invalid lexical form ${term.value} for ${term.datatype.value}`) };
      }
      return { term };
    } catch (error: unknown) {
      return { error: <Error> error };
    }
  }

  async function isTrue(expression: Algebra.Expression, bindings: Record<string, RDF.Term> = {}): Promise<boolean> {
    try {
      const evaluator = await engine.createEvaluator(expression, context);
      return await evaluator.evaluateAsEBV(BF.fromRecord(bindings));
    } catch {
      return false;
    }
  }

  /**
   * Check a result against an assertion of the test suite.
   */
  async function check(assertion: Element, result: IResult, variables: Record<string, Expression>): Promise<boolean> {
    const text = assertion.textContent!.trim();
    switch (assertion.localName) {
      case 'error':
        return Boolean(result.error);
      case 'all-of':
      case 'any-of': {
        const outcomes: boolean[] = [];
        for (const child of assertion.children) {
          outcomes.push(await check(child, result, variables));
        }
        return assertion.localName === 'all-of' ? outcomes.every(Boolean) : outcomes.some(Boolean);
      }
      case 'not':
        return !await check(assertion.children[0], result, variables);
    }
    const term = result.term;
    if (!term) {
      return false;
    }
    switch (assertion.localName) {
      case 'assert-true':
      case 'assert-false':
        return term.termType === 'Literal' && term.datatype.value === `${XSD}boolean` &&
          [ 'true', '1' ].includes(term.value) === (assertion.localName === 'assert-true');
      case 'assert-eq':
      case 'assert-deep-eq': {
        const expected = (await evaluate(xpathToAlgebra(text, variables))).term;
        // Deep equality considers NaN equal to itself
        if (assertion.localName === 'assert-deep-eq' && term.value === 'NaN' && expected?.value === 'NaN') {
          return true;
        }
        return expected !== undefined && isTrue(AF.createOperatorExpression('=', [
          AF.createTermExpression(term),
          AF.createTermExpression(expected),
        ]));
      }
      case 'assert-string-value': {
        let actual: string | undefined = term.value;
        if (term.termType === 'Literal' && term.datatype.value !== `${XSD}string` && !term.language) {
          actual = (await evaluate(AF.createNamedExpression(DF.namedNode(`${XSD}string`), [
            AF.createTermExpression(term),
          ]))).term?.value;
        }
        if (assertion.getAttribute('normalize-space') === 'true') {
          return actual?.replaceAll(/\s+/gu, ' ').trim() === assertion.textContent!.replaceAll(/\s+/gu, ' ').trim();
        }
        return actual === assertion.textContent;
      }
      case 'assert-type':
        return term.termType === 'Literal' &&
          (text === 'xs:anyAtomicType' || isSubTypeOf(term.datatype.value, <KnownLiteralTypes> `${XSD}${text.slice(3)}`, superTypeProvider));
      default:
        return isTrue(xpathToAlgebra(text, { ...variables, result: sparqlVariable('result') }), { result: term });
    }
  }

  const catalog = parseXml('catalog.xml');
  for (const testSet of evaluateXPathToNodes<Element>('/catalog/test-set', catalog)) {
    const file = testSet.getAttribute('file')!;
    if (!existsSync(join(QT3_DIR, file))) {
      continue;
    }
    const testSetXml = parseXml(file);

    describe(testSet.getAttribute('name')!, () => {
      // Test cases are filtered, and known failures are registered as failing tests, which it.each cannot do
      // eslint-disable-next-line jest/prefer-each
      for (const testCase of evaluateXPathToNodes<Element>(TEST_CASES_QUERY, testSetXml)) {
        const name = testCase.getAttribute('name')!;
        const test = evaluateXPathToString('test', testCase);
        const assertion = evaluateXPathToFirstNode<Element>('result/*', testCase)!;
        const variables = environmentVariables(testCase, catalog);
        if (!variables || !isExpressible(test, variables) || !isSupported(assertion, variables)) {
          continue;
        }

        // Known failures are run as failing tests, so they are reported once they pass.
        const knownFailure = knownFailures.get(name);
        const run = async(): Promise<void> => {
          const result = await evaluate(xpathToAlgebra(test, variables));
          const failure = await check(assertion, result, variables) ?
            undefined :
              `${test.trim().replaceAll(/\s+/gu, ' ')}
  expected ${describeAssertion(assertion)}
  but got ${describeResult(result)}`;
          expect(failure).toBeUndefined();
        };
        if (knownFailure) {
          it.failing(`${name} (known failure: ${knownFailure})`, run);
        } else {
          it(name, run);
        }
      }
    });
  }
});
