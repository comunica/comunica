import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';
import { InternalEvaluator } from '../../../lib/evaluators/InternalEvaluator';
import * as E from '../../../lib/expressions';
import * as Err from '../../../lib/util/Errors';
import { getMockEvaluatorContext } from '../../util/utils';

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('recursive evaluators', () => {
  describe('AsyncRecursiveEvaluator', () => {
    const evaluator = new InternalEvaluator(getMockEvaluatorContext());

    it('is able to evaluate operator', async() => {
      expect(await evaluator.internalEvaluation(new E.IntegerLiteral(1), BF.bindings()))
        .toEqual(new E.IntegerLiteral(1));
    });

    it('is not able to evaluate aggregates by default', async() => {
      await expect(evaluator.internalEvaluation(new E.Aggregate('count', {
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
