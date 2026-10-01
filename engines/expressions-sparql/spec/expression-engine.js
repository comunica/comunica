const { KeysExpressionEvaluator } = require('@comunica/context-entries');
const { ActionContext } = require('@comunica/core');
const { AlgebraFactory } = require('@comunica/utils-algebra');
const { BindingsFactory } = require('@comunica/utils-bindings-factory');
const { isNonLexicalLiteral, isSubTypeOf, TermTransformer } = require('@comunica/utils-expression-evaluator');
const { DataFactory } = require('rdf-data-factory');
const { ExpressionEngine } = require('..');

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);
const XSD = 'http://www.w3.org/2001/XMLSchema#';

/**
 * The handler that the tests of the XPath test suite (see xpath-test-suite.js) are run with,
 * which evaluates SPARQL algebra expressions with the expression engine.
 */
class ExpressionEngineHandler {
  constructor() {
    this.engine = new ExpressionEngine();
    // The implicit timezone is implementation-defined, so it is fixed to make results reproducible.
    this.context = new ActionContext({
      [KeysExpressionEvaluator.defaultTimeZone.name]: { zoneHours: 0, zoneMinutes: 0 },
    });
    // Only built-in datatypes occur, so no other super types have to be discovered.
    this.superTypeProvider = { cache: new Map(), discoverer: () => 'term' };
    this.termTransformer = new TermTransformer(this.superTypeProvider);
  }

  /**
   * Evaluate an algebra expression to a term, or an error.
   * @param expression An algebra expression.
   * @param {Record<string, any> | undefined} bindings The values of the variables in the expression.
   * @returns {Promise<{ term?: any, error?: Error }>} The resulting term, or the error.
   */
  async evaluate(expression, bindings) {
    try {
      const evaluator = await this.engine.createEvaluator(expression, this.context);
      const term = await evaluator.evaluate(BF.fromRecord(bindings ?? {}));
      // A typed literal is returned as is, while constructing a value with an invalid lexical form is an error.
      if (term.termType === 'Literal' && isNonLexicalLiteral(this.termTransformer.transformLiteral(term))) {
        return { error: new Error(`Invalid lexical form ${term.value} for ${term.datatype.value}`) };
      }
      return { term };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Evaluate the effective boolean value of an algebra expression, where an error is false.
   * @param expression An algebra expression.
   * @param {Record<string, any> | undefined} bindings The values of the variables in the expression.
   * @returns {Promise<boolean>} The effective boolean value.
   */
  async evaluateEbv(expression, bindings) {
    try {
      const evaluator = await this.engine.createEvaluator(expression, this.context);
      return await evaluator.evaluateAsEBV(BF.fromRecord(bindings ?? {}));
    } catch {
      return false;
    }
  }

  /**
   * Determine whether two terms are equal by value, as the SPARQL = operator.
   * @returns {Promise<boolean>} Whether the terms are equal.
   */
  equal(left, right) {
    return this.evaluateEbv(AF.createOperatorExpression('=', [
      AF.createTermExpression(left),
      AF.createTermExpression(right),
    ]));
  }

  /**
   * Determine the string value of a term, as its cast to xsd:string.
   * @returns {Promise<{ term?: any, error?: Error }>} The string literal, or the error.
   */
  stringValue(term) {
    return this.evaluate(AF.createNamedExpression(DF.namedNode(`${XSD}string`), [ AF.createTermExpression(term) ]));
  }

  /**
   * Determine whether a datatype is the same as, or derived from, another datatype.
   * @returns {boolean} Whether datatype is derived from type.
   */
  isSubTypeOf(datatype, type) {
    return isSubTypeOf(datatype, type, this.superTypeProvider);
  }
}

module.exports = new ExpressionEngineHandler();
