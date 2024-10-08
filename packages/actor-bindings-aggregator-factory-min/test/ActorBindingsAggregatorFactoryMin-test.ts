import { createTermCompMediator } from '@comunica/actor-term-comparator-factory-expression-evaluator/test/util';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import { ArrayIterator } from 'asynciterator';
import { ActorBindingsAggregatorFactoryMin } from '../lib';
import '@comunica/utils-jest';

describe('ActorBindingsAggregatorFactoryMin', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  const exception = 'This actor only supports the \'min\' aggregator.';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    const mediatorQueryOperation: any = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('x') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };

    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
    });
    mediatorTermComparatorFactory = createTermCompMediator();
  });

  describe('An ActorBindingsAggregatorFactoryMin instance', () => {
    let actor: ActorBindingsAggregatorFactoryMin;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryMin({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
        mediatorTermComparatorFactory,
      });

      context = getMockEEActionContext();
    });

    describe('test', () => {
      it('accepts min 1', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('min', false),
        })).resolves.toPassTestVoid();
      });

      it('accepts min 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('min', true),
        })).resolves.toPassTestVoid();
      });

      it('rejects sum', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('sum', false),
        })).resolves.toFailTest(exception);
      });
    });

    it('should run', async() => {
      await expect(actor.run({
        context,
        expr: makeAggregate('min', false),
      })).resolves.toMatchObject({});
    });
  });
});
