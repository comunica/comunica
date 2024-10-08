import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
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
import { ActorBindingsAggregatorFactorySample } from '../lib';
import '@comunica/utils-jest';

describe('ActorBindingsAggregatorFactorySample', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let context: IActionContext;
  const exception = 'This actor only supports the \'sample\' aggregator.';

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

    context = getMockEEActionContext();
  });

  describe('An ActorBindingsAggregatorFactoryMax instance', () => {
    let actor: ActorBindingsAggregatorFactorySample;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactorySample({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
      });
    });

    describe('test', () => {
      it('accepts sample 1', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('sample', false),
        })).resolves.toPassTestVoid();
      });

      it('accepts sample 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('sample', true),
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
        expr: makeAggregate('sample', false),
      })).resolves.toMatchObject({});
    });
  });
});
