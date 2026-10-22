import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorInitExpressions } from '../lib/ActorInitExpressions';
import { ExpressionEngineBase } from '../lib/ExpressionEngineBase';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('ExpressionEngineBase', () => {
  let mediatorExpressionEvaluatorFactory: any;
  let mediatorTermComparatorFactory: any;
  let mediatorBindingsAggregatorFactory: any;
  let engine: ExpressionEngineBase;

  beforeEach(() => {
    mediatorExpressionEvaluatorFactory = { mediate: jest.fn().mockResolvedValue('evaluator') };
    mediatorTermComparatorFactory = { mediate: jest.fn().mockResolvedValue('comparator') };
    mediatorBindingsAggregatorFactory = { mediate: jest.fn().mockResolvedValue('aggregator') };
    engine = new ExpressionEngineBase(new ActorInitExpressions({
      bus: new Bus({ name: 'bus' }),
      name: 'actor',
      mediatorExpressionEvaluatorFactory,
      mediatorTermComparatorFactory,
      mediatorBindingsAggregatorFactory,
    }));
  });

  function contextOf(mediator: any): IActionContext {
    return mediator.mediate.mock.calls[0][0].context;
  }

  describe('createEvaluator', () => {
    const expression = AF.createTermExpression(DF.variable('x'));

    it('mediates over the expression evaluator factory.', async() => {
      await expect(engine.createEvaluator(expression)).resolves.toBe('evaluator');
      expect(mediatorExpressionEvaluatorFactory.mediate.mock.calls[0][0].algExpr).toBe(expression);
    });

    it('defaults the entries that evaluation requires.', async() => {
      await engine.createEvaluator(expression);
      const context = contextOf(mediatorExpressionEvaluatorFactory);
      expect(context.get(KeysInitQuery.dataFactory)).toBeInstanceOf(DataFactory);
      expect(context.get(KeysInitQuery.queryTimestamp)).toBeInstanceOf(Date);
      expect(context.get(KeysInitQuery.functionArgumentsCache)).toEqual({});
    });

    it('leaves configuration specific defaults, such as an existence resolver, to the engine.', async() => {
      await engine.createEvaluator(expression);
      expect(contextOf(mediatorExpressionEvaluatorFactory).has(KeysExpressionEvaluator.existenceResolver)).toBe(false);
    });

    it('keeps the entries of the provided context.', async() => {
      const queryTimestamp = new Date(0);
      await engine.createEvaluator(expression, new ActionContext({
        [KeysInitQuery.queryTimestamp.name]: queryTimestamp,
      }));
      expect(contextOf(mediatorExpressionEvaluatorFactory).get(KeysInitQuery.queryTimestamp)).toBe(queryTimestamp);
    });

    it('shares one functionArgumentsCache with everything else the engine creates.', async() => {
      await engine.createEvaluator(expression);
      await engine.createTermComparator();
      expect(contextOf(mediatorTermComparatorFactory).get(KeysInitQuery.functionArgumentsCache))
        .toBe(contextOf(mediatorExpressionEvaluatorFactory).get(KeysInitQuery.functionArgumentsCache));
    });
  });

  describe('createTermComparator', () => {
    it('mediates over the term comparator factory, with defaults.', async() => {
      await expect(engine.createTermComparator()).resolves.toBe('comparator');
      expect(contextOf(mediatorTermComparatorFactory).get(KeysInitQuery.queryTimestamp)).toBeInstanceOf(Date);
    });
  });

  describe('createAggregator', () => {
    it('mediates over the bindings aggregator factory, with defaults.', async() => {
      const expression = AF.createAggregateExpression('sum', AF.createTermExpression(DF.variable('x')), false);
      await expect(engine.createAggregator(expression)).resolves.toBe('aggregator');
      expect(mediatorBindingsAggregatorFactory.mediate.mock.calls[0][0].expr).toBe(expression);
      expect(contextOf(mediatorBindingsAggregatorFactory).get(KeysInitQuery.queryTimestamp)).toBeInstanceOf(Date);
    });
  });
});
