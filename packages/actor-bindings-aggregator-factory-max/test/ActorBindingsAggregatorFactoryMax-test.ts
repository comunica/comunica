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
import { ActorBindingsAggregatorFactoryMax } from '../lib';
import '@comunica/utils-jest';

describe('ActorBindingsAggregatorFactoryMax', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  let context: IActionContext;
  const exception = 'This actor only supports the \'max\' aggregator.';

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

    context = getMockEEActionContext();
  });

  describe('An ActorBindingsAggregatorFactoryMax instance', () => {
    let actor: ActorBindingsAggregatorFactoryMax;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryMax({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
        mediatorTermComparatorFactory,
      });
    });

    describe('test', () => {
      it('accepts max 1', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('max', false),
        })).resolves.toPassTestVoid();
      });

      it('accepts max 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('max', true),
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
        expr: makeAggregate('max', false),
      })).resolves.toMatchObject({});
    });
  });
});
