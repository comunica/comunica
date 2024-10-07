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
import { ActorBindingsAggregatorFactoryGroupConcat } from '../lib';
import '@comunica/utils-jest';

describe('ActorBindingsAggregatorFactoryGroupConcat', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  const exception = 'This actor only supports the \'group_concat\' aggregator.';

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
  });

  describe('An ActorBindingsAggregatorFactoryCount instance', () => {
    let actor: ActorBindingsAggregatorFactoryGroupConcat;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryGroupConcat({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
      });

      context = getMockEEActionContext();
    });

    describe('test', () => {
      it('accepts group_concat 1', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('group_concat', false),
        })).resolves.toPassTestVoid();
      });

      it('accepts group_concat 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('group_concat', true),
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
        expr: makeAggregate('group_concat', false),
      })).resolves.toMatchObject({});
    });
  });
});
