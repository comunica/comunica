import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMockInternalEvaluator } from '@comunica/utils-jest';
import { DataFactory } from 'rdf-data-factory';
import * as E from '../../../lib/expressions';
import * as Err from '../../../lib/util/Errors';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

describe('recursive evaluators', () => {
  describe('AsyncRecursiveEvaluator', () => {
    const evaluator = getMockInternalEvaluator();

    it('is able to evaluate operator', async() => {
      await expect(evaluator.evaluatorExpressionEvaluation(new E.IntegerLiteral(1), BF.bindings())).resolves
        .toEqual(new E.IntegerLiteral(1));
    });

    it('evaluates terms directly', () => {
      const term = new E.IntegerLiteral(1);
      expect(evaluator.evaluateDirectly(term, BF.bindings())).toBe(term);
    });

    it('evaluates bound variables directly', () => {
      const bindings = BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a') ]]);
      expect(evaluator.evaluateDirectly(new E.Variable('?a'), bindings)).toEqual(new E.NamedNode('ex:a'));
    });

    it('throws for unbound variables when evaluating directly', () => {
      expect(() => evaluator.evaluateDirectly(new E.Variable('?a'), BF.bindings())).toThrow(Err.UnboundVariableError);
    });

    it('does not evaluate other expressions directly', () => {
      expect(evaluator.evaluateDirectly(new E.Aggregate('count', AF.createAggregateExpression(
        'count',
        AF.createWildcardExpression(),
        false,
      )), BF.bindings())).toBeUndefined();
    });

    it('is not able to evaluate aggregates by default', async() => {
      await expect(evaluator.evaluatorExpressionEvaluation(new E.Aggregate('count', AF.createAggregateExpression(
        'count',
        AF.createWildcardExpression(),
        false,
      )), BF.bindings())).rejects.toThrow(Err.NoAggregator);
    });
  });
});
