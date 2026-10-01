const { SaxesParser } = require('@rubensworks/saxes');
const { ErrorSkipped, ErrorTest, Util } = require('rdf-test-suite');
const { xpathToAlgebra, xpathToSparql, sparqlVariable, UnsupportedError, XSD } = require('./xpath-to-algebra');

/**
 * Loads the tests of the W3C XQuery and XPath Test Suite (QT3, https://github.com/w3c/qt3tests)
 * as an rdf-test-suite manifest, so that they can be run and reported by its TestSuiteRunner.
 *
 * SPARQL 1.2 uses XPath and XQuery Functions and Operators 3.1 with XSD 1.1,
 * so tests are selected for XPath 3.1 and XSD 1.1.
 * Tests that cannot be expressed in SPARQL, or that depend on unsupported features, are skipped.
 * Each test case is run with a handler (see expression-engine.js) that evaluates SPARQL algebra expressions.
 */

// A fixed commit of the test suite, so that results are reproducible.
const QT3_COMMIT = '201a6e466940cdfc727f4babfedcde5332b9f578';
const QT3_BASE = `https://raw.githubusercontent.com/w3c/qt3tests/${QT3_COMMIT}/`;
const QT3 = 'http://www.w3.org/2010/09/qt-fots-catalog';

/**
 * Fetch a file of the test suite.
 * @param {string} path The path within the test suite.
 * @param options The rdf-test-suite fetch options, such as the cache path.
 */
