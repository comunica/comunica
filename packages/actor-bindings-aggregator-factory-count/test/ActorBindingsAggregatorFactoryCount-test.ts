import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { ActionContext, Bus } from '@comunica/core';
import { getMockEEFactory, makeAggregate } from '@comunica/jest';
import { Algebra } from 'sparqlalgebrajs';
import { Wildcard } from 'sparqljs';
import { ActorBindingsAggregatorFactoryCount } from '../lib';

describe('ActorExpressionEvaluatorAggregateCount', () => {
  let bus: any;
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    const mediatorQueryOperation: any = {
      async mediate(arg: any) { return {}; },
    };

    expressionEvaluatorFactory = getMockEEFactory({
      mediatorQueryOperation,
      mediatorBindingsAggregatorFactory: mediatorQueryOperation,
    });
  });

  describe('An ActorBindingsAggregatorFactoryCount instance', () => {
    let actor: ActorBindingsAggregatorFactoryCount;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryCount({
        name: 'actor',
        bus,
        factory: expressionEvaluatorFactory,
      });
    });

    describe('test', () => {
      it('accepts count 1', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('count', false),
        })).resolves.toEqual({});
      });

      it('accepts count 2', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('count', true),
        })).resolves.toEqual({});
      });

      it('rejects wildcard', () => {
        return expect(actor.test({
          context: new ActionContext(),
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
        })).rejects.toThrow();
      });

      it('rejects sum', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('sum', false),
        })).rejects.toThrow();
      });
    });

    it('should run', () => {
      return expect(actor.run({
        context: new ActionContext(),
        expr: makeAggregate('count', false),
      })).resolves.toMatchObject({
        aggregator: expect.anything(),
      });
    });
  });
});
