import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMockInternalEvaluator } from '@comunica/utils-expression-evaluator/test/util/helpers';
import { Algebra } from '@traqula/algebra-transformations-1-2';
import { DataFactory } from 'rdf-data-factory';
import * as E from '../../../lib/expressions';
import * as Err from '../../../lib/util/Errors';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('recursive evaluators', () => {
  describe('AsyncRecursiveEvaluator', () => {
    const evaluator = getMockInternalEvaluator();

    it('is able to evaluate operator', async() => {
      await expect(evaluator.evaluatorExpressionEvaluation(new E.IntegerLiteral(1), BF.bindings())).resolves
        .toEqual(new E.IntegerLiteral(1));
    });

    it('is not able to evaluate aggregates by default', async() => {
      await expect(evaluator.evaluatorExpressionEvaluation(new E.Aggregate('count', {
        type: Algebra.Types.EXPRESSION,
        expressionType: Algebra.ExpressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: false,
        expression: {
          type: Algebra.Types.EXPRESSION,
          expressionType: Algebra.ExpressionTypes.WILDCARD,
          wildcard: { type: 'wildcard' },
        },
      }), BF.bindings())).rejects.toThrow(Err.NoAggregator);
    });
  });
});
