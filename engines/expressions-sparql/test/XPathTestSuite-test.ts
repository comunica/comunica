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
import { SaxesParser } from '@rubensworks/saxes';
import type { Expression } from '@traqula/rules-sparql-1-1';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
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
const QT3 = 'http://www.w3.org/2010/09/qt-fots-catalog';

interface IElement {
  name: string;
  namespace: string;
  attributes: Record<string, string>;
  children: IElement[];
  text: string;
}

/**
 * Parse an XML file of the test suite into a minimal element tree.
 */
function parseXml(file: string): IElement {
  const parser = new SaxesParser({ xmlns: true });
  const root: IElement = { name: '', namespace: '', attributes: {}, children: [], text: '' };
  const stack = [ root ];
  parser.on('opentag', (node) => {
    const element: IElement = {
      name: node.local,
      namespace: node.uri,
      attributes: Object.fromEntries(Object.values(node.attributes).map(attr => [ attr.local, attr.value ])),
      children: [],
      text: '',
    };
    stack.at(-1)!.children.push(element);
    stack.push(element);
  });
  parser.on('closetag', () => stack.pop());
  parser.on('text', (text) => {
    stack.at(-1)!.text += text;
  });
  parser.on('cdata', (text) => {
    stack.at(-1)!.text += text;
  });
  parser.write(readFileSync(join(QT3_DIR, file), 'utf8')).close();
  return root.children[0];
}

function children(element: IElement, name: string): IElement[] {
  return element.children.filter(child => child.namespace === QT3 && child.name === name);
}

function namedEnvironments(element: IElement): Record<string, IElement> {
  return Object.fromEntries(children(element, 'environment')
    .map(environment => [ environment.attributes.name, environment ]));
}

/**
 * Determine whether a dependency is satisfied by an XPath 3.1 and XSD 1.1 implementation without extra features.
 */
function isSatisfied(dependency: IElement): boolean {
  const { type, value, satisfied } = dependency.attributes;
  let result = false;
  if (type === 'spec') {
    result = value.split(/\s+/u).some((spec) => {
      const match = /^XP(\d\d)(\+?)$/u.exec(spec);
      return match !== null && (match[1] === '31' || (match[2] === '+' && Number(match[1]) <= 31));
    });
  } else if (type === 'xsd-version') {
    result = value === '1.1';
  }
  // Optional features are not supported.
  return result === (satisfied !== 'false');
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
function isSupported(assertion: IElement, variables: Record<string, Expression>): boolean {
  switch (assertion.name) {
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
      return isExpressible(assertion.text, variables);
    case 'assert':
      return isExpressible(assertion.text, { ...variables, result: sparqlVariable('result') });
    case 'assert-type':
      return /^xs:\w+$/u.test(assertion.text.trim());
    default:
      return false;
  }
}

/**
 * Determine the SPARQL expressions of the variables of the environment of a test case,
 * or undefined if the environment is not supported.
 */
function environmentVariables(
  testCase: IElement,
  environments: Record<string, IElement>,
): Record<string, Expression> | undefined {
  const variables: Record<string, Expression> = {};
  for (const environment of children(testCase, 'environment')) {
    const definition = environment.attributes.ref ? environments[environment.attributes.ref] : environment;
    if (!definition) {
      return;
    }
    for (const param of definition.children) {
      if (param.name !== 'param' || !param.attributes.select || !isExpressible(param.attributes.select, variables)) {
        return;
      }
      variables[param.attributes.name] = xpathToSparql(param.attributes.select, variables);
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

function describeAssertion(assertion: IElement): string {
  const content = assertion.children.length > 0 ?
    assertion.children.map(child => describeAssertion(child)).join(', ') :
      (assertion.attributes.code ?? assertion.text.trim());
  return `${assertion.name}(${content})`;
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
  async function check(assertion: IElement, result: IResult, variables: Record<string, Expression>): Promise<boolean> {
    const text = assertion.text.trim();
    switch (assertion.name) {
      case 'error':
        return Boolean(result.error);
      case 'all-of':
      case 'any-of': {
        const outcomes: boolean[] = [];
        for (const child of assertion.children) {
          outcomes.push(await check(child, result, variables));
        }
        return assertion.name === 'all-of' ? outcomes.every(Boolean) : outcomes.some(Boolean);
      }
      case 'not':
        return !await check(assertion.children[0], result, variables);
    }
    const term = result.term;
    if (!term) {
      return false;
    }
    switch (assertion.name) {
      case 'assert-true':
      case 'assert-false':
        return term.termType === 'Literal' && term.datatype.value === `${XSD}boolean` &&
          [ 'true', '1' ].includes(term.value) === (assertion.name === 'assert-true');
      case 'assert-eq':
      case 'assert-deep-eq': {
        const expected = (await evaluate(xpathToAlgebra(text, variables))).term;
        // Deep equality considers NaN equal to itself
        if (assertion.name === 'assert-deep-eq' && term.value === 'NaN' && expected?.value === 'NaN') {
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
        if (assertion.attributes['normalize-space'] === 'true') {
          return actual?.replaceAll(/\s+/gu, ' ').trim() === assertion.text.replaceAll(/\s+/gu, ' ').trim();
        }
        return actual === assertion.text;
      }
      case 'assert-type':
        return term.termType === 'Literal' &&
          (text === 'xs:anyAtomicType' || isSubTypeOf(term.datatype.value, <KnownLiteralTypes> `${XSD}${text.slice(3)}`, superTypeProvider));
      default:
        return isTrue(xpathToAlgebra(text, { ...variables, result: sparqlVariable('result') }), { result: term });
    }
  }

  const catalog = parseXml('catalog.xml');
  const catalogEnvironments = namedEnvironments(catalog);
  for (const testSet of children(catalog, 'test-set')) {
    if (!existsSync(join(QT3_DIR, testSet.attributes.file))) {
      continue;
    }
    const testSetXml = parseXml(testSet.attributes.file);
    const environments = { ...catalogEnvironments, ...namedEnvironments(testSetXml) };
    const testSetDependencies = children(testSetXml, 'dependency');

    describe(testSet.attributes.name, () => {
      // Test cases are filtered, and known failures are registered as failing tests, which it.each cannot do
      // eslint-disable-next-line jest/prefer-each
      for (const testCase of children(testSetXml, 'test-case')) {
        const name = testCase.attributes.name;
        const test = children(testCase, 'test')[0];
        const assertion = children(testCase, 'result')[0].children[0];
        const variables = environmentVariables(testCase, environments);
        if (![ ...testSetDependencies, ...children(testCase, 'dependency') ].every(isSatisfied) ||
          !variables || test.attributes.file || !isExpressible(test.text, variables) ||
          !isSupported(assertion, variables)) {
          continue;
        }

        // Known failures are run as failing tests, so they are reported once they pass.
        const knownFailure = knownFailures.get(name);
        const run = async(): Promise<void> => {
          const result = await evaluate(xpathToAlgebra(test.text, variables));
          const failure = await check(assertion, result, variables) ?
            undefined :
              `${test.text.trim().replaceAll(/\s+/gu, ' ')}
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
