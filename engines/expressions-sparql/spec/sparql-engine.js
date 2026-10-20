const { ActionContext } = require('@comunica/core');
const { BindingsFactory } = require('@comunica/utils-bindings-factory');
const { isExpressionError } = require('@comunica/utils-expression-evaluator');
const { toAlgebra } = require('@traqula/algebra-sparql-1-2');
const { Parser } = require('@traqula/parser-sparql-1-2');
const { DataFactory } = require('rdf-data-factory');
const RdfTestSuite = require('rdf-test-suite');
const { ExpressionEngine } = require('..');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const parser = new Parser();
const engine = new ExpressionEngine();
const context = new ActionContext();

/**
 * Evaluate an expression to a term, or undefined if it results in an expression error, as a BIND in Comunica.
 * Other errors are not caught, as they abort a query.
 */
async function evaluate(expression, bindings) {
  try {
    return await (await engine.createEvaluator(expression, context)).evaluate(bindings);
  } catch (error) {
    if (!isExpressionError(error)) {
      throw error;
    }
  }
}

/**
 * Evaluate the effective boolean value of an expression, which is false if it results in an expression error,
 * as a FILTER in Comunica. Other errors are not caught, as they abort a query.
 */
async function evaluateAsEbv(expression, bindings) {
  try {
    return await (await engine.createEvaluator(expression, context)).evaluateAsEBV(bindings);
  } catch (error) {
    if (!isExpressionError(error)) {
      throw error;
    }
    return false;
  }
}

/**
 * A query engine for rdf-test-suite that evaluates the queries of the XPath test suite
 * (https://sparql-manifest-xpath-tests.jitsedesmet.be/) with the expression engine.
 * These queries have the form ASK { BIND(<expression> AS ?result) FILTER(<assertion>) },
 * so the expression is evaluated first, and the assertion is evaluated with its result.
 */
module.exports = {
  parse(queryString) {
    toAlgebra(parser.parse(queryString), { quads: true, dataFactory: DF });
  },
  async query(data, queryString) {
    const ask = toAlgebra(parser.parse(queryString), { quads: true, dataFactory: DF });
    const filter = ask.input;
    const extend = filter?.input;
    if (ask.type !== 'ask' || filter.type !== 'filter' || extend?.type !== 'extend' || extend.input.type !== 'bgp' ||
      extend.input.patterns.length > 0) {
      throw new Error(`Only queries of the form ASK { BIND(... AS ?result) FILTER(...) } are supported:\n${queryString}`);
    }
    const result = await evaluate(extend.expression, BF.bindings());
    const bindings = result ? BF.bindings([[ extend.variable, result ]]) : BF.bindings();
    return new RdfTestSuite.QueryResultBoolean(await evaluateAsEbv(filter.expression, bindings));
  },
};
