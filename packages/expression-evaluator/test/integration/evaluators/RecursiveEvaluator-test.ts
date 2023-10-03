import { BindingsFactory } from '@comunica/bindings-factory';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import { expressionTypes, types } from 'sparqlalgebrajs/lib/algebra';
import { Wildcard } from 'sparqljs';
import { AsyncRecursiveEvaluator } from '../../../lib/evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import { ExpressionType } from '../../../lib/expressions';
import * as E from '../../../lib/expressions';
import * as Err from '../../../lib/util/Errors';
import { getMockEEActionContext, getMockEEFactory } from '../../util/utils';

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('recursive evaluators', () => {
  const defaultTimeZone = { zoneMinutes: 0, zoneHours: 0 };

  describe('AsyncRecursiveEvaluator', () => {
    const evaluator = new AsyncRecursiveEvaluator({
      now: new Date(),
      functionArgumentsCache: {},
      superTypeProvider: {
        cache: new LRUCache({ max: 1_000 }),
        discoverer: _ => 'term',
      },
      defaultTimeZone,
      actionContext: getMockEEActionContext(),
    }, getMockEEFactory().createEvaluator(translate('SELECT * WHERE { ?s ?p ?o FILTER (1 + 1)}').input.expression,
      getMockEEActionContext()));

    it('is able to evaluate operator', async() => {
      expect(await evaluator.evaluate(new E.IntegerLiteral(1), BF.bindings())).toEqual(new E.IntegerLiteral(1));
    });

    it('is not able to evaluate existence by default', async() => {
      await expect(evaluator.evaluate(new E.Existence({
        type: types.EXPRESSION,
        expressionType: expressionTypes.EXISTENCE,
        not: false,
        input: {
          type: types.VALUES,
          variables: [],
          bindings: [],
        },
      }), BF.bindings())).rejects.toThrow(Err.NoExistenceHook);
    });

    it('is able to evaluate existence if configured', async() => {
      const customEvaluator = new AsyncRecursiveEvaluator({
        now: new Date(),
        functionArgumentsCache: {},
        superTypeProvider: {
          cache: new LRUCache({ max: 1_000 }),
          discoverer: _ => 'term',
        },
        exists: async _ => true,
        defaultTimeZone,
        actionContext: getMockEEActionContext(),
      }, getMockEEFactory().createEvaluator(translate('SELECT * WHERE { ?s ?p ?o FILTER (1 + 1)}').input.expression,
        getMockEEActionContext()));

      expect(await customEvaluator.evaluate(new E.Existence({
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
      const customEvaluator = new AsyncRecursiveEvaluator({
        now: new Date(),
        functionArgumentsCache: {},
        superTypeProvider: {
          cache: new LRUCache({ max: 1_000 }),
          discoverer: _ => 'term',
        },
        aggregate: async _ => DF.literal('42'),
        defaultTimeZone,
        actionContext: getMockEEActionContext(),
      }, getMockEEFactory().createEvaluator(translate('SELECT * WHERE { ?s ?p ?o FILTER (1 + 1)}').input.expression,
        getMockEEActionContext()));

      expect(await customEvaluator.evaluate(new E.Aggregate('count', {
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