async function fetchFile(path, options) {
  const { body } = await Util.fetchCached(`${QT3_BASE}${path}`, options);
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Parse an XML document into a minimal element tree.
 * @param {string} xml
 */
function parseXml(xml) {
  const parser = new SaxesParser({ xmlns: true });
  const root = { children: []};
  const stack = [ root ];
  parser.on('opentag', (node) => {
    const element = {
      name: node.local,
      namespace: node.uri,
      attributes: Object.fromEntries(Object.values(node.attributes).map(attr => [ attr.local, attr.value ])),
      children: [],
      text: '',
    };
    stack.at(-1).children.push(element);
    stack.push(element);
  });
  parser.on('closetag', () => stack.pop());
  parser.on('text', (text) => {
    stack.at(-1).text += text;
  });
  parser.on('cdata', (text) => {
    stack.at(-1).text += text;
  });
  parser.write(xml).close();
  return root.children[0];
}

function children(element, name) {
  return element.children.filter(child => child.namespace === QT3 && child.name === name);
}

function namedEnvironments(element) {
  return Object.fromEntries(children(element, 'environment').map(environment => [ environment.attributes.name, environment ]));
}

/**
 * Determine whether a dependency is satisfied by an XPath 3.1 and XSD 1.1 implementation without extra features.
 * @returns {string | undefined} The reason why the dependency is not satisfied, if it is not.
 */
function unsatisfiedDependency(dependency) {
  const { type, value } = dependency.attributes;
  const expected = dependency.attributes.satisfied !== 'false';
  let satisfied;
  switch (type) {
    case 'spec':
      satisfied = value.split(/\s+/u).some((spec) => {
        const match = /^XP(\d\d)(\+?)$/u.exec(spec);
        return match && (match[1] === '31' || (match[2] === '+' && Number(match[1]) <= 31));
      });
      break;
    case 'xsd-version':
      satisfied = value === '1.1';
      break;
    default:
      // Optional features are not supported.
      satisfied = false;
  }
  return satisfied === expected ? undefined : `dependency ${type}=${value}`;
}

/**
 * Translate an XPath expression, where an expression without SPARQL equivalent skips the test.
 * @param {(xpath: string, variables: Record<string, any>) => any} translate The translation function.
 * @param {string} xpath The XPath expression.
 * @param {Record<string, any>} variables SPARQL expressions to substitute variable references with.
 * @param {string} reason The reason to skip the test with if the expression has no SPARQL equivalent.
 */
function translateOrSkip(translate, xpath, variables, reason) {
  try {
    return translate(xpath, variables);
  } catch (error) {
    if (error instanceof UnsupportedError) {
      throw new ErrorSkipped(`${reason}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Determine the SPARQL expressions of the variables of an environment.
 * @returns {Record<string, any>} The variables.
 */
function environmentVariables(environment) {
  const variables = {};
  for (const child of environment.children) {
    if (child.name !== 'param' || child.attributes.select === undefined) {
      throw new ErrorSkipped(`environment with ${child.name}`);
    }
    variables[child.attributes.name] =
      translateOrSkip(xpathToSparql, child.attributes.select, variables, 'environment parameter');
  }
  return variables;
}

function describeResult(result) {
  if (result.error) {
    return `error: ${result.error.message.split('\n')[0]}`;
  }
  const term = result.term;
  return term.termType === 'Literal' ? `"${term.value}"^^<${term.datatype.value}>` : `<${term.value}>`;
}

function describeAssertion(assertion) {
  const content = assertion.children.length > 0 ?
    assertion.children.map(child => describeAssertion(child)).join(', ') :
      (assertion.attributes.code ?? assertion.text.trim());
  return `${assertion.name}(${content})`;
}

/**
 * A test case of QT3, which evaluates an XPath expression and checks the result against an assertion.
 */
class TestCaseXPath {
  /**
   * @param testSet The test set element.
   * @param testCase The test case element.
   * @param {Record<string, any>} environments The environment elements that the test case can refer to.
   * @param {any[]} testSetDependencies The dependency elements of the test set.
   * @param {string | undefined} knownFailure The reason why this test is known to fail, if it is.
   */
  constructor(testSet, testCase, environments, testSetDependencies, knownFailure) {
    this.type = `${QT3}#test-case`;
    this.types = [ this.type ];
    this.uri = `${QT3_BASE}${testSet.attributes.file}#${testCase.attributes.name}`;
    this.name = testCase.attributes.name;
    this.comment = children(testCase, 'description')[0]?.text.trim() ?? '';
    this.approval = '';
    this.approvedBy = '';
    this.testCase = testCase;
    this.environments = environments;
    this.testSetDependencies = testSetDependencies;
    this.knownFailure = knownFailure;
  }

  async test(handler) {
    for (const dependency of [ ...this.testSetDependencies, ...children(this.testCase, 'dependency') ]) {
      const reason = unsatisfiedDependency(dependency);
      if (reason) {
        throw new ErrorSkipped(reason);
      }
    }

    let variables = {};
    for (const environment of children(this.testCase, 'environment')) {
      const named = environment.attributes.ref;
      if (named === 'empty') {
        continue;
      }
      const definition = named ? this.environments[named] : environment;
      if (!definition) {
        throw new ErrorSkipped(`environment ${named}`);
      }
      variables = environmentVariables(definition);
    }

    const test = children(this.testCase, 'test')[0];
    if (!test || test.attributes.file) {
      throw new ErrorSkipped('test in a separate file');
    }
    const expression = translateOrSkip(xpathToAlgebra, test.text, variables, 'expression not expressible in SPARQL');
    const result = await handler.evaluate(expression);
    const assertion = children(this.testCase, 'result')[0].children[0];
    const outcome = await this.check(handler, assertion, result, variables);
    if (outcome === 'unsupported') {
      throw new ErrorSkipped(`assertion ${assertion.name}`);
    }
    if (outcome === 'fail') {
      if (this.knownFailure) {
        throw new ErrorSkipped(`known failure: ${this.knownFailure}`);
      }
      throw new ErrorTest(`
    Test:     ${test.text.trim().replaceAll(/\s+/gu, ' ')}
    Expected: ${describeAssertion(assertion)}
    Actual:   ${describeResult(result)}`);
    }
  }

  /**
   * Check a result against an assertion of the test suite.
   * @returns {Promise<'pass' | 'fail' | 'unsupported'>} Whether the result satisfies the assertion.
   */
  async check(handler, assertion, result, variables) {
    const text = assertion.text.trim();
    switch (assertion.name) {
      case 'error':
        return result.error ? 'pass' : 'fail';
      case 'all-of':
      case 'any-of': {
        const outcomes = [];
        for (const child of assertion.children) {
          outcomes.push(await this.check(handler, child, result, variables));
        }
        if (assertion.name === 'all-of') {
          return outcomes.includes('fail') ? 'fail' : (outcomes.includes('unsupported') ? 'unsupported' : 'pass');
        }
        return outcomes.includes('pass') ? 'pass' : (outcomes.includes('unsupported') ? 'unsupported' : 'fail');
      }
      case 'not': {
        const outcome = await this.check(handler, assertion.children[0], result, variables);
        return outcome === 'unsupported' ? outcome : (outcome === 'pass' ? 'fail' : 'pass');
      }
    }
    if (result.error) {
      return 'fail';
    }
    const term = result.term;
    switch (assertion.name) {
      case 'assert-true':
      case 'assert-false':
        return term.termType === 'Literal' && term.datatype.value === `${XSD}boolean` &&
          [ 'true', '1' ].includes(term.value) === (assertion.name === 'assert-true') ?
          'pass' :
          'fail';
      case 'assert-eq':
      case 'assert-deep-eq': {
        let expected;
        try {
          expected = xpathToAlgebra(text, variables);
        } catch (error) {
          if (error instanceof UnsupportedError) {
            return 'unsupported';
          }
          throw error;
        }
        const expectedResult = await handler.evaluate(expected);
        if (expectedResult.error) {
          return 'unsupported';
        }
        // Deep equality considers NaN equal to itself
        if (assertion.name === 'assert-deep-eq' && term.value === 'NaN' && expectedResult.term.value === 'NaN') {
          return 'pass';
        }
        return await handler.equal(term, expectedResult.term) ? 'pass' : 'fail';
      }
      case 'assert-string-value': {
        let actual = term.value;
        if (term.termType === 'Literal' && term.datatype.value !== `${XSD}string` && !term.language) {
          const cast = await handler.stringValue(term);
          if (cast.error) {
            return 'fail';
          }
          actual = cast.term.value;
        }
        let expected = assertion.text;
        if (assertion.attributes['normalize-space'] === 'true') {
          actual = actual.replaceAll(/\s+/gu, ' ').trim();
          expected = expected.replaceAll(/\s+/gu, ' ').trim();
        }
        return actual === expected ? 'pass' : 'fail';
      }
      case 'assert-type': {
        const match = /^xs:(\w+)$/u.exec(text);
        if (!match || term.termType !== 'Literal') {
          return 'unsupported';
        }
        return match[1] === 'anyAtomicType' || handler.isSubTypeOf(term.datatype.value, `${XSD}${match[1]}`) ?
          'pass' :
          'fail';
      }
      case 'assert': {
        let expression;
        try {
          expression = xpathToAlgebra(text, { ...variables, result: sparqlVariable('result') });
        } catch (error) {
          if (error instanceof UnsupportedError) {
            return 'unsupported';
          }
          throw error;
        }
        return await handler.evaluateEbv(expression, { result: term }) ? 'pass' : 'fail';
      }
      default:
        return 'unsupported';
    }
  }
}

/**
 * Load the test sets of QT3 as a manifest, with a sub-manifest per test set.
 * @param {RegExp} testSets The names of the test sets to load.
 * @param {Map<string, string>} knownFailures The reasons why tests are known to fail, by test name.
 * @param options The rdf-test-suite fetch options, such as the cache path.
 * @returns {Promise<import('rdf-test-suite').IManifest>} The manifest.
 */
async function loadManifest(testSets, knownFailures, options) {
  const catalog = parseXml(await fetchFile('catalog.xml', options));
  const environments = namedEnvironments(catalog);
  const subManifests = [];
  for (const testSet of children(catalog, 'test-set')) {
    if (!testSets.test(testSet.attributes.name)) {
      continue;
    }
    const testSetXml = parseXml(await fetchFile(testSet.attributes.file, options));
    const testSetEnvironments = { ...environments, ...namedEnvironments(testSetXml) };
    const testSetDependencies = children(testSetXml, 'dependency');
    subManifests.push({
      uri: `${QT3_BASE}${testSet.attributes.file}`,
      label: testSet.attributes.name,
      testEntries: children(testSetXml, 'test-case').map(testCase => new TestCaseXPath(
        testSet,
        testCase,
        testSetEnvironments,
        testSetDependencies,
        knownFailures.get(testCase.attributes.name),
      )),
    });
  }
  return { uri: `${QT3_BASE}catalog.xml`, label: 'QT3', subManifests };
}

module.exports = { loadManifest, TestCaseXPath, QT3_BASE };
