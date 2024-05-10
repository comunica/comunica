import { BindingsFactory } from '@comunica/bindings-factory';
import { getMockInternalEvaluator } from '@comunica/jest';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';
import * as E from '../../../lib/expressions';
import * as Err from '../../../lib/util/Errors';

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('recursive evaluators', () => {
  describe('AsyncRecursiveEvaluator', () => {
    const evaluator = getMockInternalEvaluator();

    it('is able to evaluate operator', async() => {
      await expect(evaluator.evaluatorExpressionEvaluation(new E.IntegerLiteral(1), BF.bindings())).resolves
        .toEqual(new E.IntegerLiteral(1));
    });

    it('is not able to evaluate aggregates by default', async() => {
      await expect(evaluator.evaluatorExpressionEvaluation(new E.Aggregate('count', {
        type: types.EXPRESSION,
        expressionType: expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: false,
        expression: {
          type: types.EXPRESSION,
          expressionType: expressionTypes.WILDCARD,
          wildcard: new Wildcard(),
        },
      }), BF.bindings())).rejects.toThrow(Err.NoAggregator);
    });
  });
});
