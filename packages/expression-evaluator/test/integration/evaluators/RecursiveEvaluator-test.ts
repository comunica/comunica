import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';
import { AsyncRecursiveEvaluator } from '../../../lib/evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import { ExpressionType } from '../../../lib/expressions';
import * as E from '../../../lib/expressions';
import * as Err from '../../../lib/util/Errors';
import { getDefaultCompleteEEContext, getMockEEActionContext, getMockEEFactory } from '../../util/utils';

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('recursive evaluators', () => {
  const defaultTimeZone = { zoneMinutes: 0, zoneHours: 0 };

  describe('AsyncRecursiveEvaluator', () => {
    const evaluator = new AsyncRecursiveEvaluator(
      getDefaultCompleteEEContext(getMockEEActionContext()),
      getMockEEFactory().createEvaluator(translate('SELECT * WHERE { ?s ?p ?o FILTER (1 + 1)}').input.expression,
        getMockEEActionContext()),
    );

    it('is able to evaluate operator', async() => {
      expect(await evaluator.evaluate(new E.IntegerLiteral(1), BF.bindings())).toEqual(new E.IntegerLiteral(1));
    });

    it('is able to evaluate existence by default', async() => {
      expect(await evaluator.evaluate(new E.Existence({
        type: types.EXPRESSION,
        expressionType: expressionTypes.EXISTENCE,
        not: false,
        input: {
          type: types.VALUES,
          variables: [],
          bindings: [],
        },
      }), BF.bindings())).toEqual(new E.BooleanLiteral(false));
    });

    it('is able to evaluate existence if configured', async() => {
      const customEvaluator = getMockEEFactory().createEvaluator(
        translate('SELECT * WHERE { ?s ?p ?o FILTER (1 + 1)}').input.expression,
        getMockEEActionContext(),
        {
          exists: async() => true,
        },
      );
      const customAsyncRecursiveEvaluator = new AsyncRecursiveEvaluator(
        customEvaluator.context,
        customEvaluator,
      );

      expect(await customAsyncRecursiveEvaluator.evaluate(new E.Existence({
        type: types.EXPRESSION,
        expressionType: expressionTypes.EXISTENCE,
        not: false,
        input: {
          type: types.VALUES,
          variables: [],
          bindings: [],
        },
      }), BF.bindings())).toEqual(new E.BooleanLiteral(true));
    });

    it('is not able to evaluate aggregates by default', async() => {
      await expect(evaluator.evaluate(new E.Aggregate('count', {
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

    it('is able to evaluate aggregates if configured', async() => {
      const customEvaluator = getMockEEFactory().createEvaluator(
        translate('SELECT * WHERE { ?s ?p ?o FILTER (1 + 1)}').input.expression,
        getMockEEActionContext(),
        {
          aggregate: async() => DF.literal('42'),
        },
      );
      const customAsyncRecursiveEvaluator = new AsyncRecursiveEvaluator(
        customEvaluator.context,
        customEvaluator,
      );

      expect(await customAsyncRecursiveEvaluator.evaluate(new E.Aggregate('count', {
        type: types.EXPRESSION,
        expressionType: expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: false,
        expression: {
          type: types.EXPRESSION,
          expressionType: expressionTypes.WILDCARD,
          wildcard: new Wildcard(),
        },
      }), BF.bindings())).toEqual(new E.StringLiteral('42'));
    });

    it('is not able to evaluate async extensions', async() => {
      await expect(evaluator.evaluate({
        expressionType: ExpressionType.SyncExtension,
        name: DF.namedNode('http://example.com'),
        apply(_) { throw new Error('Error'); },
        args: [],
      }, BF.bindings())).rejects.toThrow(Err.InvalidExpressionType);
    });
  });
});
