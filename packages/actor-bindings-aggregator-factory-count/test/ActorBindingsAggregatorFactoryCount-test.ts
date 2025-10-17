import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import { Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import {
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import { ActorBindingsAggregatorFactoryCount } from '../lib';
import '@comunica/utils-jest';

describe('ActorExpressionEvaluatorAggregateCount', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  const exception = 'This actor only supports the \'count\' aggregator without wildcard.';
  const AF = new AlgebraFactory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    const mediatorQueryOperation: any = {
      async mediate(_: any) {
        return {};
      },
    };

    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
    });
  });

  describe('An ActorBindingsAggregatorFactoryCount instance', () => {
    let actor: ActorBindingsAggregatorFactoryCount;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryCount({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
      });

      context = getMockEEActionContext();
    });

    describe('test', () => {
      it('accepts count 1', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('count', false),
        })).resolves.toPassTestVoid();
      });

      it('accepts count 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('count', true),
        })).resolves.toPassTestVoid();
      });

      it('rejects wildcard', async() => {
        const expr = AF.createAggregateExpression('count', AF.createWildcardExpression(), false, '');
        await expect(actor.test({
          context,
          expr,
        })).resolves.toFailTest(exception);
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
        expr: makeAggregate('count', false),
      })).resolves.toMatchObject({});
    });
  });
});
