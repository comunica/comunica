const { BindingsFactory } = require('@comunica/utils-bindings-factory');
const { isExpressionError } = require('@comunica/utils-expression-evaluator');
const { toAlgebra } = require('@traqula/algebra-sparql-1-2');
const { Parser } = require('@traqula/parser-sparql-1-2');
const { DataFactory } = require('rdf-data-factory');
const { QueryResultBoolean } = require('rdf-test-suite');
const { ExpressionEngine } = require('..');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const parser = new Parser();
const expressionEngine = new ExpressionEngine();

/**
 * Evaluate an expression as a query in Comunica would, where an expression error yields the fallback.
 * @param expression The algebra expression to evaluate.
 * @param evaluate Applies the evaluator of the expression.
 * @param fallback The value to return on an expression error.
 * @returns The evaluated value, or the fallback on an expression error.
 */
async function evaluateOrFallback(expression, evaluate, fallback) {
  try {
    return await evaluate(await expressionEngine.createEvaluator(expression));
  } catch (error) {
    if (!isExpressionError(error)) {
      throw error;
    }
    return fallback;
  }
}

/**
 * An rdf-test-suite engine that evaluates the ASK { BIND(<expression> AS ?result) FILTER(<assertion>) } queries
 * of the XPath test suite with the expression engine.
 */
module.exports = {
  async query(data, queryString) {
    const ask = toAlgebra(parser.parse(queryString), { quads: true, dataFactory: DF });
    const filter = ask.input;
    const extend = filter?.input;
    if (ask.type !== 'ask' || filter.type !== 'filter' || extend.type !== 'extend' ||
      extend.input.type !== 'bgp' || extend.input.patterns.length > 0) {
      throw new Error(`Only queries of the form ASK { BIND(... AS ?result) FILTER(...) } are supported:\n${queryString}`);
    }
    const result = await evaluateOrFallback(extend.expression, evaluator => evaluator.evaluate(BF.bindings()));
    const bindings = result ? BF.bindings([[ extend.variable, result ]]) : BF.bindings();
    return new QueryResultBoolean(
      await evaluateOrFallback(filter.expression, evaluator => evaluator.evaluateAsEBV(bindings), false),
    );
  },
};
