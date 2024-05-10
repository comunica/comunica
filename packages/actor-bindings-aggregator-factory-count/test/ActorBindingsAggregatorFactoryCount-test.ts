import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import { Bus } from '@comunica/core';
import { getMockEEActionContext, getMockMediatorExpressionEvaluatorFactory, makeAggregate } from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';
import { Wildcard } from 'sparqljs';
import { ActorBindingsAggregatorFactoryCount } from '../lib';

describe('ActorExpressionEvaluatorAggregateCount', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  const exception = 'This actor only supports the \'count\' aggregator without wildcard.';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    const mediatorQueryOperation: any = {
      async mediate(arg: any) {
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
        })).resolves.toEqual({});
      });

      it('accepts count 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('count', true),
        })).resolves.toEqual({});
      });

      it('rejects wildcard', async() => {
        await expect(actor.test({
          context,
          expr: {
            type: Algebra.types.EXPRESSION,
            expressionType: Algebra.expressionTypes.AGGREGATE,
            aggregator: 'count',
            distinct: false,
            separator: '',
            expression: {
              type: Algebra.types.EXPRESSION,
              expressionType: Algebra.expressionTypes.WILDCARD,
              wildcard: new Wildcard(),
            },
          },
        })).rejects.toThrow(exception);
      });

      it('rejects sum', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('sum', false),
        })).rejects.toThrow(exception);
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
